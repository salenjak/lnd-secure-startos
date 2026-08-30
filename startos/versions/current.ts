import { VersionInfo } from '@start9labs/start-sdk'
import { lndConfFile } from '../fileModels/lnd.conf'
import { writeCerts } from '../init/setupCerts'
import { sdk } from '../sdk'
import { needsSqliteMigration, runSqliteMigration } from '../sqliteBackend'

export const current = VersionInfo.of({
  version: '0.21.2-beta:5',
  releaseNotes: {
    en_US: `New Security group and automatic channel-backup feature:

- Fixes LND restarting continuously after Revoke Macaroons is run. If your node was affected, re-pair everything connected to it.
- Channels - Auto-Backup: back up channel.backup to SFTP, Dropbox, Nextcloud, Google Drive, and/or by email whenever a channel opens or closes.
- Channels - Test Auto-Backup: manually trigger a backup to confirm your providers work.
- Wallet - Auto-Unlock: toggle whether LND unlocks automatically with a password stored on the server (an unlocked wallet is at risk if the server is stolen).
- Wallet - Manual Unlock: unlock a wallet whose auto-unlock is disabled.
- Wallet - Password: view / change the wallet password.
- Wallet - Password Backup / Delete Wallet Password: confirm you have the password saved, then delete it from the server.
- Aezeed Cipher Seed: display, confirm backup of, and delete the on-chain seed.
- A Security Status health check summarizes channels backup, wallet unlocking, seed, and watchtower status.
- gRPC LND Connect now works with wallets that pair over gRPC, and its QR code renders. Re-pair any wallet already connected over gRPC.
- Network and Graph Sync Progress reports how many peers are connected and how long a pending sync has been waiting.
- Performance settings add Graph Cache Duration; Stagger Initial Reconnect is now on by default.`,
    es_ES: `Nuevo grupo Seguridad y la función de respaldo automático de canales:

- Corrige que LND se reiniciara continuamente después de ejecutar Revocar macaroons. Si tu nodo se vio afectado, vuelve a emparejar todo lo que esté conectado a él.
- Canales - Respaldo automático: respalda channel.backup en SFTP, Dropbox, Nextcloud, Google Drive y/o por correo cuando un canal se abre o cierra.
- Canales - Probar respaldo automático: activa manualmente un respaldo para comprobar tus proveedores.
- Cartera - Desbloqueo automático: decide si LND se desbloquea automáticamente con una contraseña almacenada en el servidor (un desbloqueo automático pone en riesgo tus fondos si el servidor es robado).
- Cartera - Desbloqueo manual: desbloquea una cartera cuyo desbloqueo automático está desactivado.
- Cartera - Contraseña: consulta / cambia la contraseña de la cartera.
- Cartera - Respaldo de contraseña / Eliminar contraseña: confirma que has guardado la contraseña y elimínala del servidor.
- Semilla Aezeed Cipher: muestra, confirma el respaldo y elimina la semilla on-chain.
- El estado de Seguridad resume el respaldo de canales, el desbloqueo de la cartera, la semilla y el estado del watchtower.
- gRPC LND Connect ya funciona con las carteras que se emparejan por gRPC, y su código QR se muestra. Vuelve a emparejar cualquier cartera ya conectada por gRPC.
- Progreso de sincronización de red y grafo indica cuántos pares están conectados y cuánto tiempo lleva esperando una sincronización pendiente.
- Los ajustes de Rendimiento añaden Duración de la caché del grafo; Escalonar Reconexión Inicial ahora está activado de forma predeterminada.`,
    de_DE: `Neue Sicherheits-Gruppe und automatische Kanal-Sicherung:

- Behebt, dass LND nach dem Ausführen von „Macaroons widerrufen" fortlaufend neu startete. War Ihr Knoten betroffen, koppeln Sie alles neu, was mit ihm verbunden ist.
- Kanäle - Auto-Backup: Sichert channel.backup per SFTP, Dropbox, Nextcloud, Google Drive und/oder E-Mail, sobald ein Kanal geöffnet oder geschlossen wird.
- Kanäle - Auto-Backup testen: Sicherung manuell auslösen, um die Anbieter zu prüfen.
- Wallet - Auto-Unlock: bestimmt, ob LND automatisch mit einem auf dem Server gespeicherten Passwort entsperrt wird (ein Auto-Unlock gefährdet deine Gelder, wenn der Server gestohlen wird).
- Wallet - Manual Unlock: entsperrt ein Wallet mit deaktiviertem Auto-Unlock.
- Wallet - Passwort: zeigt / ändert das Wallet-Passwort.
- Wallet - Passwort-Sicherung / Passwort löschen: bestätige, dass du das Passwort gesichert hast, und entferne es anschließend.
- Aezeed-Cipher-Seed: zeigt, bestätigt und löscht den On-Chain-Seed.
- Der Sicherheitsstatus fasst Kanal-Sicherung, Wallet-Entsperrung, Seed- und Watchtower-Status zusammen.
- gRPC LND Connect funktioniert jetzt mit Wallets, die sich über gRPC koppeln, und sein QR-Code wird angezeigt. Koppeln Sie jede bereits über gRPC verbundene Wallet neu.
- „Netzwerk- und Graph-Synchronisierungsfortschritt" meldet, wie viele Peers verbunden sind und wie lange eine ausstehende Synchronisierung bereits wartet.
- Die Leistungseinstellungen erhalten „Graph-Cache-Dauer"; „Anfängliche Wiederverbindung staffeln" ist jetzt standardmäßig aktiv.`,
    pl_PL: `Nowa grupa Bezpieczeństwo oraz automatyczne tworzenie kopii zapasowych kanałów:

- Naprawiono ciągłe restartowanie się LND po uruchomieniu „Unieważnij macaroons". Jeśli dotyczyło to Twojego węzła, połącz ponownie wszystko, co jest z nim połączone.
- Kanały - Auto-Backup: kopiuje channel.backup do SFTP, Dropbox, Nextcloud, Google Drive i/lub e-mailem za każdym razem, gdy kanał zostaje otwarty lub zamknięty.
- Kanały - Test auto backupu: ręczne wywołanie kopii, aby sprawdzić dostawców.
- Portfel - Automatyczne odblokowywanie: decyduje, czy LND automatycznie odblokowuje portfel zapisanym hasłem (auto-odblok oznacza ryzyko, jeśli serwer zostanie skradziony).
- Portfel - Ręczne odblokowywanie: odblokowuje portfel z wyłączonym auto-odblokiem.
- Portfel - Hasło: wyświetla / zmienia hasło portfela.
- Portfel - Kopia zapasowa hasła / Usuń hasło: potwierdź zapis hasła, a następnie usuń je z serwera.
- Ziarno Aezeed Cipher: wyświetla, potwierdza kopię i usuwa ziarno on-chain.
- Stan Bezpieczeństwa podsumowuje kopię kanałów, odblokowanie portfela, ziarno i stan watchtowera.
- gRPC LND Connect działa teraz z portfelami łączącymi się przez gRPC, a jego kod QR jest wyświetlany. Połącz ponownie każdy portfel już podłączony przez gRPC.
- „Postęp synchronizacji sieci i grafu" pokazuje, ilu peerów jest połączonych i jak długo oczekuje trwająca synchronizacja.
- Ustawienia wydajności zyskują „Czas pamięci podręcznej grafu"; „Rozłóż początkowe ponowne połączenia" jest teraz domyślnie włączone.`,
    fr_FR: `Nouveau groupe Sécurité et la fonction de sauvegarde automatique des canaux :

- Corrige le redémarrage continu de LND après l'exécution de « Révoquer les macaroons ». Si votre nœud a été touché, ré-appairez tout ce qui y est connecté.
- Canaux - Sauvegarde auto : sauvegarde channel.backup vers SFTP, Dropbox, Nextcloud, Google Drive et/ou par e-mail à chaque ouverture/fermeture de canal.
- Canaux - Tester la sauvegarde auto : déclenche manuellement une sauvegarde pour vérifier vos fournisseurs.
- Portefeuille - Auto-déverrouillage : détermine si LND se déverrouille automatiquement avec un mot de passe stocké sur le serveur (un auto-déverrouillage risque des fonds si le serveur est volé).
- Portefeuille - Déverrouillage manuel : déverrouille un portefeuille dont l'auto-déverrouillage est désactivé.
- Portefeuille - Mot de passe : visualise / change le mot de passe du portefeuille.
- Portefeuille - Sauvegarde du mot de passe / Supprimer le mot de passe : confirmez la sauvegarde puis supprimez le mot de passe du serveur.
- Graine Aezeed Cipher : affiche, confirme la sauvegarde et supprime la graine on-chain.
- Le Statut de sécurité résume la sauvegarde des canaux, le déverrouillage du portefeuille, la graine et l'état du watchtower.
- gRPC LND Connect fonctionne désormais avec les portefeuilles qui s'appairent en gRPC, et son QR code s'affiche. Ré-appairez tout portefeuille déjà connecté en gRPC.
- « Progression de la synchronisation du réseau et du graphe » indique combien de pairs sont connectés et depuis combien de temps une synchronisation est en attente.
- Les paramètres de Performance ajoutent « Durée du cache du graphe » ; « Échelonner la reconnexion initiale » est désormais activé par défaut.`,
  },
  migrations: {
    up: async ({ effects, progress }) => {
      // Replay keys abandoned when bitcoind renamed its config action. Nothing
      // reaps them, and they keep demanding whatever they last asked for.
      await sdk.action.clearTask(
        effects,
        'bitcoind:config',
        'bitcoind:other-config',
      )
      // The bolt → SQLite conversion, for nodes updating from a pre-0.21
      // release — as a migration so it runs on updates only, reporting its two
      // phases to the update progress UI. Gated on data state, not version: an
      // already-converted node no-ops, and bolt data that arrives outside an
      // update (an Initialize Wallet import, a restored pre-conversion backup)
      // is converted by main's conversion phase instead (sqliteBackend.ts).
      if (await needsSqliteMigration()) {
        // Migrations run before the seedFiles and setupCerts init steps, and
        // the conversion's finalize stage runs LND against both on-disk
        // artifacts — so bring each current first. The conf re-render strips
        // what the schema retires (the pre-0.21 onion-message keys crash 0.21
        // with "feature bit: 39 already set"); the cert reissue covers curls
        // pinned to 127.0.0.1, a SAN pre-0.21 certs lack, without which the
        // schema run wedges until its timeout.
        await lndConfFile.merge(effects, {})
        await writeCerts(effects)
        await runSqliteMigration(effects, progress)
      }
    },
  },
})
