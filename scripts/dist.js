const { spawnSync } = require('node:child_process')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const target = process.argv[2] || 'all'

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
    },
  })
  if (result.status !== 0) process.exit(result.status || 1)
}

function hasWine() {
  return (
    spawnSync('wine64', ['--version'], { encoding: 'utf8' }).status === 0
    || spawnSync('wine', ['--version'], { encoding: 'utf8' }).status === 0
  )
}

run('node', ['scripts/prepare-pack.js'])
run('npm', ['run', 'build'])

const onWindows = process.platform === 'win32'
const wine = hasWine()
const builder = ['electron-builder', '--x64', '--publish', 'never']

if (target === 'win' || target === 'all') {
  if (onWindows || wine) {
    builder.push('--win', 'portable', '--win', 'nsis')
  } else {
    console.log('Wine não encontrado neste Linux. Gerando ZIP do Windows (extraia e execute CellFicina.exe).')
    console.log('Para um único .exe portátil, rode npm run dist:win no Windows ou use o workflow do GitHub Actions.')
    builder.push('--win', 'zip', '--config.win.signAndEditExecutable=false')
  }
}

if (target === 'linux' || target === 'all') {
  if (process.platform === 'linux' || process.platform === 'darwin') {
    builder.push('--linux', 'AppImage', '--linux', 'tar.gz')
  } else if (target === 'linux') {
    console.error('O AppImage do Linux precisa ser gerado em uma máquina Linux.')
    process.exit(1)
  }
}

run('npx', builder)
console.log('\nArquivos gerados em release/')
