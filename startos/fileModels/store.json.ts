import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const shape = z.object({
  restore: z.boolean().catch(false),
  aezeedCipherSeed: z.array(z.string()).nullable().catch(null),
  walletPassword: z.string().nullable().catch(null),
  resetWalletTransactions: z.boolean().catch(false),
  recoveryWindow: z.number().catch(2500), 
  walletInitialized: z.boolean().catch(false),
  pendingPasswordChange: z.string().nullable().catch(null),
  passwordChangeError: z.string().nullable().catch(null),
  autoUnlockEnabled: z.boolean().catch(true),
  seedBackupConfirmed: z.boolean().catch(false),
  passwordBackupConfirmed: z.boolean().catch(false),
  seedBackupIndices: z.array(z.number()).nullable().catch(null),
  watchtowerClients: z.array(z.string()).catch([]), 
})

export const storeJson = FileHelper.json(
  {
    base: sdk.volumes.main,
    subpath: '/store.json',
  },
  shape,
)
