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
  version: '#secure:0.20.1-beta:13',
        releaseNotes: {
    en_US: `- **Enhanced Channel Auto-Backup:** The backup watcher now correctly catches LND's atomic file replacements to ensure no channel events are missed. Added a "Suppress Redundant Startup Backups" toggle to prevent phantom notifications on reboot, and a customizable "Email Body Text" field with privacy-focused defaults to prevent doxxing.
- **Manual Unlock Improvements:** Refactored \`sync-progress\` and \`wallet-status\` health checks to use \`getLndState()\` early returns. This prevents \`lncli getinfo\` from flooding LND logs with "wallet locked" errors while still displaying helpful custom messages for manual unlock users. Also removed redundant 5-second \`console.log\` spam from the \`unlock-wallet\` oneshot.
- **Sync Progress Fix:** Fixes the **Network and Graph Sync Progress** health check spuriously reporting a failure and flooding the logs while LND is still starting up — most visibly right after an upgrade, when Bitcoin Core is still loading. The check now reports **Starting** until LND is ready to answer.
- **Auto-Configure Action:** Adds a hidden **Auto-Configure** action that lets a dependent service request specific lnd.conf settings through a one-click task. The first use is enabling onion messages for BOLT12 offers (e.g. BOLT12 Pay / LNDK).`,

    es_ES: `- **Copia de seguridad de canales mejorada:** El observador de copias de seguridad ahora detecta correctamente los reemplazos atómicos de archivos de LND para asegurar que no se pierda ningún evento de canal. Se agregó un interruptor para "Suprimir copias de seguridad redundantes al inicio" para evitar notificaciones fantasma al reiniciar, y un campo de "Texto del cuerpo del correo" personalizable con valores predeterminados enfocados en la privacidad.
- **Mejoras en el desbloqueo manual:** Se refactorizaron las comprobaciones de estado \`sync-progress\` y \`wallet-status\` para usar retornos anticipados de \`getLndState()\`. Esto evita que \`lncli getinfo\` inunde los registros de LND con errores de "billetera bloqueada" y muestra mensajes personalizados útiles. También se eliminó el spam de \`console.log\` cada 5 segundos en el proceso de desbloqueo.
- **Corrección de progreso de sincronización:** Corrige el chequeo de estado **Progreso de sincronización de red y grafo** que reportaba erróneamente un fallo e inundaba los registros mientras LND aún se estaba iniciando — más visible justo después de una actualización, cuando Bitcoin Core todavía se está cargando. Ahora el chequeo indica **Iniciando** hasta que LND está listo para responder.
- **Acción de Configuración automática:** Añade una acción oculta **Configuración automática** que permite a un servicio dependiente solicitar ajustes específicos de lnd.conf mediante una tarea de un solo clic. Su primer uso es habilitar los mensajes onion para las ofertas BOLT12 (por ejemplo, BOLT12 Pay / LNDK).`,

    de_DE: `- **Verbesserte automatische Kanal-Sicherung:** Der Sicherungs-Watcher erkennt nun korrekt die atomaren Dateiersetzungen von LND, um sicherzustellen, dass keine Kanal-Ereignisse verpasst werden. Ein Schalter zum "Unterdrücken redundanter Start-Sicherungen" wurde hinzugefügt, um Phantom-Benachrichtigungen beim Neustart zu vermeiden, sowie ein anpassbares "E-Mail-Text"-Feld mit datenschutzfreundlichen Standardeinstellungen.
- **Verbesserungen beim manuellen Entsperren:** Refaktorierung der Zustandsprüfungen \`sync-progress\` und \`wallet-status\` zur Verwendung früher Rückgaben von \`getLndState()\`. Dies verhindert, dass \`lncli getinfo\` die LND-Protokolle mit "Wallet gesperrt"-Fehlern überflutet, und zeigt hilfreiche benutzerdefinierte Meldungen an. Zudem wurde redundanter 5-Sekunden-\`console.log\`-Spam entfernt.
- **Synchronisierungsfortschritt-Fix:** Behebt einen Fehler, bei dem die Zustandsprüfung **Netzwerk- und Graph-Synchronisierungsfortschritt** fälschlicherweise einen Fehler meldete und die Protokolle überflutete, während LND noch startete — am deutlichsten direkt nach einer Aktualisierung, wenn Bitcoin Core noch lädt. Die Prüfung meldet jetzt **Startet**, bis LND antwortbereit ist.
- **Aktion "Automatisch konfigurieren":** Fügt eine versteckte Aktion **Automatisch konfigurieren** hinzu, mit der ein abhängiger Dienst bestimmte lnd.conf-Einstellungen über eine Ein-Klick-Aufgabe anfordern kann. Der erste Anwendungsfall ist das Aktivieren von Onion-Nachrichten für BOLT12-Angebote (z. B. BOLT12 Pay / LNDK).`,

    pl_PL: `- **Ulepszona automatyczna kopia zapasowa kanałów:** Nasłuchiwanie kopii zapasowych teraz poprawnie przechwytuje atomowe zastępowanie plików przez LND, co zapewnia, że żadne zdarzenia kanału nie zostaną pominięte. Dodano przełącznik "Pomiń zbędne kopie zapasowe przy starcie", aby zapobiec fałszywym powiadomieniom po restarcie, oraz konfigurowalne pole "Tekst treści e-mail" z domyślnymi ustawieniami chroniącymi prywatność.
- **Ulepszenia ręcznego odblokowywania:** Zrefaktoryzowano kontrolę stanu \`sync-progress\` i \`wallet-status\`, aby używać wczesnych zwracanych wartości \`getLndState()\`. Zapobiega to zalewaniu logów LND błędami "portfel zablokowany" i wyświetla pomocne komunikaty. Usunięto również nadmiarowy spam \`console.log\` co 5 sekund.
- **Poprawka postępu synchronizacji:** Naprawia kontrolę stanu **Postęp synchronizacji sieci i grafu**, która błędnie zgłaszała awarię i zalewała logi, gdy LND wciąż się uruchamiał — najbardziej widoczne tuż po aktualizacji, gdy Bitcoin Core nadal się ładuje. Kontrola zgłasza teraz **Uruchamianie**, dopóki LND nie jest gotowy do odpowiedzi.
- **Akcja Automatycznej konfiguracji:** Dodaje ukrytą akcję **Automatyczna konfiguracja**, która pozwala usłudze zależnej zażądać określonych ustawień lnd.conf za pomocą zadania jednym kliknięciem. Pierwszym zastosowaniem jest włączenie wiadomości onion dla ofert BOLT12 (np. BOLT12 Pay / LNDK).`,

    fr_FR: `- **Sauvegarde automatique des canaux améliorée :** Le surveillant de sauvegarde détecte désormais correctement les remplacements de fichiers atomiques de LND pour s'assurer qu'aucun événement de canal n'est manqué. Ajout d'une option "Supprimer les sauvegardes de démarrage redondantes" pour éviter les notifications fantômes au redémarrage, et d'un champ "Texte du corps de l'e-mail" personnalisable avec des valeurs par défaut axées sur la confidentialité.
- **Améliorations du déverrouillage manuel :** Refonte des contrôles de santé \`sync-progress\` et \`wallet-status\` pour utiliser les retours anticipés de \`getLndState()\`. Cela empêche \`lncli getinfo\` d'inonder les journaux LND avec des erreurs "portefeuille verrouillé" tout en affichant des messages personnalisés utiles. Suppression également du spam \`console.log\` redondant de 5 secondes.
- **Correction de la progression de la synchronisation :** Corrige le contrôle de santé **Progression de la synchronisation du réseau et du graphe** qui signalait à tort un échec et inondait les journaux pendant que LND démarrait encore — surtout juste après une mise à jour, lorsque Bitcoin Core est encore en cours de chargement. Le contrôle indique désormais **Démarrage** jusqu'à ce que LND soit prêt à répondre.
- **Action de Configuration automatique :** Ajoute une action masquée **Configuration automatique** qui permet à un service dépendant de demander des paramètres lnd.conf spécifiques via une tâche en un clic. Le premier usage est l'activation des messages onion pour les offres BOLT12 (par exemple BOLT12 Pay / LNDK).`,
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
  
}).satisfies('0.20.1-beta:13')