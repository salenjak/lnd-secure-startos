# Updating the upstream version

## Determining the upstream version

- **LND** — [lightningnetwork/lnd](https://github.com/lightningnetwork/lnd)
  - Latest release:
    ```sh
    gh release view -R lightningnetwork/lnd --json tagName -q .tagName
    ```
  - Current pin: `dockerTag` in `startos/manifest/index.ts` (`lightninglabs/lnd:v<version>`).

  GitHub releases are the source of truth. The `lightninglabs/lnd` image on Docker Hub may lag the GitHub release by a few minutes to hours; if a new tag isn't yet pullable, wait for Docker Hub to catch up before bumping.

## Applying the bump

- Bump `dockerTag` in `startos/manifest/index.ts` to `lightninglabs/lnd:v<new version>`.
