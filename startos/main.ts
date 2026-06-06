import { FileHelper } from '@start9labs/start-sdk'
import { manifest as bitcoinManifest } from 'bitcoin-core-startos/startos/manifest'
import { readFile } from 'node:fs/promises'
import { request } from 'node:https'
import { base64 } from 'rfc4648'
import { lndConfFile } from './fileModels/lnd.conf'
import { startupFlagsJson } from './fileModels/startupFlags.json'
import { storeJson } from './fileModels/store.json'
import { customConfigJson } from './fileModels/custom-config.json'
import { i18n } from './i18n'
import { restPort } from './interfaces'
import { sdk } from './sdk'
import {
  bitcoindBundle,
  bitcoindMnt,
  GetInfo,
  lndDataDir,
  mainMounts,
  neutrinoBundle,
  sleep,
} from './utils'

const certPath = '/media/startos/volumes/main/tls.cert'
/** Hit LND's /v1/state REST endpoint using the self-signed TLS cert. */
async function getLndState(): Promise<string | null> {
  const ca = await readFile(certPath).catch(() => null)
  return new Promise((resolve) => {
    const req = request(
      `https://lnd.startos:${restPort}/v1/state`,
      { ca: ca ?? undefined, rejectUnauthorized: !!ca, timeout: 5000 },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          try {
            resolve((JSON.parse(data) as { state: string }).state)
          } catch {
            resolve(null)
          }
        })
      },
    )
    req.on('error', () => resolve(null))
    req.on('timeout', () => {
      req.destroy()
      resolve(null)
    })
    req.end()
  })
}

