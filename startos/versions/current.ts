import { IMPOSSIBLE, VersionInfo, YAML } from '@start9labs/start-sdk'
import { readFile, rm } from 'fs/promises'
import { lndConfFile } from '../fileModels/lnd.conf'
import { storeJson } from '../fileModels/store.json'
import { bitcoindBundle, neutrinoBundle } from '../utils'

type OldConfig = {
  bitcoind: { type: 'none' } | { type: 'internal' }
  watchtowers: {
    'wt-client':
      | { enabled: 'disabled' }
      | { enabled: 'enabled'; 'add-watchtowers': string[] }
  }
  advanced?: {
    'protocol-simple-taproot-chans'?: boolean
  }
}

export const current = VersionInfo.of({
  version: '#secure:0.20.1-beta:11',
  
  releaseNotes: {
    en_US: `**Fixes**

- Fixes a critical encoding bug in the **Change Password** and **Manual Unlock** actions that caused failures for passwords containing special characters.
- Replaces hardcoded REST API ports with dynamic SDK variables for better compatibility.

**Internal**

- Synced with upstream LND v0.20.1-beta:11.
- Refactored custom actions to align with the new StartOS SDK state architecture.
- Renamed project to lnd-secure-startos in preparation for the Start9 Community Registry.`,
    es_ES: `**Correcciones**

- Corrige un error crítico de codificación en las acciones **Cambiar Contraseña** y **Desbloqueo Manual** que causaba fallos en contraseñas con caracteres especiales.
- Reemplaza los puertos REST API hardcodeados con variables dinámicas del SDK para mayor compatibilidad.

**Interno**

- Sincronizado con LND v0.20.1-beta:11.
- Refactorizadas las acciones personalizadas para alinearse con la nueva arquitectura de estado del SDK de StartOS.
- Proyecto renombrado a lnd-secure-startos en preparación para el Registro de la Comunidad Start9.`,
    de_DE: `**Fehlerbehebungen**

- Behebt einen kritischen Kodierungsfehler in den Aktionen **Passwort ändern** und **Manuelle Entsperrung**, der bei Passwörtern mit Sonderzeichen zu Fehlern führte.
- Ersetzt fest codierte REST-API-Ports durch dynamische SDK-Variablen für bessere Kompatibilität.

**Intern**

- Synchronisiert mit Upstream LND v0.20.1-beta:11.
- Benutzerdefinierte Aktionen wurden an die neue StartOS SDK-State-Architektur angepasst.
- Projekt in lnd-secure-startos umbenannt zur Vorbereitung auf die Start9 Community Registry.`,
    pl_PL: `**Poprawki**

- Naprawia krytyczny błąd kodowania w akcjach **Zmień hasło** i **Ręczne odblokowanie**, który powodował błędy dla haseł zawierających znaki specjalne.
- Zastępuje sztywno zakodowane porty REST API dynamicznymi zmiennymi SDK dla lepszej kompatybilności.

**Wewnętrzne**

- Zsynchronizowano z upstream LND v0.20.1-beta:11.
- Zrefaktoryzowano niestandardowe akcje, aby dostosować je do nowej architektury stanu StartOS SDK.
- Zmieniono nazwę projektu na lnd-secure-startos w ramach przygotowań do Rejestru Społeczności Start9.`,
    fr_FR: `**Corrections**

- Corrige un bug critique d'encodage dans les actions **Changer le mot de passe** et **Déverrouillage manuel** qui provoquait des échecs pour les mots de passe contenant des caractères spéciaux.
- Remplace les ports d'API REST codés en dur par des variables SDK dynamiques pour une meilleure compatibilité.

**Interne**

- Synchronisé avec LND v0.20.1-beta:11.
- Refactorisation des actions personnalisées pour s'aligner sur la nouvelle architecture d'état du SDK StartOS.
- Projet renommé en lnd-secure-startos en préparation du Registre Communautaire Start9.`,
  },

  migrations: {
    up: async ({ effects }) => {
      const configYaml: OldConfig | undefined = await readFile(
        '/media/startos/volumes/main/start9/config.yaml',
        'utf-8',
      ).then(YAML.parse, () => undefined)

      const prev = await storeJson.read().once().catch(() => null)
      if (configYaml) {
        const wtClient = configYaml.watchtowers?.['wt-client']
        await storeJson.merge(effects, {
          aezeedCipherSeed: prev?.aezeedCipherSeed || (await readFile('/media/startos/volumes/main/start9/cipherSeedMnemonic.txt', 'utf8').then((contents) => {
            const words = contents.trimEnd().split('\n').map((line) => line.split(' ')[1])
            return words.length === 24 ? words : null
          }, () => null)),
          walletPassword: prev?.walletPassword || (await readFile('/media/startos/volumes/main/pwd.dat').then((buf) => buf.toString('latin1'))),
          watchtowerClients: wtClient?.enabled === 'enabled' ? wtClient['add-watchtowers'] : [],
        })
        await rm('/media/startos/volumes/main/start9', { recursive: true }).catch(console.error)
        await lndConfFile.merge(effects, {
          externalhosts: undefined,
          ...(configYaml.bitcoind.type === 'internal' ? bitcoindBundle : neutrinoBundle),
          'protocol.simple-taproot-chans': configYaml.advanced?.['protocol-simple-taproot-chans'] || undefined,
        })
      }
    },
    down: IMPOSSIBLE,
    
    other: {
      '^0.18': { up: async ({ effects }) => {}, down: async ({ effects }) => {} },
      '^0.19': { up: async ({ effects }) => {}, down: async ({ effects }) => {} },
      '^0.20': { up: async ({ effects }) => {}, down: async ({ effects }) => {} },
    },
  },
  
}).satisfies('0.20.1-beta:11')