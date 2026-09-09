const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const buildDir = path.join(root, 'build')
const prismaSrc = path.join(root, 'node_modules', '.prisma', 'client')
const prismaAll = path.join(buildDir, 'pack', 'prisma-client-all')
const prismaDest = path.join(buildDir, 'pack', 'prisma-client')
const iconPng = path.join(root, 'public', 'icon.png')

function copyPrismaRuntime(dest) {
  const src = path.join(root, 'node_modules', '@prisma', 'client', 'runtime', 'library.js')
  const outDir = path.join(dest, 'runtime')
  fs.mkdirSync(outDir, { recursive: true })
  fs.copyFileSync(src, path.join(outDir, 'library.js'))
}

function copyPrismaClient() {
  if (!fs.existsSync(prismaSrc)) {
    throw new Error('Cliente Prisma não gerado. Rode npm run prisma:generate.')
  }
  fs.rmSync(prismaAll, { recursive: true, force: true })
  fs.mkdirSync(prismaAll, { recursive: true })
  for (const name of fs.readdirSync(prismaSrc)) {
    if (name.endsWith('.map') || name.endsWith('.d.ts') || name.includes('wasm')) continue
    fs.cpSync(path.join(prismaSrc, name), path.join(prismaAll, name), { recursive: true })
  }
  copyPrismaRuntime(prismaAll)
  fs.rmSync(prismaDest, { recursive: true, force: true })
  fs.cpSync(prismaAll, prismaDest, { recursive: true })
}

function prepareIcons() {
  fs.mkdirSync(buildDir, { recursive: true })
  fs.copyFileSync(iconPng, path.join(buildDir, 'icon.png'))
  const ico = path.join(buildDir, 'icon.ico')
  const converted = spawnSync('convert', [iconPng, '-define', 'icon:auto-resize=256,128,64,48,32,16', ico], {
    encoding: 'utf8',
  })
  if (converted.status !== 0 && !fs.existsSync(ico)) {
    console.warn('ImageMagick convert indisponível; o ícone .ico não foi gerado.')
  }
}

prepareIcons()
copyPrismaClient()
console.log('Recursos de empacotamento prontos em build/pack.')
