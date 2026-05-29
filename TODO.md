# TODO

- **Tor `skip-proxy-for-clearnet-targets` default (next release after :9 ships):**
  Once existing nodes have been primed with an explicit value, default it to `true`
  in the file model (`startos/fileModels/lnd.conf.ts` — change the `iniBoolean.transform((v) => v ?? false)`)
  and delete the install-only seed in `startos/init/seedFiles.ts`. The seed exists
  only so fresh installs get clearnet-direct without silently re-routing existing nodes;
  it's no longer needed once the model default itself is `true`.
