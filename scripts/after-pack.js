const fs = require('node:fs')
const path = require('node:path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') return
  const launcher = path.join(context.appOutDir, 'abrir-CellFicina.sh')
  fs.writeFileSync(launcher, `#!/usr/bin/env bash
cd "$(dirname "$(readlink -f "$0")")"
unset ELECTRON_RUN_AS_NODE
export ELECTRON_DISABLE_SANDBOX=1
exec ./CellFicina --no-sandbox "$@"
`)
  fs.chmodSync(launcher, 0o755)
}
