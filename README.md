<p align="center">
  <img src="icon.png" alt="LND Logo" width="21%">
</p>

# LND for StartOS — Be Your Own "<b>LOCKED</b>" Bank

> **Improved wallet security and automated channel backups for your Lightning node.**

This fork extends the official [StartOS LND](https://github.com/Start9Labs/lnd-startos) with:
- <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 16 16"><path fill="currentColor" d="M8 3a3 3 0 0 0-3 3a.5.5 0 0 1-.5.5h-.25a2.25 2.25 0 0 0 0 4.5h.772q.048.516.185 1H4.25a3.25 3.25 0 0 1-.22-6.493a4 4 0 0 1 7.887-.323a5.5 5.5 0 0 0-1.084-.174A3 3 0 0 0 8 3m7 7.5a4.5 4.5 0 1 1-9 0a4.5 4.5 0 0 1 9 0m-4.854-2.353l-2 2a.5.5 0 0 0 .708.707L10 9.707V12.5a.5.5 0 0 0 1 0V9.707l1.146 1.147a.5.5 0 0 0 .708-.708l-2-2A.5.5 0 0 0 10.503 8h-.006a.5.5 0 0 0-.348.144z"/></svg> **Automated, encrypted channel backups + TEST:** Add, configure, and test backup providers for your `channel.backup` file. You can select multiple providers (Nextcloud, Dropbox, Google Drive, Email, SFTP) and multiple email recipients. 
- <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 48 48"><g fill="currentColor"><path d="M22 22v-7h4v7h7v4h-7l-.001 7h-4v-7h-7v-4z"/><path fill-rule="evenodd" d="M13.823 36.991c2.448 2.211 5.13 4.037 8.158 5.477c1.622.77 3.546.7 5.101-.187c2.623-1.496 4.906-3.297 7.113-5.29c4.679-4.226 7.406-10.041 7.585-16.174l.209-7.151c.024-.832.001-2.666.001-2.666a71 71 0 0 0-3.162-.426c-3.27-.392-6.526-.781-9.383-2.528l-2.037-1.245a5.54 5.54 0 0 0-5.737 0L19.72 7.994c-3.267 1.996-7.248 2.374-11.101 2.74c-.873.083-1.74.166-2.59.266c0 0-.024 1.845 0 2.689l.209 7.128c.179 6.133 2.906 11.948 7.585 16.174m-5.804-24.19c0 .32.003.615.01.83l.208 7.128c.163 5.57 2.64 10.876 6.926 14.748c2.312 2.087 4.833 3.802 7.677 5.154a3.55 3.55 0 0 0 3.252-.117c2.455-1.4 4.619-3.101 6.763-5.037c4.286-3.872 6.763-9.177 6.926-14.748l.209-7.151c.006-.224.01-.539.01-.875q-.702-.089-1.43-.176l-.054-.006a69 69 0 0 1-3.322-.455c-2.244-.38-4.592-.999-6.792-2.343l-2.037-1.246a3.54 3.54 0 0 0-3.651 0L20.763 9.7c-2.32 1.417-4.88 2.089-7.347 2.486c-1.53.246-3.178.403-4.721.551z" clip-rule="evenodd"/></g></svg> **Unified Security Health Check** showing your current security status:  
  【① Channels Backup: ENABLED🟢 / DISABLED🔴】  
  【② Wallet Unlocking: MANUAL🟢 / AUTO🟡】  
  【③ Aezeed Seed: DELETED🟢 / ON SERVER🟡】  
  【④ Watchtower Client: ENABLED🟢 / DISABLED🔴】
- <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><path fill="currentColor" d="M12 22q-3.475-.875-5.738-3.988T4 11.1V5l8-3l8 3v6.1q0 3.8-2.262 6.913T12 22m0-2.1q2.6-.825 4.3-3.3t1.7-5.5V6.375l-6-2.25l-6 2.25V11.1q0 3.025 1.7 5.5t4.3 3.3M9 16h6v-5h-1v-1q0-.825-.587-1.412T12 8t-1.412.588T10 10v1H9zm2-5v-1q0-.425.288-.712T12 9t.713.288T13 10v1z"/></svg> **Wallet security hardening:**  
  Wallet unlocking: AUTO / MANUAL  
  Wallet password: CHANGE, CONFIRM BACKUP, DELETE   
  Aezeed Cipher Seed: CONFIRM BACKUP, DELETE   

## Table of Contents

- [Key Features](#key-features)
  - [Channel Auto-Backup](#channel-auto-backup)
  - [Wallet Security](#wallet-security-from-wallet-security-branch)
  - [Unified Security Status](#unified-security-status-in-the-dashboard)
- [Technical Details](#technical-details)
  - [Architecture & Security](#architecture--security)
  - [Upgrade Safety](#upgrade-safety)
  - [Dependencies](#dependencies-added-to-dockerfile)
- [New / Modified Files](#new--modified-files)
- [Channels Backup Setup Examples](#channels-backup-setup-examples)
  - [Email Setup](#email)
  - [SFTP Setup](#sftp)
  - [Dropbox Setup](#dropbox)
  - [Nextcloud Setup](#nextcloud)
  - [Google Drive Setup](#google-drive)
- [Switching Back to the StartOS LND](#switching-back-to-the-startos-lnd)
- [Upstream Documentation](#upstream-documentation)

---

## Key Features

### Channel Auto-Backup
![Channel Auto-Backup](assets/channel-auto-backup.png)  

Automatically back up your encrypted `channel.backup` file whenever channels open/close or by manually triggering backup via `Channels - Test Auto-Backup` action:

| Provider      | Setup Guide                                                                 | Notes                                                                 |
|---------------|-----------------------------------------------------------------------------|-----------------------------------------------------------------------|
| **Email**     | [Email setup example](#email), Gmail, MailerSend (free tiers available) | Most reliable; recommends **≥2 recipients** across providers          |
| **Dropbox**   | [Dropbox setup example](#dropbox)                 | Uses OAuth2; refresh token stored encrypted                           |
| **Google Drive** | [Google Drive setup example](#google)                  | Works with **free personal accounts**                                 |
| **Nextcloud** | [Nextcloud setup example](#nextcloud)                                     | Supports `.onion` addresses over Tor                                  |
| **SFTP**      | [SFTP setup example](#sftp) Any SSH server (remote or local)                                  | Supports **password or SSH key**; works over Tor for `.onion` servers |

- **End-to-end encrypted**: `channel.backup` is encrypted by LND using your AEZEED seed  
  → Safe to store on third-party servers
- **Tor-aware**: Special handling for `.onion` SFTP/Nextcloud destinations
- **Robust**: Per-provider success/failure logging; automatic retries


### Wallet Security (from `wallet-security` branch)
![Wallet Security](assets/wallet-unlocking.png)
![Wallet Manual Unlock](assets/wallet-manual-unlock.png)  

- **Auto-unlock management**:  
  Disable auto-unlock to prevent fund theft if your server is physically compromised.  
  *(Disabling requires password confirmation & can be enabled again)*
- **Aezeed Cipher Seed**:  
  View seed → Verify backup with 3-word challenge → **Securely delete from server**
- **Wallet password management**:  
  Confirm backup → **Securely delete password** from server  
  *(Required before disabling auto-unlock)*. Added manual unlock of the wallet in Dashboard Users can now change the wallet.db password in the app.
  


### Unified Security Status in the Dashboard
![Security Status Health Check Fail](assets/security-status-fail.png)  
![Security Status Health Check Success](assets/security-status-success.png)  
All critical security settings in one place:


✅ **ALL GREEN = Maximum security** (auto-backup enabled, manual unlock, seed/password deleted)

---



> 💡 **Critical**: Without channel backups, you **lose all Lightning channel funds** if your node fails.  
> Without seed/password deletion, anyone with physical access can **steal your Bitcoin**.

---

## Technical Details

### Architecture & Security
- **Isolated Channels Backup Config**: Uses `custom-config.json` to store backup settings separately from core LND config (`lnd.conf`). This prevents backup configuration changes from interfering with node operation.
- **Obscured Credentials**: Sensitive data (SMTP passwords, SSH private keys, OAuth tokens) are **AES-256-CTR encrypted** within `custom-config.json` before storage. They are never stored as plain text strings in the JSON file.
- **Real-Time Backup Daemon**: Adds a dedicated `channel-backup-watcher` daemon that uses `inotifywait` to monitor `channel.backup` for changes. When a change is detected, it triggers `rclone` (for cloud/SFTP) or `mutt` (for email) to sync the file immediately.
- **Wallet State Sync**: On startup, the system checks if `wallet.db` exists. If it does, but `walletInitialized` is false/missing (common after upgrading from upstream), it automatically sets `walletInitialized: true` to prevent false "not initialized" errors.
- **Enhanced Health Checks**: Adds a unified **Security Status** health check that displays the status of backups, wallet unlocking mode, seed presence, and watchtower client status in a single dashboard view.

### Upgrade Safety
- **Schema Backward-Compatibility**: All new `store.json` fields (`autoUnlockEnabled`, `seedBackupConfirmed`, etc.) use `.catch()` defaults to ensure smooth upgrades from older versions or upstream forks.
- **Migration Robustness**: `custom-config.json` is created during **both fresh installs AND upgrades** if missing.

### Dependencies (Added to Dockerfile)
The following packages were added to the Docker image to support backup and monitoring features:
- `rclone` (cloud sync for Dropbox, Google Drive, Nextcloud, SFTP)
- `mutt` + `mailutils` (email sending via SMTP)
- `inotify-tools` (file system monitoring for real-time backups)
- `jq` (JSON parsing for config management)


---

## New / Modified Files

```text
actions/
├── addBackupTarget.ts       # NEW: Backup provider configuration (Security group)
├── manualBackup.ts          # NEW: Test backup trigger (Security group)
├── disableAutoUnlock.ts     # NEW: Auto-unlock toggle + password deletion (Security group)
├── aezeedCipherSeed.ts      # NEW: Seed view/confirm/delete (Security group)
├── confirmPasswordBackup.ts # NEW: Password confirm/delete (Security group)
├── walletPassword.ts        # NEW: Manual unlock & password change (Security group)
└── config/                  
    ├── watchtowerClient.ts  # MODIFIED: Enhanced Watchtower Client config  (Security group)
    └── watchtowerServer.ts  # MODIFIED: Enhanced Watchtower Server config  (Security group)

fileModels/
├── store.json.ts            # MODIFIED: Added security/backup state fields with .catch() defaults
└── custom-config.json.ts    # NEW: Isolated channel backup settings schema

init/
└── seedFiles.ts             # MODIFIED: Handles wallet state sync on upgrade/install

/
├── Dockerfile               # NEW: Wallet state (with backward-compatible schema using .catch())
└── main.ts                  # MODIFIED: Added channel backup daemon and "Security status" health check
```
## Channels Backup Setup Examples

<h3>Channels auto-backup setup examples (tap to expand):</h3>
  <hr>
  <details>
  <summary id="email"><b>EMAIL</b></summary>
  <br>
  <div>In the example below, SMTP2GO is used as SMTP provider because the setup is straightforward and the service is free.</div>
  <br><table >
    <thead><tr><th>Step</th><th>Action</th></tr></thead>
    <tbody>
      <tr><td>1️⃣</td><td><b>Sign up</b> at <u><a href="https://www.smtp2go.com/" target="_blank">smtp2go.com</a></u> (Free: 1k emails/mo)</td></tr>
      <tr><td>2️⃣</td><td>Verify email → Log in at <u><a href="https://app.smtp2go.com/" target="_blank">app.smtp2go.com</a></u></td></tr>
      <tr><td>3️⃣</td><td><b>Sending → Verified Senders</b>: Add &amp; verify your "From" email</td></tr>
      <tr><td>4️⃣</td><td><b>Sending → SMTP Users → Add SMTP User</b>: Create &amp; save username &amp; password</td></tr>
      <tr><td>5️⃣</td><td>Return to Channels - Auto-Backup: Enable Email as backup provider &amp; enter config:<br>
        <b>Sender Address:</b> Use your SMTP2GO "Single sender emails" address. See step 3.<br>
        <b>Recipient Address:</b> Add at least two addresses and try to mix email providers. Example: <code>youremail@proton.me, youremail@gmail.com, familymemberemail@gmail.com, friendemail@gmail.com</code><br>
        <b>SMTP Server:</b> <code>mail.smtp2go.com</code><br>
        <b>SMTP Port:</b> <code>465</code> (SSL) or <code>587</code> (TLS)<br>
        <b>SMTP Username:</b> See step 4.<br>
        <b>SMTP Password:</b> See step 4.</td></tr>
      <tr><td>6️⃣</td><td>Click <b>Submit</b> → Run <b>Channels: Test Auto-Backup</b></td></tr>
    </tbody>
  </table>
  <br>
    <div>💡 Any SMTP provider works! We recommend SMTP2GO, MailerSend, or Gmail (all free).</div>
    <br><table>
    <thead>
      <tr><th>✅ Recommended SMTP Providers</th></tr>
    </thead>
    <tbody>
      <tr><td><b>SMTP2Go</b> ⇢ <u><a href="https://www.smtp2go.com/" target="_blank">smtp2go.com 🔗</a></u><br/>– Free tier: 1,000 emails/month, no domain required.<br/>– SMTP server: <code>mail.smtp2go.com</code>, port 465 or 587.</td></tr>
      <tr><td><b>MailerSend</b> ⇢ <u><a href="https://www.mailersend.com/" target="_blank">mailersend.com 🔗</a></u><br/>– Free tier: 500 emails/month, no domain required.<br/>– Use your <b>verified email</b> as "From" address.</td></tr>
      <tr><td><b>Gmail</b> ⇢ <u><a href="https://mail.google.com/" target="_blank">mail.google.com 🔗</a></u><br/>– Free tier: 500 emails/day, requires App Password (2FA must be ON).<br/>⚠️ Emails can <b>only be sent to @gmail.com addresses</b> unless you verify a custom "From" address.</td></tr>
      <tr><td><b>Proton Mail</b> ⇢ <u><a href="https://mail.proton.me/" target="_blank">mail.proton.me 🔗</a></u><br/>– Free tier: NONE, smtp access requires <b>paid plan</b>.<br/>– SMTP server: <code>smtp.proton.me</code>, port 465 or 587.</td></tr>
     </tbody>
  </table>
</details>
<hr>
<details>
  <summary id="sftp"><b>SFTP</b></summary>
    <br><table>
    <thead><tr><th>Step</th><th>Action</th></tr></thead>
    <tbody>
      <tr><td>1️⃣</td><td><b>Choose a remote server / LAN computer</b> (desktop, laptop, Raspberry Pi, or NAS) that stays powered on.</td></tr>
      <tr><td>2️⃣</td><td><b>Check &amp; install SSH/SFTP server (if missing)</b>:<br>
        – <b>Linux (Ubuntu/Debian)</b>:<br>
          &nbsp;&nbsp;• Check: <code>sudo systemctl is-active ssh</code><br>
          &nbsp;&nbsp;• If <code>inactive</code>, run:<br>
          &nbsp;&nbsp;&nbsp;&nbsp;<code>sudo apt update && sudo apt install openssh-server</code><br>
          &nbsp;&nbsp;&nbsp;&nbsp;<code>sudo systemctl enable --now ssh</code><br>
        – <b>macOS</b>:<br>
          &nbsp;&nbsp;• Go to <b>System Settings → Sharing</b> → enable <b>Remote Login</b><br>
        – <b>Windows</b>:<br>
          &nbsp;&nbsp;• Check: Open <b>Services</b> → look for "OpenSSH SSH Server" (should be "Running")<br>
          &nbsp;&nbsp;• If missing: <b>Settings → Apps → Optional Features → Add → OpenSSH Server</b><br>
          &nbsp;&nbsp;• Then in **PowerShell as Admin**:<br>
          &nbsp;&nbsp;&nbsp;&nbsp;<code>Start-Service sshd; Set-Service -Name sshd -StartupType 'Automatic'</code>
      </td></tr>
      <tr><td>3️⃣</td><td><b>Find the IP address</b>:<br>
        – Linux/macOS: run <code>ip a</code> (look for <code>inet</code> under <code>wlan0</code> or <code>eth0</code>)<br>
        – Windows: run <code>ipconfig</code> in Command Prompt (look for "IPv4 Address")
      </td></tr>
      <tr><td>4️⃣</td><td><b>Choose authentication</b>:<br>
        – ✅ <b>Password (recommended for beginners)</b>:<br>
          &nbsp;&nbsp;• Leave <b>"SFTP Private Key"</b> blank<br>
          &nbsp;&nbsp;• Enter your login password in <b>"SFTP Password"</b><br>
        – 🔑 <b>SSH Key (advanced)</b>:<br>
          &nbsp;&nbsp;• <b>How to generate a key (if you don't have one):</b><br>
          &nbsp;&nbsp;&nbsp;&nbsp;– <b>Linux / macOS</b>:<br>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<code>ssh-keygen -t ed25519 -C "lnd-backup" -f ~/.ssh/lnd_backup</code><br>
          &nbsp;&nbsp;&nbsp;&nbsp;– <b>Windows (PowerShell)</b>:<br>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<code>ssh-keygen -t ed25519 -C "lnd-backup" -f "$env:USERPROFILE\.ssh\lnd_backup"</code><br>
          &nbsp;&nbsp;• Your private key is at:<br>
          &nbsp;&nbsp;&nbsp;&nbsp;– Linux/macOS: <code>~/.ssh/lnd_backup</code><br>
          &nbsp;&nbsp;&nbsp;&nbsp;– Windows: <code>%USERPROFILE%\.ssh\lnd_backup</code><br>
          &nbsp;&nbsp;• <b>Paste the entire private key</b> (starts with <code>-----BEGIN OPENSSH PRIVATE KEY-----</code> and ends with <code>-----END ...</code>) into <b>"SFTP Private Key"</b><br>
          ⚠️ <b>Include every line</b> and <b>do not add extra spaces or line breaks at the end</b>.
      </td></tr>
      <tr><td>5️⃣</td><td><b>In LND SFTP Settings</b>:<br>
        <b>SFTP Host</b>: IP from Step 3 (e.g., <code>192.168.1.20</code>)<br>
        <b>SFTP Username</b>: Your login username (e.g., <code>user</code>, <code>admin</code>)<br>
        <b>SFTP Port</b>: <code>22</code> (default)<br>
        <b>SFTP Folder Path</b>: Path to the backup folder (e.g., <code>lnd-backups</code> or <code>subfolder/lnd-backups</code>). Use relative paths without a leading '/' to place it in your home directory.<br>
        → <b>Create this folder first</b> if it doesn't exist.
      </td></tr>
      <tr><td>6️⃣</td><td>Click <b>Submit</b>, then test with <b>"Test Channels Auto-Backup"</b>.</td></tr>
    </tbody>
  </table>
  💡 <b>Tip</b>: If backup fails, check: IP correctness, SSH running, firewall blocking port 22, folder permissions, or special characters in password.<br>
  💡 If your private key is **not fully saved**, try copying it again **without trailing newlines**—only the full key block.
</details>
<hr>
<details>
  <summary id="dropbox"><b>Dropbox</b></summary>
    <br><table>
    <thead><tr><th>Step</th><th>Action</th></tr></thead>
    <tbody>
      <tr><td>1️⃣</td><td>Go to <u><a href="https://www.dropbox.com/developers/apps" target="_blank">Dropbox App Console 🔗</a></u> → Create app (or use existing)</td></tr>
      <tr><td>2️⃣</td><td>Choose <b>Scoped access</b> → <b>App folder</b></td></tr>
      <tr><td>3️⃣</td><td>Give it a name → Create app</td></tr>
      <tr><td>4️⃣</td><td>Permissions → enable <code>files.content.write</code> and <code>files.content.read</code></td></tr>
      <tr><td>5️⃣</td><td>Copy <b>App key</b> (client_id) and <b>App secret</b> (client_secret)</td></tr>
      <tr><td>6️⃣</td><td>💡 If you already have Refresh Token just proceed to step 7.<br>
        <hr>Open your browser and paste this Dropbox OAuth 2 URL, replacing <b><i>APP_KEY</i></b> with your App key:<br><br>
        <i>https://www.dropbox.com/oauth2/authorize?client_id=APP_KEY&response_type=code&token_access_type=offline</i><br><br>
        <span>Log in to Dropbox → Allow the app: Copy the <b>Dropbox Authorization Code</b> from the URL (after ?code=) or from the page if displayed.</span><br></td></tr>
      <tr><td>7️⃣</td><td>In LND → Channels - Auto-Backup → Dropbox settings, paste:<ul><li><b>Dropbox App Key</b>: Your App key</li><li><b>Dropbox App Secret</b>: Your App secret</li><li><b>Dropbox Authorization Code</b>: The code from step 6 (fill only if you do NOT already have a Refresh Token)</li><li><b>Dropbox Refresh Token</b>: Paste your existing refresh token here if you have one OR leave empty → a new one will be generated automatically (Authorization Code is then required)</li></ul></td></tr>
      <tr><td>8️⃣</td><td>Folder path: enter new path or leave default <code>lnd-backups</code></td></tr>
      <tr><td>9️⃣</td><td>Click <b>Submit</b> → Provided settings will be exchanged for Dropbox Refresh Token automatically. Run <b>Channels - Test Auto-Backup</b>.</td></tr>
    </tbody>
  </table>
  </details>
<hr>
<details>
  <summary id="nextcloud"><b>Nextcloud</b></summary>
    <br><table>
    <thead><tr><th>Step</th><th>Action</th></tr></thead>
    <tbody>
      <tr><td>1️⃣</td><td><b>Log in</b> to your Nextcloud instance.</td></tr>
      <tr><td>2️⃣</td><td>Go to <b>Settings → Security → Devices &amp; sessions</b>.</td></tr>
      <tr><td>3️⃣</td><td>Under "App passwords", <b>create a new app password</b> (e.g., "LND Backup").</td></tr>
      <tr><td>4️⃣</td><td>Copy the generated password — you won't see it again!</td></tr>
      <tr><td>5️⃣</td><td>In LND Auto-Backup config, fill in:<br>
        <b>Nextcloud WebDAV URL:</b> <code>https://your-nextcloud.com/remote.php/dav/files/yourusername/</code> or <code>https://youronionaddress.onion/remote.php/dav/files/yourusername/</code><br>
        <b>Username:</b> Your Nextcloud login<br>
        <b>Password:</b> The app password from Step 3<br>
        <b>Folder Path:</b> <code>lnd-backups</code> (will be created automatically)</td></tr>
      <tr><td>6️⃣</td><td>Click <b>Submit</b> → Run <b>Channels - Test Auto-Backup</b>.</td></tr>
    </tbody>
  </table>
  💡 Ensure your Nextcloud server allows WebDAV access and isn't behind aggressive firewalls.
</details>
<hr>
<details>
  <summary id="google"><b>Google Drive</b></summary>
  <div><br><b>Works with FREE personal Google accounts!</b></div>
  <br>
  <div>Google Drive requires OAuth authorization. This is a 3-step process that takes about 2 minutes.</div>
    <br><table>
    <thead><tr><th>Step</th><th>Action</th></tr></thead>
    <tbody>
      <tr><td colspan="2"><h4>Part 1: Create OAuth Credentials (One-time setup)</h4></td></tr>
      <tr><td>1️⃣</td><td>Go to <u><a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console 🔗</a></u> → Create a <b>new project</b> (e.g., "lnd-backup").</td></tr>
      <tr><td>2️⃣</td><td>Enable the <b>Google Drive API</b>:<br>
        • Go to "APIs &amp; Services → Library"<br>
        • Search "Google Drive API"<br>
        • Click "Enable"</td></tr>
      <tr><td>3️⃣</td><td>Configure OAuth consent screen:<br>
        • Go to "APIs &amp; Services → OAuth consent screen"<br>
        • User Type: <b>External</b> → Create<br>
        • App name: <code>LND Backup</code><br>
        • User support email: Your email<br>
        • Developer contact: Your email<br>
        • Save and Continue through all screens<br>
        • On "Test users" screen: <b>Add your email as a test user</b><br>
        • Save and Continue</td></tr>
      <tr><td>4️⃣</td><td>Create OAuth credentials:<br>
        • Go to "APIs &amp; Services → Credentials"<br>
        • Click <b>"Create Credentials" → "OAuth client ID"</b><br>
        • Application type: <b>Desktop app</b><br>
        • Name: <code>LND Backup Client</code><br>
        • Click <b>Create</b></td></tr>
      <tr><td>5️⃣</td><td>Copy the <b>Client ID</b> and <b>Client Secret</b> shown in the popup. Paste them in the fields below.</td></tr>
      <tr><td colspan="2"><h4>Part 2: Get Authorization Code</h4></td></tr>
      <tr><td>1️⃣</td><td>To get the authorization code, edit this URL, replacing <b>CLIENT_ID</b> with your Client ID:<br>
      <i>https://accounts.google.com/o/oauth2/v2/auth?client_id=CLIENT_ID&redirect_uri=http://localhost&response_type=code&scope=https://www.googleapis.com/auth/drive&access_type=offline&prompt=consent</i><br>     
        </td></tr>
      <tr><td>2️⃣</td><td>After visiting the authorization URL and clicking "Allow" your browser will redirect to <code>http://localhost/?code=...</code> (this will fail to load, that's OK!). Copy the code from your browser's redirect URL. You can copy either:<br>
        • The full URL: <code>http://localhost/?code=4/0A...</code><br>
        • OR just the code: <code>4/0A...</code><br></td></tr>
      <tr><td>3️⃣</td><td>Paste the code (or full URL) into the <b>"Authorization Code"</b> field in the Google Drive settings below.</td></tr>
      <tr><td colspan="2"><h4>Part 3: Complete Setup</h4></td></tr>
      <tr><td>1️⃣</td><td>Click <b>Submit</b>. Your authorization code is automatically exchanged for permanent token. You only need to do this once! </td></tr>
      <tr><td>2️⃣</td><td>Run <b>Channels - Test Auto-Backup</b> </td></tr>
      <tr><td>3️⃣</td><td>Visit <u><a href="https://drive.google.com/" target="_blank">Google Drive 🔗</a></u> to confirm that channel.backup is there. If not, check the LND logs for error messages. </td></tr>
    </tbody>
  </table>
  <br>
  <div>💡 <b>Troubleshooting:</b></div>
  <ul>
    <li>If you see "access_blocked", make sure you added your email as a Test User in step 3 of part 1. </li>
    <li>If authorization fails, double-check you copied the complete authorization code</li>
    <li>The token lasts indefinitely with automatic refresh - you only authorize once</li>
  </ul>
</details>
  </details>

### Switching Back to the [StartOS LND](https://github.com/Start9Labs/lnd-startos):

If you decide to switch back to the **official Start9 LND package**, you **MUST** re-enable Auto-Unlock (wallet password must be present in `store.json`) **before** reinstalling the same LND version or upgrading to the newest release from the [upstream REPO](https://github.com/Start9Labs/lnd-startos/releases).

**Steps to Switch Back Safely:**
1. In this fork, go to **Actions → Security → Wallet - Auto-Unlock**.
2. Enable **Auto-Unlock** and enter your wallet password.
3. Wait for LND to restart and confirm the wallet is unlocked.
4. Only then proceed to reinstall/upgrade to the official LND package.

---

## Upstream Documentation

For general LND documentation, configuration details, and standard behavior not covered by this fork's specific features, please refer to the official upstream documentation:

  
## LND on StartOS

> **Upstream docs:** <https://docs.lightning.engineering/>
>
> Everything not listed in this document should behave the same as upstream
> LND. If a feature, setting, or behavior is not mentioned
> here, the upstream documentation is accurate and fully applicable.

A complete implementation of a Lightning Network node by [Lightning Labs](https://lightning.engineering/). See the [upstream repo](https://github.com/lightningnetwork/lnd) for general LND documentation.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Configuration Management](#configuration-management)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Actions (StartOS UI)](#actions-startos-ui)
- [Backups and Restore](#backups-and-restore)
- [Health Checks](#health-checks)
- [Dependencies](#dependencies)
- [Limitations and Differences](#limitations-and-differences)
- [What Is Unchanged from Upstream](#what-is-unchanged-from-upstream)
- [Contributing](#contributing)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

| Property      | Value                                    |
| ------------- | ---------------------------------------- |
| Image         | `lightninglabs/lnd` (upstream, unmodified) |
| Architectures | x86_64, aarch64                          |
| Entrypoint    | `lnd` (default upstream)                 |

## Volume and Data Layout

| Volume | Mount Point  | Purpose                                     |
| ------ | ------------ | ------------------------------------------- |
| `main` | `/root/.lnd` | All LND data (wallet, channels, DB, config) |

StartOS-specific files on the `main` volume:

| File                   | Purpose                                                                      |
| ---------------------- | ---------------------------------------------------------------------------- |
| `store.json`           | Persistent StartOS state (wallet password, restore flag, watchtower clients) |
| `tls.cert` / `tls.key` | StartOS-managed TLS certificates                                            |
| `lnd.conf`             | LND configuration (managed by StartOS actions)                               |

If using the `bitcoind` backend, the Bitcoin Core `main` volume is mounted read-only at `/mnt/bitcoin` for cookie authentication.

## Installation and First-Run Flow

1. On install, StartOS creates two **critical tasks**:
   - **Select a Bitcoin backend** (local Bitcoin Core or Neutrino)
   - **Initialize wallet** (start fresh, or migrate from Umbrel 1.x or another StartOS server)
2. TLS certificates are generated using StartOS's certificate system
3. The **Initialize Wallet** action generates a new wallet via the LND `/v1/genseed` and `/v1/initwallet` API. The 24-word Aezeed mnemonic is displayed **once** in the action result — it is **not stored**. The wallet password is saved to `store.json`
4. The wallet is **automatically unlocked** on every start via the `/v1/unlockwallet` API
5. If a Bitcoin Core backend is selected, StartOS creates a task on Bitcoin Core to **enable ZMQ**

Users never interact with `lncli create` or `lncli unlock` — StartOS handles both automatically.

## Configuration Management

LND is configured entirely through **StartOS actions** (see [Actions](#actions-startos-ui) below). Each configuration category has a dedicated action that writes to the `lnd.conf` file on the `main` volume.

| StartOS-Managed (via Actions) | Details                                                                |
| ----------------------------- | ---------------------------------------------------------------------- |
| Bitcoin backend selection     | `bitcoind` or `neutrino`                                               |
| General settings              | Alias, color, keysend, AMP, tor-only mode                             |
| Routing fees                  | Base fee, fee rate, timelock delta                                     |
| Channel settings              | Min/max size, wumbo, zero-conf, SCID alias, pending, circular route, closes |
| Autopilot                     | Enable/disable, max channels, allocation, channel size limits          |
| Performance                   | DB auto-compact, invoice cleanup, reconnect stagger, graph pruning     |
| Watchtower server             | Enable/disable, listen address                                         |
| Watchtower client             | Enable/disable, tower URIs                                             |

Settings **not** managed by StartOS (hardcoded):

| Setting                             | Value                   | Reason                           |
| ----------------------------------- | ----------------------- | -------------------------------- |
| `bitcoin.mainnet`                   | `true`                  | Only mainnet supported           |
| `tor.active`                        | `true`                  | Always routed through Tor        |
| `rpclisten`                         | `0.0.0.0:10009`         | Fixed gRPC listen address        |
| `restlisten`                        | `0.0.0.0:8080`          | Fixed REST listen address        |
| `listen`                            | `0.0.0.0:9735`          | Fixed peer listen address        |
| `rpcmiddleware.enable`              | `true`                  | Required for StartOS integration |
| `bitcoind.rpchost`                  | `bitcoind.startos:8332` | StartOS service networking       |
| `bitcoind.rpccookie`                | `/mnt/bitcoin/.cookie`  | Cookie auth via mounted volume   |
| `healthcheck.chainbackend.attempts` | `0`                     | Managed by StartOS health checks |

### Default Overrides

Only settings that **diverge from upstream LND defaults** are written to `lnd.conf` on install. All other settings are left unset, allowing LND to use its built-in defaults. This keeps `lnd.conf` minimal and avoids drift when upstream defaults change between versions.

| Setting                               | Upstream Default   | Our Default             | Reason                                                                                   |
| ------------------------------------- | ------------------ | ----------------------- | ---------------------------------------------------------------------------------------- |
| `accept-keysend`                      | Disabled           | Enabled                 | Keysend is widely expected by wallets and apps that interact with LND nodes              |
| `tor.skip-proxy-for-clearnet-targets` | `false` (tor-only) | `true` (allow clearnet) | Better performance by default; users can opt into tor-only via "Use Tor for all traffic" |

### Form Defaults and Footnotes

Configuration actions use a consistent pattern across number, text, and boolean fields:

- **`default: null`** — the field is empty (for numbers/text) or set to the middle "—" state (for tri-state booleans); if the user saves without changing the value, the key is omitted from `lnd.conf` and LND uses its upstream default
- **`footnote: "Default: <value>"`** — shows the upstream LND default persistently beneath the field, so the user knows what value applies when the field is left unset
- **`default: <value>`** — used only when we intentionally override the upstream default (e.g. `accept-keysend: true`); "reset defaults" restores our override, not the upstream value
- Optional booleans use `Value.triState` (true / false / null) rather than `Value.toggle` so the "null" middle state maps cleanly to "use the upstream default"

## Network Access and Interfaces

| Interface          | Port  | Protocol  | Purpose                            |
| ------------------ | ----- | --------- | ---------------------------------- |
| REST (LND Connect) | 8080  | HTTPS     | REST API, `lndconnect://` URIs     |
| gRPC (LND Connect) | 10009 | HTTPS     | gRPC API, `lndconnect://` URIs     |
| Peer               | 9735  | TCP (raw) | Lightning peer-to-peer connections |
| Watchtower         | 9911  | TCP (raw) | Watchtower server (when enabled)   |

The REST and gRPC interfaces export `lndconnect://` URIs with embedded macaroon credentials. The watchtower interface is only exposed when the watchtower server is enabled in configuration.

### External Address Advertisement

StartOS automatically manages how LND advertises itself to the Lightning Network. Addresses are resolved in the following priority order:

1. **Tor onion addresses** — always added to `externalip`
2. **Public domains** — if not using tor-only mode, added to `externalhosts`
3. **IPv4 addresses** — used as a fallback in `externalip` only when no public domains are available

This means LND can advertise via domain names (not just raw IPs) when the node has a public domain configured in StartOS.

## Actions (StartOS UI)

### Node Info

- **Name:** Node Info
- **Purpose:** Display node alias, pubkey, and peer URI(s)
- **Visibility:** Enabled
- **Availability:** Running only
- **Inputs:** None
- **Outputs:** Node alias (copyable), node ID (masked, copyable), node URI(s) (masked, copyable, QR)

### Watchtower Server Info

- **Name:** Watchtower Server Info
- **Purpose:** Display watchtower URI for sharing with peers
- **Visibility:** Conditional — disabled if watchtower server is not active
- **Availability:** Running only
- **Inputs:** None
- **Outputs:** Tower URI (masked, copyable, QR)

### General Settings

- **Name:** General Settings
- **Purpose:** Configure alias, color, keysend, AMP, tor-only mode
- **Visibility:** Enabled
- **Availability:** Any status
- **Inputs:** Alias (text, max 32 chars), color (hex), accept-keysend (tri-state, default: true), accept-amp (tri-state, default: null), use-tor-only (tri-state, default: false)
- **Outputs:** None

### Routing Fees

- **Name:** Routing Fees
- **Purpose:** Configure default fees and timelock delta for forwarded payments
- **Visibility:** Enabled
- **Availability:** Any status
- **Inputs:** Base fee (millisatoshi), fee rate (sats per million), timelock delta (blocks, min 18, max 2016)
- **Outputs:** None

### Channel Settings

- **Name:** Channel Settings
- **Purpose:** Configure channel acceptance policies including size limits, pending channel limits, and close behavior
- **Visibility:** Enabled
- **Availability:** Any status
- **Inputs:** Default channel confirmations, min/max channel size, wumbo channels (tri-state), option-scid-alias (tri-state), zero-conf (tri-state), max pending channels, allow circular route (tri-state), reject push (tri-state), coop close target (blocks)
- **Outputs:** None

### Autopilot Settings

- **Name:** Autopilot Settings
- **Purpose:** Enable/configure automatic channel management
- **Visibility:** Enabled
- **Availability:** Any status
- **Inputs:** Enable/disable union; when enabled: max channels, allocation (0–100%), min/max channel size, private (tri-state), min confirmations, confirmation target
- **Outputs:** None

### Bitcoin Backend

- **Name:** Bitcoin Backend
- **Purpose:** Select `bitcoind` or `neutrino` as the chain backend
- **Visibility:** Hidden (triggered as critical task on install)
- **Availability:** Any status
- **Inputs:** Select: bitcoind or neutrino
- **Outputs:** None

### Performance

- **Name:** Performance
- **Purpose:** Database compaction, invoice cleanup, and network efficiency settings
- **Visibility:** Enabled
- **Availability:** Any status
- **Inputs:** Auto-compact (tri-state), GC canceled invoices on startup (tri-state), GC canceled invoices live (tri-state), stagger initial reconnect (tri-state), ignore historical gossip (tri-state), strict graph pruning (tri-state)
- **Outputs:** None

### Watchtower Server

- **Name:** Watchtower Server
- **Purpose:** Enable/configure the watchtower server and select the external address to advertise
- **Visibility:** Enabled
- **Availability:** Any status
- **Inputs:** External IP selection (from available peer interface public addresses, or "none" to disable)
- **Outputs:** None

### Watchtower Client Settings

- **Name:** Watchtower Client Settings
- **Purpose:** Enable/configure watchtower client and add tower URIs
- **Visibility:** Enabled
- **Availability:** Any status
- **Inputs:** Enable/disable union; when enabled: list of watchtower URIs (`pubkey@host:9911`)
- **Outputs:** None

### Initialize Wallet

- **Name:** Initialize Wallet
- **Purpose:** Create a new wallet or migrate from Umbrel 1.x / another StartOS server
- **Visibility:** Hidden (triggered as critical task on install)
- **Availability:** Stopped only
- **Inputs:** Select variant: "Start Fresh" (no inputs), "Migrate from Umbrel" (host + password), or "Migrate from StartOS" (host + master password)
- **Outputs:** For fresh: 24-word Aezeed mnemonic (masked, copyable — shown once, not stored). For migration: success/failure message

### Reset Wallet Transactions

- **Name:** Reset Wallet Transactions
- **Purpose:** Rescan on-chain transactions from wallet birthday; useful for picking up missed transactions
- **Visibility:** Enabled
- **Availability:** Any status
- **Inputs:** None
- **Outputs:** None (restarts LND with `--reset-wallet-transactions`)

### Recreate Macaroons

- **Name:** Recreate Macaroons
- **Purpose:** Delete and regenerate all macaroon files
- **Visibility:** Enabled
- **Availability:** Any status
- **Inputs:** None
- **Outputs:** None
- **Warning:** May require restarting dependent services

## Backups and Restore

**Backed up:** The entire `main` volume, **excluding** files that are rebuilt automatically: `data/graph`, `data/chain/bitcoin/mainnet/channel.db`, `data/chain/bitcoin/mainnet/sphinxreplay.db`, `data/chain/bitcoin/mainnet/neutrino.db`, `data/chain/bitcoin/mainnet/block_headers.bin`, `data/chain/bitcoin/mainnet/reg_filter_headers.bin`, and `logs`.

**Restore behavior:** After restore, LND automatically runs `restorechanbackup` to request force-close of all channels from the Static Channel Backup. A persistent health check warning is displayed advising the user to sweep funds and reinstall LND fresh.

**Important:** Lightning Labs strongly recommends against continued use of a restored LND node. After recovery, sweep all on-chain funds to another wallet, uninstall LND, then reinstall fresh.

## Health Checks

| Check                      | Method                                                               | Grace Period | Messages                                                  |
| -------------------------- | -------------------------------------------------------------------- | ------------ | --------------------------------------------------------- |
| **LND Server**             | HTTPS `GET /v1/state` on port 8080 using the self-signed `tls.cert`  | Default      | Success: "LND is ready" / Starting: (no message, waiting) |
| **Network and Graph Sync** | `lncli getinfo` (synced_to_chain + synced_to_graph)                  | Default      | Synced / Syncing to chain / Syncing to graph / Starting   |
| **Node Reachability**      | Config check (conditional)                                           | N/A          | Disabled message if no external IP or hostname configured |
| **Backup Restoration**     | Conditional (after restore)                                          | N/A          | Warning to sweep funds and reinstall                      |

The LND Server check calls the REST `/v1/state` endpoint and returns `success` once the server replies with any valid state JSON. It is a stronger readiness signal than a bare port-listening check — the port binds before LND is actually ready to serve RPCs — so dependent services (like Mempool) that gate on this health check will wait until LND can answer API calls.

## Dependencies

| Dependency   | Required | Mounted Volume                          | Health Checks Required         | Purpose                                                        |
| ------------ | -------- | --------------------------------------- | ------------------------------ | -------------------------------------------------------------- |
| Bitcoin Core | Optional | `main` → `/mnt/bitcoin` (read-only)    | `sync-progress`, `bitcoind`    | Block data, transaction broadcasting via ZMQ + RPC cookie auth |
| Tor          | Optional | None                                    | None                           | Required when "Use Tor for all traffic" is enabled             |

When using Bitcoin Core as backend, LND requires the listed health checks to pass on Bitcoin Core before starting. LND uses cookie authentication via the mounted `.cookie` file.

LND can alternatively use **Neutrino** (built-in light client) with no Bitcoin Core dependency.

## Limitations and Differences

1. **Mainnet only** — testnet/regtest/signet are not available
2. **No `lncli create` or `lncli unlock`** — wallet lifecycle is fully automated by StartOS
3. **Configuration via actions only** — `lnd.conf` is managed by StartOS; manual edits will be overwritten by action defaults on mismatch
4. **Bitcoin Core cookie auth only** — `rpcuser`/`rpcpass` are explicitly removed; authentication uses the mounted `.cookie` file
5. **Tor is always active** — `tor.active=true` is hardcoded; clearnet-only operation is not supported
6. **Restored nodes should not be reused** — after backup restore, sweep funds and reinstall

## What Is Unchanged from Upstream

- Channel management (open, close, force-close, cooperative close)
- Payment sending and receiving (including keysend and AMP when enabled)
- Invoice creation and management
- On-chain wallet functionality
- Routing and forwarding
- Watchtower protocol (both server and client)
- Autopilot behavior
- All gRPC and REST API endpoints
- `lncli` command set (accessible via actions or container exec)
- BOLT specification compliance

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for build instructions and development workflow.

---

## Quick Reference for AI Consumers

```yaml
package_id: lnd
upstream_version: see manifest dockerTag
image: lightninglabs/lnd
architectures: [x86_64, aarch64]
volumes:
  main: /root/.lnd
ports:
  control: 8080
  grpc: 10009
  peer: 9735
  watchtower: 9911
dependencies:
  - bitcoind (optional)
  - tor (optional)
startos_managed_env_vars: []
startos_managed_files:
  - lnd.conf
  - store.json
  - tls.cert
  - tls.key
actions:
  - general
  - routing-fees-config
  - channels-config
  - autopilot-config
  - backend-config
  - performance-config
  - watchtower-server-config
  - watchtower-client-config
  - node-info
  - tower-info
  - initialize-wallet
  - reset-wallet-transactions
  - recreate-macaroons
health_checks:
  - lnd_state: https GET /v1/state on 8080 (self-signed cert from tls.cert)
  - lncli_getinfo: synced_to_chain, synced_to_graph
  - reachability: conditional
backup_volumes:
  - main (excluding data/graph, channel.db, sphinxreplay.db, neutrino.db, block_headers.bin, reg_filter_headers.bin, logs)
```
