const fs = require('node:fs')
const path = require('node:path')

exports.default = async function afterAllArtifactBuild(context) {
  const extras = []
  for (const name of fs.readdirSync(context.outDir)) {
    if (!name.endsWith('.AppImage')) continue
    const wrapper = path.join(context.outDir, name.replace(/\.AppImage$/, '-abrir.sh'))
    fs.writeFileSync(wrapper, `#!/usr/bin/env bash
HERE=$(cd "$(dirname "$(readlink -f "$0")")" && pwd)
unset ELECTRON_RUN_AS_NODE
export APPIMAGE_EXTRACT_AND_RUN=1
export ELECTRON_DISABLE_SANDBOX=1
exec "$HERE/${name}" "$@"
`)
    fs.chmodSync(wrapper, 0o755)
    extras.push(wrapper)
  }
  return extras
}
