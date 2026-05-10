import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import type { Effects } from '@start9labs/start-sdk/base/lib/types'
import { lndDataDir, mainMounts } from '../utils'

const { InputSpec, Value } = sdk

type ManualUnlockInput = {
  password: string
}

export const manualWalletUnlock = sdk.Action.withInput(
  'wallet-manual-unlock',
  async ({ effects }: { effects: Effects }) => {
    const store = await storeJson.read().const(effects)
    return {
      name: 'Wallet - Manual Unlock',
      description: 'Enter your wallet password to unlock LND manually.',
      warning: 'Enter the correct password to unlock your wallet.',
      allowedStatuses: 'any',
      group: 'Security',
      visibility: store?.autoUnlockEnabled === false ? 'enabled' : { disabled: 'Auto-unlock is enabled or wallet not initialized for manual unlock' },
    }
  },
  InputSpec.of({
    password: Value.text({
      name: 'Wallet - Password',
      description: 'Enter your wallet password to unlock LND.',
      required: true,
      masked: true,
      default: null,
    }),
  }),
  async () => ({}),
  async ({ effects, input }: { effects: Effects; input: ManualUnlockInput }) => {
    const { password } = input
    const store = await storeJson.read().const(effects)
    if (!store?.walletInitialized) {
      throw new Error('Wallet not initialized')
    }

    const walletPasswordBase64 = Buffer.from(password, 'utf8').toString('base64')
    console.log('Unlocking wallet with provided password (base64):************************')

    try {
      const res = await sdk.SubContainer.withTemp(
        effects,
        { imageId: 'lnd' },
        mainMounts,
        'manual-unlock-temp',
        async (lndSub) => {
          const storeForUnlock = (await storeJson.read().const(effects))!
          const currentRestore = storeForUnlock?.restore ?? false
          const currentRecoveryWindow = storeForUnlock?.recoveryWindow ?? 2500

          return await lndSub.exec([
            'curl',
            '--no-progress-meter',
            '-X',
            'POST',
            '--cacert',
            `${lndDataDir}/tls.cert`,
            'https://lnd.startos:8080/v1/unlockwallet',
            '-d',
            currentRestore
              ? JSON.stringify({
                  wallet_password: walletPasswordBase64,
                  recovery_window: currentRecoveryWindow,
                })
              : JSON.stringify({
                  wallet_password: walletPasswordBase64,
                }),
          ])
        }
      )

      console.log('wallet-unlock response', res)
      if (res.stdout === '{}' && res.exitCode === 0) {
        console.log('Wallet unlocked successfully via manual action.')
        return {
          version: '1',
          title: `LND Wallet`,
          message: `<hr><span class="g-card"><header>Status: UNLOCKED <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9IiMwMGZmOGUiPjx0aXRsZSB4bWxucz0iIiBmaWxsPSIjMDBmZjhlIj5zaGllbGQtdW5sb2NrZWQtb3V0bGluZTwvdGl0bGU+PHBhdGggZmlsbD0iIzAwZmY4ZSIgZD0iTTIxIDExYzAgNS41LTMuOCAxMC43LTkgMTJjLTUuMi0xLjMtOS02LjUtOS0xMlY1bDktNGw5IDR6bS05IDEwYzMuOC0xIDctNS41IDctOS44VjYuM2wtNy0zLjFsLTcgMy4xdjQuOWMwIDQuMyAzLjIgOC44IDcgOS44bTIuOC0xMGgtNC4zVjguNWMwLS44LjctMS4zIDEuNS0xLjNzMS41LjUgMS41IDEuM1Y5aDEuM3YtLjVDMTQuOCA3LjEgMTMuNCA2IDEyIDZTOS4yIDcuMSA5LjIgOC41VjExYy0uNiAwLTEuMi42LTEuMiAxLjJ2My41YzAgLjcuNiAxLjMgMS4yIDEuM2g1LjVjLjcgMCAxLjMtLjYgMS4zLTEuMnYtMy41YzAtLjctLjYtMS4zLTEuMi0xLjMiLz48L3N2Zz4=" alt="shield-unlocked-outline" width="32" height="32"></header>
        <h3 class="g-secondary"><br><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9IiNmZmIxMDAiPjx0aXRsZSB4bWxucz0iIiBmaWxsPSIjZmZiMTAwIj5zdG9wd2F0Y2gtZHVvdG9uZTwvdGl0bGU+PHBhdGggZmlsbD0iI2ZmYjEwMCIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNOS43NSAyLjVhLjc1Ljc1IDAgMCAxIC43NS0uNzVoM2EuNzUuNzUgMCAwIDEgMCAxLjVoLS43NXYxLjUzMmE4LjcgOC43IDAgMCAxIDQuODg0IDIuMDIzbC44MzYtLjgzNWEuNzUuNzUgMCAxIDEgMS4wNiAxLjA2bC0uODM1LjgzNmE4Ljc1IDguNzUgMCAxIDEtNy40NDUtMy4wODRWMy4yNWgtLjc1YS43NS43NSAwIDAgMS0uNzUtLjc1TTEyIDYuMjVhNy4yNSA3LjI1IDAgMSAwIDAgMTQuNWE3LjI1IDcuMjUgMCAwIDAgMC0xNC41IiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz48cGF0aCBmaWxsPSIjZmZiMTAwIiBkPSJNMTIgNy43NWE1Ljc1IDUuNzUgMCAxIDAgNC45OCA4LjYyNUwxMiAxMy41eiIgb3BhY2l0eT0iLjUiLz48L3N2Zz4=" alt="stopwatch-duotone" height="32" width="32">&nbsp;&nbsp;Your wallet is ready to use. Health checks will update "Wallet Status" within 30 seconds.<br><br></h3></span>`,
          result: null,
        }
      } else {
        let errorMessage = 'Unlock failed: Unexpected response from LND.'
        if (res.stderr) {
          console.error('wallet-unlock error:', res.stderr.toString())
          errorMessage = `Unlock failed: ${(res.stderr?.toString() || '').substring(0, 200)}...`
        }
        throw new Error(errorMessage)
      }
    } catch (err) {
      console.error('Error during manual wallet unlock:', err)
      throw err
    }
  },
)

