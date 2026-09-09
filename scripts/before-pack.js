const fs = require('node:fs')
const path = require('node:path')

const ENGINES = {
  win32: ['query_engine-windows.dll.node'],
  linux: ['libquery_engine-debian-openssl-3.0.x.so.node'],
}

exports.default = async function beforePack(context) {
  const root = context.packager.projectDir
  const full = path.join(root, 'build', 'pack', 'prisma-client-all')
  const dest = path.join(root, 'build', 'pack', 'prisma-client')
  const keepEngines = ENGINES[context.electronPlatformName] || Object.values(ENGINES).flat()
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  for (const name of fs.readdirSync(full)) {
    if (name.endsWith('.node') && !keepEngines.includes(name)) continue
    fs.cpSync(path.join(full, name), path.join(dest, name), { recursive: true })
  }
}