export const main = sdk.setupMain(async ({ effects }) => {
  /**
   * ======================== Setup (optional) ========================
   */
  console.info(i18n('Starting LND!'))

  const store = await storeJson.read().const(effects)
  if (!store) {
    throw new Error('No store.json')
  }

  // One-time startup flags live outside store.json — read with `.once`, not the
  // `.const` watch above — so flipping them back after startup doesn't restart
  // main. The action that sets resetWalletTransactions restarts LND itself via
  // sdk.restart; here we only consume and then clear.
  const startupFlags = await startupFlagsJson.read().once()
  if (!startupFlags) {
    throw new Error('No startup-flags.json')
  }
  const { resetWalletTransactions, restore } = startupFlags
  let notified = startupFlags.notified

  const conf = await lndConfFile.read().const(effects)
  if (!conf) {
    throw new Error('No lnd.conf')
  }

  const useBitcoind = conf['bitcoin.node'] === 'bitcoind'

  // Enforce backend bundle — ensures rpccookie, zmq, fee.url stay in sync
  await lndConfFile.merge(
    effects,
    useBitcoind ? bitcoindBundle : neutrinoBundle,
    { allowWriteAfterConst: true },
  )

  const {
    walletPassword,
    watchtowerClients,
    autoUnlockEnabled,
    seedBackupConfirmed,
    passwordBackupConfirmed,
    pendingPasswordChange,
    passwordChangeError,
  } = store

  let mounts = mainMounts

  if (useBitcoind) {
    mounts = mounts.mountDependency<typeof bitcoinManifest>({
      dependencyId: 'bitcoind',
      volumeId: 'main',
      mountpoint: bitcoindMnt,
      subpath: null,
      readonly: true,
    })
  }

  const lndSub = await sdk.SubContainer.of(
    effects,
    { imageId: 'lnd' },
    mounts,
    'lnd-sub',
  )

  // Restart if Bitcoin .cookie changes
  if (useBitcoind) {
    await FileHelper.string(
      `${lndSub.rootfs}${bitcoindBundle['bitcoind.rpccookie']}`,
    )
      .read()
      .const(effects)
  }

  const lndArgs: string[] = []

  if (resetWalletTransactions) {
    lndArgs.push('--reset-wallet-transactions')
  }

    
  // Create Manual Unlock Task if needed
  if (!autoUnlockEnabled && store.walletInitialized) {
    console.log('Auto-unlock disabled and wallet initialized. Creating manual unlock task...')
    try {
      const { manualWalletUnlock } = await import('./actions/walletPassword')
      await sdk.action.createOwnTask(effects, manualWalletUnlock, 'optional', {
        reason: 'LND wallet is locked and auto-unlock is disabled. Use the "Unlock Wallet" action to provide your password.',
      })
      console.log('Manual unlock task created.')
    } catch (err) {
      console.warn('Failed to create manual unlock task:', (err as Error).message)
    }
  }

  /**
   * ======================== Daemons ========================
   */
  return sdk.Daemons.of(effects)
    .addDaemon('lnd', {
      exec: { command: ['lnd', ...lndArgs] },
      subcontainer: lndSub,
      ready: {
        display: i18n('LND Server'),
        fn: async () => {
          const lndState = await getLndState()
          // WAITING_TO_START (255) is earliest in the state machine — the
          // wallet unlocker sub-server isn't up yet, so don't let the
          // unlock-wallet oneshot fire. LOCKED onward means the unlocker
          // endpoint is serving.
          if (!lndState || lndState === 'WAITING_TO_START') {
            return { result: 'starting', message: null }
          }
          return { result: 'success', message: i18n('LND is ready') }
        },
      },
      requires: [],
    })
          .addOneshot('unlock-wallet', {
      exec: {
        fn: async (subcontainer, abort) => {
          if (pendingPasswordChange) {
            console.log('Pending password change detected. Performing change...')
            const newPassword = Buffer.from(pendingPasswordChange, 'base64').toString('utf8')
            const currentPassword = walletPassword || ''
            
            let attempts = 0
            while (attempts < 60) {
              if (abort.aborted) return null
              const state = await getLndState()
              if (state === 'LOCKED') break
              await sleep(1000)
              attempts++
            }
            
            const currentBase64 = base64.stringify(Buffer.from(currentPassword, 'latin1'))
            const newBase64 = base64.stringify(Buffer.from(newPassword, 'latin1'))
            
            const res = await subcontainer.exec([
              'curl', '--no-progress-meter', '-f', '-X', 'POST',
              '--cacert', `${lndDataDir}/tls.cert`,
              `https://lnd.startos:${restPort}/v1/changepassword`,
              '-d', JSON.stringify({ current_password: currentBase64, new_password: newBase64 }),
            ])
            
            if (res.exitCode !== 0) {
              const err = res.stderr?.toString() || res.stdout?.toString() || 'Unknown error'
              await storeJson.merge(effects, {
                pendingPasswordChange: null,
                passwordChangeError: err.substring(0, 300),
              }, { allowWriteAfterConst: true })
              throw new Error(`Password change failed: ${err.substring(0, 300)}`)
            }
            
            await storeJson.merge(effects, {
              walletPassword: newPassword,
              pendingPasswordChange: null,
              passwordChangeError: null,
              autoUnlockEnabled: true,
              passwordBackupConfirmed: false,
            }, { allowWriteAfterConst: true })
            console.log('Password changed successfully and wallet unlocked.')
            return null
          }

          let hasLoggedManualWait = false

          while (true) {
            if (abort.aborted) {
              console.log('wallet-unlock aborted')
              break
            }

            // Skip the unlock call (and its noisy LND error log) only when
            // the wallet is strictly past LOCKED. Per stateservice.proto:
            //   NON_EXISTING=0, LOCKED=1, UNLOCKED=2, RPC_ACTIVE=3,
            //   SERVER_ACTIVE=4, WAITING_TO_START=255.
            // WAITING_TO_START means "not started yet" — keep polling.
            const state = await getLndState()
            if (
              state === 'UNLOCKED' ||
              state === 'RPC_ACTIVE' ||
              state === 'SERVER_ACTIVE'
            ) {
              console.log(`wallet-unlock skipped, state=${state}`)
              break
            }
            if (state !== 'LOCKED') {
              // NON_EXISTING, WAITING_TO_START, or endpoint unreachable —
              // wallet unlocker isn't ready for a POST yet.
              await sleep(2_000)
              continue
            }

            if (!autoUnlockEnabled) {
              if (!hasLoggedManualWait) {
                console.log('Auto-unlock disabled. Waiting for manual unlock via UI...')
                hasLoggedManualWait = true
              }
              await sleep(5_000)
              continue
            }

            if (!walletPassword)
              throw new Error('Wallet Password is undefined!')

            const res = await subcontainer.exec([
              'curl',
              '--no-progress-meter',
              '-X',
              'POST',
              '--cacert',
              `${lndDataDir}/tls.cert`,
              `https://lnd.startos:${restPort}/v1/unlockwallet`,
              '-d',
              restore
                ? JSON.stringify({
                    wallet_password: base64.stringify(
                      Buffer.from(walletPassword, 'latin1'),
                    ),
                    recovery_window: 2_500,
                  })
                : JSON.stringify({
                    wallet_password: base64.stringify(
                      Buffer.from(walletPassword, 'latin1'),
                    ),
                  }),
            ])
            console.log('wallet-unlock response', res)
            const stdout = res.stdout.toString().trim()
            // `{}` = unlock succeeded. "wallet already unlocked" = wallet is
            // already past the LOCKED state (e.g. because /v1/state raced
            // with the oneshot). Both mean we're done.
            if (stdout === '{}' || stdout.includes('wallet already unlocked')) {
              break
            }
            await sleep(10_000)
          }
          return null
        },
      },
      subcontainer: lndSub,
      requires: ['lnd'],
    })
    .addOneshot('clear-reset-flag', () =>
      // `--reset-wallet-transactions` is consumed once, when LND opens the
      // wallet at unlock. Now that unlock-wallet has completed the reset has
      // been applied, so clear the flag — otherwise it stays true and re-adds
      // the flag on every subsequent restart. The flag lives outside store.json
      // (read with `.once`), so this write does NOT trip a const watch and
      // restart main.
      resetWalletTransactions
        ? {
            subcontainer: null,
            exec: {
              fn: async () => {
                await startupFlagsJson.merge(effects, {
                  resetWalletTransactions: false,
                })
                return null
              },
            },
            requires: ['unlock-wallet'],
          }
        : null,
    )
    .addHealthCheck('sync-progress', {
      ready: {
        display: i18n('Network and Graph Sync Progress'),
        fn: async () => {
          // Upstream requires `unlock-wallet` to stop sync-progress health
          // check spamming failures during startup.
          // Dependency blocks this function from running when manual unlock
          // is enabled. To support the custom manual unlock message without
          // flooding logs, we check the state via the REST API first. The
          // `/v1/state` endpoint is designed to be polled while locked and
          // does not trigger the RPC error.
          const state = await getLndState()
          if (state === 'LOCKED') {
            if (!autoUnlockEnabled) {
              return {
                message: 'Waiting for wallet unlock...',
                result: 'loading',
              }
            }
            return { message: i18n('LND is starting…'), result: 'starting' }
          }
            if (!state || state === 'WAITING_TO_START' || state === 'UNLOCKED') {
            return { message: i18n('LND is starting…'), result: 'starting' }
          }          

          let res
          try {
            res = await lndSub.exec(
              ['lncli', '--rpcserver=lnd.startos', 'getinfo'],
              {},
              30_000,
            )
          } catch {
            // The LND subcontainer can be momentarily absent while main is
            // re-running (e.g. Bitcoin Core's .cookie rotates on its restart,
            // which tears down lnd-sub to rebuild it). With no PID 1 in the
            // subcontainer, exec can't join its namespaces and throws a
            // filesystem I/O error (".../proc/1/ns/pid: No such file or
            // directory") instead of returning a result. Treat that as "still
            // coming up" — the lnd daemon's own `ready` check reflects a
            // genuine crash separately.
            return { message: i18n('LND is starting…'), result: 'starting' }
          }
          if (
            res.exitCode === 0 &&
            res.stdout !== '' &&
            typeof res.stdout === 'string'
          ) {
            const info: GetInfo = JSON.parse(res.stdout)

            if (info.synced_to_chain && info.synced_to_graph) {
              return {
                message: i18n('Synced to chain and graph'),
                result: 'success',
              }
            } else if (!info.synced_to_chain && info.synced_to_graph) {
              return {
                message: i18n('Syncing to chain'),
                result: 'loading',
              }
            } else if (!info.synced_to_graph && info.synced_to_chain) {
              return {
                message: i18n('Syncing to graph'),
                result: 'loading',
              }
            }

            return {
              message: i18n('Syncing to graph and chain'),
              result: 'loading',
            }
          }

          // `lncli getinfo` only succeeds once LND's RPC server is fully
          // active, so any non-zero (or null) exit here means LND is still
          // coming up — e.g. the wallet isn't unlocked yet, or the RPC server
          // reports "waiting to start" / "the RPC server is in the process of
          // starting up". That exact wording varies by LND version, so rather
          // than match a fixed string (the old check pinned "waiting to start"
          // and missed 0.20's phrasing, surfacing hundreds of spurious
          // failures per boot) we treat every non-success as a transient
          // startup state. A genuine crash/outage is owned by the lnd daemon's
          // `ready` check and the LND Server (/v1/state) health check.
          return {
            message: i18n('LND is starting…'),
            result: 'starting',
          }
        },
      },
      requires: ['lnd'],
    })
    .addOneshot('synced-true', {
      subcontainer: null,
      exec: {
        fn: async () => {
          // The SDK re-fires this oneshot every time sync-progress dips out
          // of success and recovers (graph re-sync, transient lncli errors).
          // The closure flag is the source of truth within a main lifecycle;
          // the on-disk flag re-seeds it on next startup.
          if (!notified) {
            await sdk.notification.create(effects, {
              level: 'success',
              title: i18n('Sync Complete'),
              message: i18n('LND is synced to chain and graph.'),
            })
            await startupFlagsJson.merge(effects, { notified: true })
            notified = true
          }
          return null
        },
      },
      requires: ['sync-progress'],
    })
    .addOneshot('restore', () =>
      restore
        ? {
            subcontainer: lndSub,
            exec: {
              fn: async () => {
                await sdk.setHealth(effects, {
                  id: 'restored',
                  name: i18n('Backup Restoration Detected'),
                  message: i18n(
                    'Lightning Labs strongly recommends against continuing to use a LND node after running restorechanbackup. Please recover and sweep any remaining funds to another wallet. Afterwards LND should be uninstalled. LND can then be re-installed fresh if you would like to continue using LND.',
                  ),
                  result: 'failure',
                })
                return {
                  command: [
                    'lncli',
                    '--rpcserver=lnd.startos',
                    'restorechanbackup',
                    '--multi_file',
                    `${lndDataDir}/data/chain/bitcoin/mainnet/channel.backup`,
                  ],
                }
              },
            },
            requires: ['lnd', 'unlock-wallet'],
          }
        : null,
    )
    .addOneshot('clear-restore-flag', () =>
      // Clear the restore flag once restorechanbackup has run, so it isn't
      // re-run on every restart. `requires: ['restore']` gates this on that
      // oneshot completing successfully — if restorechanbackup fails the flag
      // stays set and the restore is retried on the next startup. The flag
      // lives outside store.json (read with `.once`), so clearing it doesn't
      // trip a const watch and restart main.
      restore
        ? {
            subcontainer: null,
            exec: {
              fn: async () => {
                await startupFlagsJson.merge(effects, { restore: false })
                return null
              },
            },
            requires: ['restore'],
          }
        : null,
    )
    .addHealthCheck('reachability', () =>
      !conf.externalip?.length && !conf.externalhosts?.length
        ? {
            ready: {
              display: i18n('Node Reachability'),
              fn: () => ({
                result: 'disabled',
                message: i18n(
                  'Your node can peer with other nodes, but other nodes cannot peer with you. Optionally add a Tor domain, public domain, or public IP address to change this behavior.',
                ),
              }),
            },
            requires: ['lnd'],
          }
        : null,
    )
    .addOneshot('add-watchtowers', () =>
      watchtowerClients.length > 0
        ? ({
            subcontainer: lndSub,
            exec: {
              fn: async (subcontainer: typeof lndSub, abort) => {
                // Setup watchtowers at runtime because for some reason they can't be setup in lnd.conf
                for (const tower of watchtowerClients || []) {
                  if (abort.aborted) break
                  console.log(`Watchtower client adding ${tower}`)
                  let res = await subcontainer.exec(
                    [
                      'lncli',
                      '--rpcserver=lnd.startos',
                      'wtclient',
                      'add',
                      tower,
                    ],
                    undefined,
                    undefined,
                    {
                      abort: abort.reason,
                      signal: abort,
                    },
                  )

                  if (
                    res.exitCode === 0 &&
                    res.stdout !== '' &&
                    typeof res.stdout === 'string'
                  ) {
                    console.log(`Result adding tower ${tower}: ${res.stdout}`)
                  } else {
                    console.log(`Error adding tower ${tower}: ${res.stderr}`)
                  }
                }
                return null
              },
            },
            requires: ['lnd', 'unlock-wallet', 'sync-progress'],
          } as const)
        : null,
    )
    .addDaemon('channel-backup-watcher', {
      exec: {
        command: [
          'sh', '-c',
          [
            'SHOULD_EXIT=0',
            'cleanup() { SHOULD_EXIT=1; pkill -P $$ -f inotifywait 2>/dev/null; exit 0; }',
            'trap cleanup TERM INT',
            `backup_file="${lndDataDir}/data/chain/bitcoin/mainnet/channel.backup"`,
            `config_file="${lndDataDir}/custom-config.json"`,
            '',
            '# Wait for config file to exist',
            'while [ ! -f "$config_file" ]; do',
            ' if [ "$SHOULD_EXIT" = "1" ]; then exit 0; fi',
            ' sleep 2',
            'done',
            '',
            'start_time=$(date +%s)',
            'while :; do',
            ' if [ "$SHOULD_EXIT" = "1" ]; then exit 0; fi',
            ' enabled=$(jq -r \'.channelAutoBackupEnabled // false\' "$config_file" 2>/dev/null || echo "false")',
            ' if [ "$enabled" != "true" ]; then',
            ' # Auto-backup disabled: wait for config change with short timeout',
            ' inotifywait -q -t 2 -e modify "$config_file" 2>/dev/null',
            ' continue',
            ' fi',
            ' if [ ! -s "$backup_file" ]; then',
            ' lncli --rpcserver=lnd.startos exportchanbackup --all --output_file "$backup_file" 2>/dev/null || sleep 5',
            ' continue',
            ' fi',
            ' # Wait for channel.backup change with short timeout',
            ' if ! inotifywait -q -t 2 -e modify,move,create,delete_self,move_self "$backup_file" 2>/dev/null; then',
            ' continue # timeout → loop and check SHOULD_EXIT',
            ' fi',
            '',
            ' current_time=$(date +%s)',
            ' elapsed=$((current_time - start_time))',
            ' grace_enabled=$(jq -r \'.backupStartupGracePeriod // false\' "$config_file" 2>/dev/null)',
            ' if [ "$grace_enabled" = "true" ] && [ "$elapsed" -lt 15 ]; then',
            ' echo "[$(date -Iseconds)] Startup backup suppression is enabled by user. Skipping initial channel.backup upload." >&2',
            ' continue',
            ' fi',
            '',
            ' echo "[$(date -Iseconds)] 🔄 Channel backup file changed. Triggering backup..." >&2',
            '',
            ' # Load config',
            ' rclone_b64=$(jq -r \'.rcloneConfig // empty\' "$config_file" 2>/dev/null)',
            ' [ -n "$rclone_b64" ] && echo "$rclone_b64" | base64 -d > /tmp/rclone.conf 2>/dev/null',
            ' remotes=$(jq -r \'.selectedRcloneRemotes // empty | .[]\' "$config_file" 2>/dev/null)',
            '',
            ' # Define normal and onion-specific timings',
            ' normal_overall_timeout=12',
            ' normal_contimeout=5s',
            ' normal_timeout=10s',
            ' onion_overall_timeout=60',
            ' onion_contimeout=30s',
            ' onion_timeout=50s',
            '',
            ' # Rclone',
            ' for remote in $remotes; do',
            ' echo "[$(date -Iseconds)] [RCLONE] Starting backup to $remote..." >&2',
            ' remote_name=$(echo "$remote" | cut -d: -f1)',
            '',
            ' # Check if this remote is SFTP and uses .onion',
            ' if [ "$remote_name" = "sftp" ]; then',
            '   sftp_host=$(jq -r --arg rname "$remote_name" \'.rcloneConfig // empty\' "$config_file" | base64 -d 2>/dev/null | grep -A 10 "\\[$remote_name\\]" | grep -i "host.*\\.onion" || echo "")',
            '   if [ -n "$sftp_host" ]; then',
            '     echo "[$(date -Iseconds)] [RCLONE] Detected SFTP .onion address, using Tor proxy (timeout=60s)..." >&2',
            '     overall_timeout=$onion_overall_timeout',
            '     contimeout=$onion_contimeout',
            '     timeout_opt=$onion_timeout',
            '     if RCLONE_CONFIG=/tmp/rclone.conf timeout ${overall_timeout}s rclone copy "$backup_file" "$remote" \\',
            '       --log-level=INFO \\',
            '       --contimeout=${contimeout} \\',
            '       --timeout=${timeout_opt} \\',
            '       --retries=1; then',
            '       echo "[$(date -Iseconds)] [RCLONE: $remote] ✅ Success" >&2',
            '     else',
            '       echo "[$(date -Iseconds)] [RCLONE: $remote] ❌ Failed" >&2',
            '     fi',
            '     continue',
            '   fi',
            ' fi',
            '',
            ' # Check if this remote is Nextcloud and uses .onion',
            ' if [ "$remote_name" = "nextcloud" ]; then',
            '   uses_onion=$(jq -r --arg rname "$remote_name" \'.rcloneConfig // empty\' "$config_file" | base64 -d 2>/dev/null | grep -A 10 "\\[$remote_name\\]" | grep -i "url.*\\.onion" || echo "")',
            '   if [ -n "$uses_onion" ]; then',
            '     echo "[$(date -Iseconds)] [RCLONE] Detected Nextcloud .onion address, using Tor proxy (timeout=60s)..." >&2',
            '     overall_timeout=$onion_overall_timeout',
            '     contimeout=$onion_contimeout',
            '     timeout_opt=$onion_timeout',
            '     if HTTP_PROXY=socks5://10.0.3.1:9050 HTTPS_PROXY=socks5://10.0.3.1:9050 ALL_PROXY=socks5://10.0.3.1:9050 RCLONE_CONFIG=/tmp/rclone.conf timeout ${overall_timeout}s rclone copy "$backup_file" "$remote" \\',
            '       --log-level=INFO \\',
            '       --contimeout=${contimeout} \\',
            '       --timeout=${timeout_opt} \\',
            '       --retries=1 \\',
            '       --no-check-certificate; then',
            '       echo "[$(date -Iseconds)] [RCLONE: $remote] ✅ Success" >&2',
            '     else',
            '       echo "[$(date -Iseconds)] [RCLONE: $remote] ❌ Failed" >&2',
            '     fi',
            '     continue',
            '   fi',
            ' fi',
            '',
            ' # Normal clearnet remote (Dropbox, GDrive, non-onion SFTP/Nextcloud, etc.)',
            ' overall_timeout=$normal_overall_timeout',
            ' contimeout=$normal_contimeout',
            ' timeout_opt=$normal_timeout',
            ' if RCLONE_CONFIG=/tmp/rclone.conf timeout ${overall_timeout}s rclone copy "$backup_file" "$remote" \\',
            '   --log-level=INFO \\',
            '   --contimeout=${contimeout} \\',
            '   --timeout=${timeout_opt} \\',
            '   --retries=1; then',
            '   echo "[$(date -Iseconds)] [RCLONE: $remote] ✅ Success" >&2',
            ' else',
            '   echo "[$(date -Iseconds)] [RCLONE: $remote] ❌ Failed" >&2',
            ' fi',
            ' done',
            '',
            ' # Email',
            ' email_enabled=$(jq -r \'.emailEnabled // false\' "$config_file" 2>/dev/null)',
            ' if [ "$email_enabled" = "true" ]; then',
            ' email_to=$(jq -r \'.emailBackup.to // empty\' "$config_file" 2>/dev/null)',
            ' if [ -z "$email_to" ] || [ "$email_to" = "empty" ]; then',
            ' echo "[$(date -Iseconds)] [EMAIL] ⚠️ Skipped: email_to not configured" >&2',
            ' else',
            ' email_from=$(jq -r \'.emailBackup.from // empty\' "$config_file" 2>/dev/null)',
            ' email_smtp_server=$(jq -r \'.emailBackup.smtp_server // "smtp.gmail.com"\' "$config_file" 2>/dev/null)',
            ' email_smtp_port=$(jq -r \'.emailBackup.smtp_port // 465\' "$config_file" 2>/dev/null)',
            ' email_smtp_user=$(jq -r \'.emailBackup.smtp_user // empty\' "$config_file" 2>/dev/null)',
            ' email_smtp_pass=$(jq -r \'.emailBackup.smtp_pass // empty\' "$config_file" 2>/dev/null)',
            ' if [ -z "$email_smtp_pass" ] || [ "$email_smtp_pass" = "empty" ]; then',
            ' echo "[$(date -Iseconds)] [EMAIL] ❌ Skipped: missing password" >&2',
            ' else',
            ' echo "[$(date -Iseconds)] [EMAIL] Starting backup to $email_to..." >&2',
            ' protocol="smtps"; starttls="no"',
            ' [ "$email_smtp_port" = "587" ] && { protocol="smtp"; starttls="yes"; }',
            ' cat > /tmp/muttrc <<EOF',
            'set from = "$email_from"',
            'set realname = "LND Backup"',
            'set smtp_url = "$protocol://$email_smtp_user@$email_smtp_server:$email_smtp_port/"',
            'set smtp_pass = "$email_smtp_pass"',
            'set ssl_starttls = $starttls',
            'set ssl_force_tls = yes',
            'EOF',
            ' attempt=1',
            ' max_attempts=5',
            ' while [ $attempt -le $max_attempts ]; do',
            ' if nslookup "$email_smtp_server" >/dev/null 2>&1; then',
            ' break',
            ' fi',
            ' echo "[$(date -Iseconds)] [EMAIL] DNS lookup failed for \'$email_smtp_server\' (attempt $attempt/$max_attempts). Retrying in 2s..." >&2',
            ' sleep 2',
            ' attempt=$((attempt + 1))',
            ' done',
            ' if [ $attempt -gt $max_attempts ]; then',
            ' echo "[$(date -Iseconds)] [EMAIL] ❌ Failed: Could not resolve host \'$email_smtp_server\' after $max_attempts retries" >&2',
            ' else',
            ' recipients=$(echo "$email_to" | tr -d \' \' | tr \',\' \' \')',
            ' body_template=$(jq -r \'.emailBackup.body // empty\' "$config_file" 2>/dev/null)',
            ' if [ -z "$body_template" ]; then',
            '   body_template="Your LND channel.backup file is attached.\\n\\nThis file is encrypted with your Aezeed seed and safe to store anywhere."',
            ' fi',
            ' if printf "%b" "$body_template" | mutt -F /tmp/muttrc -s "LND Channel Backup $(date -Iseconds)" -a "$backup_file" -- $recipients; then',
            ' echo "[$(date -Iseconds)] [EMAIL] ✅ Success" >&2',
            ' else',
            ' echo "[$(date -Iseconds)] [EMAIL] ❌ Failed" >&2',
            ' fi',
            ' fi',
            ' fi',
            ' fi',
            ' fi',
            'done',
          ].join('\n'),
        ],
      },
      subcontainer: lndSub,
      ready: {
        display: null,
        fn: async () => {
          const config = await customConfigJson.read().once()
          return config?.channelAutoBackupEnabled
            ? { result: 'success', message: '✅ Active' }
            : { result: 'disabled', message: '❌ Disabled' }
        },
      },
            requires: ['lnd', 'unlock-wallet'],
    })
            .addHealthCheck('wallet-status', {
      ready: {
        display: 'Wallet Status',
        fn: async () => {
          const store = await storeJson.read().once()
          const autoUnlockEnabled = store?.autoUnlockEnabled ?? false
          const walletInitialized = store?.walletInitialized ?? false
          if (!walletInitialized) {
            return {
              message: 'Wallet not initialized',
              result: 'loading',
            }
          }

          const state = await getLndState()
          if (state === 'LOCKED') {
            if (!autoUnlockEnabled) {
              return {
                message: 'Wallet is locked as auto-unlock is disabled. Go to ⇓ Tasks or "Actions ⇢ Security ⇢ Wallet - Manual Unlock" and enter correct password.',
                result: 'loading',
              }
            }
            return { message: i18n('LND is starting…'), result: 'starting' }
          }

          if (state === 'UNLOCKED' || state === 'RPC_ACTIVE' || state === 'SERVER_ACTIVE') {
            return {
              message: 'Wallet is unlocked',
              result: 'success',
            }
          }

          return {
            message: i18n('LND is starting…'),
            result: 'starting',
          }
        },
      },
      requires: ['lnd'],
    })
      .addHealthCheck('security-status', {
      ready: {
        display: 'Security Status',
        fn: async () => {
          const store = await storeJson.read().once()
          const config = await customConfigJson.read().once()
          
          const backupEnabled = config?.channelAutoBackupEnabled ?? false
          const backupIcon = backupEnabled ? '🟢' : '🔴'
          const backupText = backupEnabled ? 'ENABLED' : 'DISABLED'
          
          const autoUnlock = store?.autoUnlockEnabled ?? false
          const unlockIcon = autoUnlock ? '🟡' : '🟢'
          const unlockText = autoUnlock ? 'AUTO' : 'MANUAL'
          
          const seedOnServer = (store?.aezeedCipherSeed || []).length > 0
          const seedIcon = seedOnServer ? '🟡' : '🟢'
          const seedText = seedOnServer ? 'ON\u00A0SERVER' : 'DELETED'
          
          const wtClientEnabled = (store?.watchtowerClients || []).length > 0
          const wtIcon = wtClientEnabled ? '🟢' : '🔴'
          const wtText = wtClientEnabled ? 'ENABLED' : 'DISABLED'
          
          const allGood = backupEnabled && !autoUnlock && !seedOnServer && wtClientEnabled
          const result = allGood ? 'success' : 'disabled'
          
          const block1 = `【${backupIcon}\u00A0${backupText} Channels Backup】`
          const block2 = `【${unlockIcon}\u00A0${unlockText} Wallet Unlock】`
          const block3 = `【${seedIcon}\u00A0${seedText} Aezeed Seed】`
          const block4 = `【${wtIcon}\u00A0${wtText} Watchtower Client】`
          
          const message = `${block1}${block2}${block3}${block4}`
          
          return { message, result }
        },
      },
      requires: ['lnd'],
    })
})
