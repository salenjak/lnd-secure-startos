import { FileHelper } from '@start9labs/start-sdk'
import { manifest as bitcoinManifest } from 'bitcoin-core-startos/startos/manifest'
import { readFile } from 'node:fs/promises'
import { request } from 'node:https'
import { base64 } from 'rfc4648'
import { lndConfFile } from './fileModels/lnd.conf'
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
    resetWalletTransactions,
    restore,
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

  // Handle Pending Password Change
  if (pendingPasswordChange) {
    if (!walletPassword) {
      throw new Error('Cannot change password: no current password available')
    }
    console.log('Pending password change detected. Performing change...')
    const newPassword = Buffer.from(pendingPasswordChange, 'base64').toString('utf8')
    const currentPassword = walletPassword
    try {
      await sdk.SubContainer.withTemp(
        effects,
        { imageId: 'lnd' },
        mounts,
        'change-password-temp',
        async (lndSubTemp) => {
          const tempArgs = [
            '--rpclisten=0.0.0.0:10009',
            '--restlisten=0.0.0.0:8080',
            '--debuglevel=error',
          ]
          console.log('Starting LND for password change...')
          await lndSubTemp.spawn(['lnd', ...tempArgs])

          let attempts = 0
          const maxAttempts = 60
          let restReady = false
          while (attempts < maxAttempts && !restReady) {
            try {
              const healthCheck = await lndSubTemp.exec([
                'curl', '--no-progress-meter',
                '--cacert', `${lndDataDir}/tls.cert`,
                'https://lnd.startos:8080/v1/getinfo',
              ])
              if (healthCheck.exitCode === 0) {
                restReady = true
                console.log('✅ LND REST API is ready')
              }
            } catch {
              // Ignore errors during startup check
            }
            if (!restReady) {
              await new Promise((r) => setTimeout(r, 1000))
              attempts++
              console.log(`⏳ Waiting for LND to start... (${attempts}/${maxAttempts})`)
            }
          }
          if (!restReady) {
            throw new Error(`LND REST API not ready after ${maxAttempts} seconds. Check LND logs for errors.`)
          }

          const currentBase64 = Buffer.from(currentPassword, 'utf8').toString('base64')
          const newBase64 = Buffer.from(newPassword, 'utf8').toString('base64')

          const changeResult = await lndSubTemp.exec([
            'curl', '--no-progress-meter', '-X', 'POST', '--cacert', `${lndDataDir}/tls.cert`,
            'https://lnd.startos:8080/v1/changepassword',
            '-d', JSON.stringify({ current_password: currentBase64, new_password: newBase64 }),
          ])

          if (changeResult.exitCode !== 0) {
            const errorOutput = changeResult.stderr?.toString() || changeResult.stdout?.toString() || 'Unknown error'
            throw new Error(`Password change failed: ${errorOutput.substring(0, 300)}...`)
          }

          const response = changeResult.stdout?.toString().trim() || '{}'
          if (response !== '{}' && !response.includes('"success":true')) {
            try {
              const parsed = JSON.parse(response)
              if (parsed.error || parsed.message) throw new Error(`API error: ${parsed.message || parsed.error}`)
            } catch {
              throw new Error(`Unexpected response: ${response.substring(0, 200)}...`)
            }
          }
          console.log('Password changed successfully')
        },
      )

      await storeJson.merge(effects, {
        walletPassword: newPassword,
        pendingPasswordChange: null,
        passwordChangeError: null,
        autoUnlockEnabled: true,
        passwordBackupConfirmed: false,
      }, { allowWriteAfterConst: true })
      console.log('Auto-unlock enabled after password change')
    } catch (err) {
      console.error('Password change failed:', err)
      await storeJson.merge(effects, {
        pendingPasswordChange: null,
        passwordChangeError: (err as Error).message || String(err),
      }, { allowWriteAfterConst: true })
      throw err
    }
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
        fn: async (subcontainer: typeof lndSub, abort: any) => {
          const currentStore = await storeJson.read().const(effects)
          if (!currentStore) {
            console.log('No store found. Skipping unlock.')
            return null
          }
          const currentAutoUnlockEnabled = currentStore.autoUnlockEnabled
          const currentWalletPasswordPlaintext = currentStore.walletPassword
          if (!currentWalletPasswordPlaintext) {
            console.log('No wallet password found. Skipping unlock.')
            return null
          }
          const walletPasswordForApi = Buffer.from(currentWalletPasswordPlaintext, 'utf8').toString('base64')
          const currentWalletInitialized = currentStore.walletInitialized
          const recoveryWindow = currentStore.recoveryWindow
          const restoreFlag = currentStore.restore
          console.log(`Unlock oneshot started... Auto-unlock: ${currentAutoUnlockEnabled}`)
          if (!currentWalletInitialized) {
            console.log('Wallet not initialized. Skipping unlock.')
            return null
          }
          if (currentAutoUnlockEnabled && currentWalletPasswordPlaintext) {
            console.log('Auto-unlock enabled. Unlocking wallet...')
            let unlockAttempts = 0
            const maxUnlockAttempts = 5
            let unlockSuccess = false
            while (unlockAttempts < maxUnlockAttempts && !unlockSuccess) {
              try {
                const command = [
                  'curl', '--no-progress-meter', '-X', 'POST', '--cacert', `${lndDataDir}/tls.cert`,
                  'https://lnd.startos:8080/v1/unlockwallet',
                  '-d',
                  restoreFlag
                    ? JSON.stringify({ wallet_password: walletPasswordForApi, recovery_window: recoveryWindow })
                    : JSON.stringify({ wallet_password: walletPasswordForApi }),
                ]
                const result = await subcontainer.exec(command, undefined, undefined, { abort: abort.reason, signal: abort })
                if (result.exitCode === 0 && result.stdout?.toString().trim() === '{}') {
                  unlockSuccess = true
                } else {
                  throw new Error(`Unlock failed: ${result.stderr?.toString() || 'Unknown error'}`)
                }
              } catch (err) {
                console.error('Unlock attempt failed:', (err as Error).message)
                unlockAttempts++
                if (unlockAttempts < maxUnlockAttempts) {
                  const delayStart = Date.now()
                  const totalDelayMs = 5000
                  const pollIntervalMs = 500
                  while (Date.now() - delayStart < totalDelayMs) {
                    if (abort.aborted) throw new Error('Unlock aborted during retry delay')
                    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
                  }
                } else {
                  throw new Error(`Failed to unlock wallet after ${maxUnlockAttempts} attempts: ${(err as Error).message}`)
                }
              }
            }
            if (!unlockSuccess) throw new Error('Unlock failed after all attempts')
            return null
          } else {
            console.log('Auto-unlock disabled or no password. Skipping auto-unlock.')
            return null
          }
        },
      },
      subcontainer: lndSub,
      requires: ['lnd'],
    })
       .addHealthCheck('sync-progress', {
      ready: {
        display: i18n('Network and Graph Sync Progress'),
        fn: async () => {
          try {
            const res = await lndSub.exec(
              ['lncli', '--rpcserver=lnd.startos', 'getinfo'],
              {},
              30_000,
            )
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

            if (
              res.stderr.includes(
                'rpc error: code = Unknown desc = waiting to start',
              )
            ) {
              return {
                message: i18n('LND is starting…'),
                result: 'starting',
              }
            }

            if (
              res.stderr &&
              typeof res.stderr === 'string' &&
              (res.stderr.includes('wallet locked, unlock it to enable full RPC access') ||
                res.stderr.includes('wallet is encrypted'))
            ) {
              const store = await storeJson.read().const(effects)
              const autoUnlockEnabled = store?.autoUnlockEnabled ?? false
              if (!autoUnlockEnabled) {
                return {
                  message: 'Waiting for wallet unlock to start syncing to chain and graph',
                  result: 'loading',
                }
              }
            }

            if (res.exitCode === null) {
              return {
                message: i18n('Syncing to graph'),
                result: 'loading',
              }
            }
            return {
              message: `Error: ${res.stderr as string}`,
              result: 'failure',
            }
          } catch {
            return {
              message: 'LND container unavailable',
              result: 'starting',
            }
          }
        },
      },
      requires: ['lnd', 'unlock-wallet'],
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
            ' if ! inotifywait -q -t 2 -e modify,move,create "$backup_file" 2>/dev/null; then',
            ' continue # timeout → loop and check SHOULD_EXIT',
            ' fi',
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
            ' if echo "Backup attached." | mutt -F /tmp/muttrc -s "LND Channel Backup $(date -Iseconds)" -a "$backup_file" -- $recipients; then',
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
      requires: ['lnd'],
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
          const res = await lndSub.exec(['lncli', '--rpcserver=lnd.startos', 'getinfo'], {}, 30_000)
          if (res.exitCode === 0) {
            return {
              message: 'Wallet is unlocked',
              result: 'success',
            }
          } else if (
            res.stderr &&
            typeof res.stderr === 'string' &&
            (res.stderr.includes('wallet locked, unlock it to enable full RPC access') ||
              res.stderr.includes('wallet is encrypted'))
          ) {
            if (autoUnlockEnabled) {
              return {
                message: `Wallet is locked, but auto-unlock is enabled. 🔑 Password is not correct! Go to "Actions ⇢ Security ⇢ Wallet - Auto-Unlock" and enter correct password.`,
                result: 'loading',
              }
            } else {
              return {
                message: 'Wallet is locked as auto-unlock is disabled. Go to ⇓ Tasks or "Actions ⇢ Security ⇢ Wallet - Manual Unlock" and enter correct password.',
                result: 'loading',
              }
            }
          } else {
            return {
              message: `Unknown error: ${res.stderr as string}`,
              result: 'failure',
            }
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
          const backupIcon = backupEnabled ? '🟢】' : '🔴】'
          const backupText = backupEnabled ? 'ENABLED' : 'DISABLED'
          const backupStatus = `${backupText}${backupIcon}`
          const autoUnlock = store?.autoUnlockEnabled ?? false
          const unlockIcon = autoUnlock ? '🟡】' : '🟢】'
          const unlockText = autoUnlock ? 'AUTO ' : 'MANUAL'
          const unlockStatus = `${unlockText}${unlockIcon}`
          const seedOnServer = (store?.aezeedCipherSeed || []).length > 0
          const seedIcon = seedOnServer ? '🟡】' : '🟢】'
          const seedText = seedOnServer ? 'ON SERVER' : 'DELETED'
          const seedStatus = `${seedText}${seedIcon}`
          const wtClientEnabled = (store?.watchtowerClients || []).length > 0
          const wtIcon = wtClientEnabled ? '🟢】' : '🔴】'
          const wtText = wtClientEnabled ? 'ENABLED' : 'DISABLED'
          const wtStatus = `${wtText}${wtIcon}`
          const allGood = backupEnabled && !autoUnlock && !seedOnServer && wtClientEnabled
          const result = allGood ? 'success' : 'disabled'
          const label1 = `【① Channels Backup: `
          const label2 = `【② Wallet Unlocking: `
          const label3 = `【③ Aezeed Seed: `
          const label4 = `【④ Watchtower Client: `
          const message = `${label1}${backupStatus}${label2}${unlockStatus}${label3}${seedStatus}${label4}${wtStatus}`
          return { message, result }
        },
      },
      requires: ['lnd'],
    })
})
