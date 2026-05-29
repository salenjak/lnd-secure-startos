# LND

## Documentation

- [Start9 Lightning wallets guide](https://docs.start9.com/bitcoin-guides/lightning-wallets) — connecting popular Lightning wallets to a StartOS node.
- [LND operator documentation](https://docs.lightning.engineering/lightning-network-tools/lnd) — the upstream guide to running and configuring LND.
- [This Fork README & Setup Guides](https://github.com/salenjak/lnd-startos/blob/master/README.md) — detailed setup instructions for automated channel backups (Email, SFTP, Dropbox, Nextcloud, Google Drive) and wallet security hardening.

## What you get on StartOS

A full **LND** node on Bitcoin mainnet, with **REST** and **gRPC** LND Connect interfaces, a **Peer** interface for inbound Lightning connections, and an optional **Watchtower** server. This enhanced fork adds **automated, encrypted channel backups** to external providers, **advanced wallet security hardening** (optional manual unlock, secure seed/password deletion), and a **Unified Security Health Check** dashboard. StartOS manages the wallet lifecycle, but gives you full control over whether the wallet auto-unlocks on startup or requires manual intervention.

## Getting set up

LND posts two critical tasks on install; you can't start it until both are done:

1. **Initialize Wallet** — **Start Fresh** for a new wallet, or **Migrate from Umbrel** / **Migrate from StartOS** to import one. Start Fresh shows your 24-word seed **once** — write it down. **The seed alone is not enough:** it recovers *on-chain* funds only; funds in channels can be recovered only from the **Static Channel Backup** in your StartOS backups, so keep backups (see [Backups](#backups)).
2. **Bitcoin Backend** — **Bitcoin Core** (recommended if you run it on this server) or **Neutrino** (built-in light client). Choosing Bitcoin Core posts a task on it to enable ZMQ.

Then start LND. Once running, secure your node using the new **Security** actions:

3. **Secure your Seed & Password** — Use the **Aezeed Cipher Seed** and **Wallet Password** actions to confirm you have backed them up offline, then securely delete them from the server to prevent physical theft.
4. **Configure Channel Auto-Backups** — Use the **Add Backup Target** action to set up external backups (Email, SFTP, Dropbox, Nextcloud, or Google Drive). Run **Test Auto-Backup** to verify.
5. **Change Unlock Mode** — Change **Auto-Unlock** (convenient, but less secure against physical server compromise) to **Manual Unlock** (maximum security, requires password entry via the UI after every reboot).

Monitor your **Security Status** health check in the dashboard — aim for all green indicators!

## Using LND

### Connecting wallets and apps

Open the **REST** or **gRPC LND Connect** interface and copy the `lndconnect://` URI (or scan the QR) into your wallet. It embeds your admin macaroon — treat it like a password. These interfaces appear only after the wallet is initialized.

### Reachability and networking

Other nodes connect to you over the **Peer** interface; run **Node Info** for your shareable peer URI. Whether others can reach you depends on the addresses your node advertises:

- **Tor** — Tor is a separate marketplace service, not built in. Install and start **Tor**, and LND will route outbound connections through it (on by default; change in **Tor Settings**). To be reachable *inbound* over Tor, also add an onion service to the **Peer** interface (the interface's **Tor** table, or the Tor service's **Manage Onion Services** action).
- **Clearnet** — set a **Custom External Host** (e.g. a Tunnelsats or VPN endpoint) to advertise a clearnet address alongside any onion. A public domain on the Peer interface also works, but only with **Skip for clearnet peers** enabled in **Tor Settings**.
- If no address is advertised, the **Node Reachability** health check shows *disabled*: you can still open channels outbound, but others can't open channels to you.

### Configuration

Configure LND through its settings actions — General, Routing Fees, Channel Settings, Autopilot, Performance, Watchtower Server/Client, Bitcoin Backend, Tor, and Custom External Host. You can also edit `lnd.conf` directly: your settings are preserved across restarts, except for a few keys StartOS manages for you (`externalip`/`externalhosts`, `tor.socks`, and the Bitcoin backend connection settings).

**Security & Backup Actions:**
- **Channels - Auto-Backup**: Add, configure, and test external backup providers (Email, SFTP, Dropbox, Nextcloud, Google Drive) for your encrypted `channel.backup` file.
- **Wallet Security**: Toggle between **Auto-Unlock** and **Manual Unlock**, change your wallet password, and securely delete your Aezeed seed and password from the server once backed up.

Two advanced actions worth knowing: **Reset Wallet Transactions** rescans the chain for on-chain transactions LND may have missed; **Recreate Macaroons** rotates credentials, after which you must reconnect wallets with the new `lndconnect://` URI.

## Backups

StartOS backs up LND with its system backup. **For a Lightning node this is essential:** your seed recovers on-chain funds only, while channel funds can be recovered only by force-closing from LND's **Static Channel Backup**, which is included in StartOS backups. Back up regularly.

### Automated Channel Backups (Enhanced Feature)
This fork adds a real-time backup daemon that monitors your `channel.backup` file. Whenever channels open or close, the encrypted backup is automatically synced to your configured external providers (Email, SFTP, Dropbox, Nextcloud, or Google Drive). Because the file is end-to-end encrypted by LND using your Aezeed seed, it is completely safe to store on third-party cloud servers. Use the **Channels - Test Auto-Backup** action to verify your setup.

### Restoring from backup

Restoring force-closes every channel from the Static Channel Backup and shows a persistent warning. **Lightning Labs strongly recommends against continued use of a restored node:** once funds are back on-chain, sweep them to another wallet, then uninstall and reinstall LND fresh.

## Limitations

- **Mainnet only** — no testnet, signet, or regtest.
- **Wallet is managed by StartOS** — `lncli create` and `lncli unlock` are not used (though manual unlock via the StartOS UI is supported).
- **Switching back to upstream** — If you decide to switch back to the official Start9 LND package, you **MUST** re-enable Auto-Unlock (so the wallet password is saved to `store.json`) *before* reinstalling the upstream version, or your wallet will fail to unlock on startup.