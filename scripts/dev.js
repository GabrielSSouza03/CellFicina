const { spawn, spawnSync } = require('node:child_process')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
process.env.NODE_ENV = 'development'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db'
process.env.API_PORT = process.env.API_PORT || '3456'

const built = spawnSync('npx', ['esbuild', 'src/electron/main.ts', 'src/electron/preload.ts', '--bundle', '--platform=node', '--outdir=dist-electron', '--external:electron', '--external:@prisma/client'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
if (built.status !== 0) process.exit(built.status || 1)

function run(command, args, { fatal = true } = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  })
  child.on('exit', (code) => {
    if (fatal && code && code !== 0) process.exit(code)
  })
  return child
}

const backend = run('npx', ['tsx', 'watch', 'src/backend/server.ts'])
const frontend = run('npx', ['vite'])

const wait = spawn('npx', ['wait-on', 'tcp:3456', 'tcp:5173'], { cwd: root, shell: process.platform === 'win32' })
wait.on('exit', (code) => {
  if (code !== 0) process.exit(code || 1)
  const electronArgs = ['.']
  if (process.platform === 'linux') electronArgs.push('--no-sandbox', '--disable-setuid-sandbox')
  run('npx', ['electron', ...electronArgs], { fatal: false })
})

function shutdown() {
  backend.kill()
  frontend.kill()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
