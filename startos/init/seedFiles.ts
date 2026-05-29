import { utils } from '@start9labs/start-sdk'
import { access } from 'fs/promises'
import { lndConfFile } from '../fileModels/lnd.conf'
import { storeJson } from '../fileModels/store.json'
import { customConfigJson } from '../fileModels/custom-config.json'
import { sdk } from '../sdk'

const WALLET_DB_PATH = '/media/startos/volumes/main/data/chain/bitcoin/mainnet/wallet.db'
export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  await customConfigJson.merge(effects, {})
  const walletExists = await access(WALLET_DB_PATH).then(() => true).catch(() => false)

  if (kind === 'install') {
    // Seed every non-upstream default so a fresh install matches the form
    // defaults in fullConfigSpec (and "reset defaults"). Any field whose form
    // default overrides the upstream LND default must be listed here; fields
    // left at the upstream default stay unset.
    await lndConfFile.merge(effects, {
      'accept-keysend': true,
      'tor.skip-proxy-for-clearnet-targets': true,
    })
    await storeJson.merge(effects, {
      walletPassword: utils.getDefaultString({ charset: 'A-Z,2-7', len: 22 }),
    })
  } else {
    await storeJson.merge(effects, {
      walletInitialized: walletExists,
    })
    await lndConfFile.merge(effects, {})
  }
})
