import { utils } from '@start9labs/start-sdk'
import { access } from 'fs/promises'
import { lndConfFile } from '../fileModels/lnd.conf'
import { storeJson } from '../fileModels/store.json'
import { customConfigJson } from '../fileModels/custom-config.json'
import { sdk } from '../sdk'

const WALLET_DB_PATH = '/media/startos/volumes/main/data/chain/bitcoin/mainnet/wallet.db'
export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  await lndConfFile.merge(effects, {})
  await customConfigJson.merge(effects, {})
  const walletExists = await access(WALLET_DB_PATH).then(() => true).catch(() => false)

  if (kind === 'install') {
    await storeJson.merge(effects, {
      walletPassword: utils.getDefaultString({ charset: 'A-Z,2-7', len: 22 }),
    })
  } else {
    await storeJson.merge(effects, {
      walletInitialized: walletExists,
    })
  }
})