type Input = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export const walletPassword = sdk.Action.withInput(
  'wallet-password',
  async ({ effects }: { effects: Effects }) => ({
    name: 'Wallet - Password',
    description: 'Display / Change the password used to unlock your LND wallet.',
    warning: null,
    allowedStatuses: 'any',
    group: 'Security',
    visibility: 'enabled',
  }),
  InputSpec.of({
    currentPassword: Value.text({
      name: 'Current Password',
      description: 'Your current wallet password.',
      required: true,
      masked: true,
      default: '',
    }),
    newPassword: Value.text({
      name: 'New Password',
      description: 'Enter your new wallet password (minimum 8 characters).',
      required: true,
      masked: true,
      default: null,
    }),
    confirmPassword: Value.text({
      name: 'Confirm New Password',
      description: 'Re-enter your new wallet password.',
      required: true,
      masked: true,
      default: null,
    }),
  }),
  async ({ effects }) => {
    const store = await storeJson.read().const(effects)
    const autoUnlockEnabled = store?.autoUnlockEnabled ?? false
    let currentPasswordDefault = ''
    let currentPasswordDescription = 'Your current wallet password.'

    if (autoUnlockEnabled && store?.walletPassword) {
      try {
        const decodedPassword = Buffer.from(store.walletPassword, 'base64').toString('utf8')
        currentPasswordDefault = decodedPassword
        currentPasswordDefault = store.walletPassword

        currentPasswordDescription = 'Your current wallet password (loaded from store).'
        console.log('Pre-filling current password field (plaintext) for user convenience (auto-unlock enabled).')
      } catch (decodeError) {
        console.error('Failed to decode wallet password for pre-fill:', decodeError)
        currentPasswordDefault = ''
        currentPasswordDescription = 'Your current wallet password (failed to load from store).'
      }
    } else {
      console.log('Auto-unlock disabled or no password in store. Leaving current password field empty.')
      currentPasswordDescription = 'Your current wallet password (enter manually as auto-unlock is disabled or no password is stored).'
    }

    return {
      currentPassword: currentPasswordDefault,
      newPassword: '',
      confirmPassword: '',
    }
  },
  async ({ effects, input }: { effects: Effects; input: Input }) => {
    const { currentPassword, newPassword, confirmPassword } = input
    const store = await storeJson.read().const(effects)

    if (!store) throw new Error('Store not initialized.')

    const walletInitialized = store.walletInitialized ?? false
    const autoUnlockEnabled = store.autoUnlockEnabled ?? false

    if (newPassword !== confirmPassword) throw new Error('New passwords do not match.')
    if (!newPassword || newPassword.length < 8) throw new Error('New password must be at least 8 characters.')

    if (autoUnlockEnabled && store.walletPassword) {
      if (currentPassword !== store.walletPassword) {
        throw new Error('Current password is incorrect.')
      }
    }

    const encodedNewPassword = Buffer.from(newPassword, 'utf8').toString('base64')

    try {
      const wasAutoUnlockDisabled = !autoUnlockEnabled
      
      await storeJson.merge(effects, {
        walletPassword: currentPassword,           
        pendingPasswordChange: encodedNewPassword, 
        autoUnlockEnabled: true,
        passwordChangeError: null,
        passwordBackupConfirmed: false,
      })

      await sdk.restart(effects)

      let message = 'Password change initiated. The service is restarting...'
      if (wasAutoUnlockDisabled) {
        message += ' Auto-unlock was temporarily enabled. Disable it again after confirming the new password works.'
      }

return {
        version: '1',
        title: 'Wallet Password',
        message: `<hr><span class="g-card"><header>Status: CHANGED <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHN0cm9rZT0iIzAwZmY4YSI+PHRpdGxlIHhtbG5zPSIiIHN0cm9rZT0iIzAwZmY4YSI+cGFzc3dvcmQtY2hlY2s8L3RpdGxlPjxwYXRoIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwZmY4YSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIgZD0iTTIxIDEzVjhhMiAyIDAgMCAwLTItMkg1YTIgMiAwIDAgMC0yIDJ2NmEyIDIgMCAwIDAgMiAyaDdtMi41IDIuNWwyIDJsNC00TTEyIDExLjAxbC4wMS0uMDExbTMuOTkuMDExbC4wMS0uMDExTTggMTEuMDFsLjAxLS4wMTEiLz48L3N2Zz4=" alt="password-check" width="48" height="48"></header>
        <h3 class="g-secondary"><br>&nbsp;&nbsp;New wallet password will be set after LND (re)start.<br><br></h3></span>`,
        result: null,
      }
        } catch (err) {
      console.error('Error initiating password change:', err)
      await storeJson.merge(effects, {
        pendingPasswordChange: null,
        walletPassword: store.walletPassword, 
        autoUnlockEnabled,
        passwordChangeError: (err as Error).message || String(err),
        passwordBackupConfirmed: store.passwordBackupConfirmed, 
                })
      throw new Error(`Failed to initiate password change: ${(err as Error).message}`)
    }
  }
)