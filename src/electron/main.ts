import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import Module from 'node:module'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { loadEnv } from '../backend/database/env'

const execFileAsync = promisify(execFile)

// node_modules/electron/dist/chrome-sandbox is almost never root:4755 on Linux,
// and Chromium aborts instead of starting. Disable the SUID sandbox before ready.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox')
  app.commandLine.appendSwitch('disable-setuid-sandbox')
  app.commandLine.appendSwitch('disable-print-preview')
  app.commandLine.appendSwitch('disable-features', 'MediaRouter')
  process.env.GTK_PRINT_BACKEND = process.env.GTK_PRINT_BACKEND || 'cups,file'
}

loadEnv()

const isDev = !app.isPackaged

function configurePortableDataDir() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
  if (!portableDir) return
  app.setPath('userData', path.join(portableDir, 'data'))
}

configurePortableDataDir()

function userData() {
  const dir = app.getPath('userData')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function resolvePrismaResources() {
  if (isDev) return path.resolve(process.cwd(), 'database/prisma')
  return path.join(process.resourcesPath, 'prisma')
}

function resolvePackagedPrismaClientDir() {
  const candidates = [
    path.join(process.resourcesPath, 'prisma-client'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '.prisma', 'client'),
    path.join(__dirname, '..', 'node_modules', '.prisma', 'client'),
  ]
  return candidates.find((dir) => fs.existsSync(path.join(dir, 'package.json')) || fs.existsSync(path.join(dir, 'index.js')))
}

function prismaEngineName() {
  if (process.platform === 'win32') return ['query_engine-windows.dll.node']
  return [
    'libquery_engine-debian-openssl-3.0.x.so.node',
    'libquery_engine-linux-musl-openssl-3.0.x.so.node',
    'libquery_engine-linux-musl.so.node',
  ]
}

function configurePrismaRuntime() {
  if (isDev) return
  const clientDir = resolvePackagedPrismaClientDir()
  if (!clientDir) return

  const moduleAny = Module as unknown as { _resolveFilename: (request: string, ...args: unknown[]) => string }
  const originalResolve = moduleAny._resolveFilename
  moduleAny._resolveFilename = function hookedResolve(this: unknown, request: string, ...rest: unknown[]) {
    if (request === '.prisma/client' || request.startsWith('.prisma/client/')) {
      const suffix = request.replace(/^\.prisma\/client\/?/, '') || 'default'
      const base = path.join(clientDir, suffix)
      for (const candidate of [base, `${base}.js`, path.join(base, 'index.js'), path.join(base, 'default.js')]) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
      }
    }
    if (request === '@prisma/client/runtime/library.js' || request === '@prisma/client/runtime/library') {
      const file = path.join(clientDir, 'runtime', 'library.js')
      if (fs.existsSync(file)) return file
    }
    return originalResolve.call(this, request, ...rest)
  }

  for (const name of prismaEngineName()) {
    const engine = path.join(clientDir, name)
    if (fs.existsSync(engine)) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = engine
      break
    }
  }
}

async function startBackend() {
  configurePrismaRuntime()
  const dataDir = userData()
  const dbPath = path.join(dataDir, 'shoficina.db')
  process.env.APP_USER_DATA = dataDir
  process.env.DATABASE_URL = `file:${dbPath.replace(/\\/g, '/')}`
  process.env.API_PORT = process.env.API_PORT || '3456'
  process.env.PRISMA_RESOURCES = resolvePrismaResources()
  process.env.NODE_ENV = isDev ? 'development' : 'production'

  const { setLogDirectory } = await import('../backend/utils/logger')
  setLogDirectory(path.join(dataDir, 'logs'))

  const { getPrisma } = await import('../backend/database/client')
  const { runMigrations } = await import('../backend/database/migrate')
  const { seedIfEmpty } = await import('../backend/database/seed-runtime')
  const { startServer } = await import('../backend/app')
  const { API_PORT } = await import('../backend/database/paths')

  getPrisma()
  await runMigrations()
  await seedIfEmpty()
  return startServer(API_PORT)
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    title: 'CellFicina',
    icon: isDev
      ? path.resolve(process.cwd(), 'public/icon.png')
      : path.join(__dirname, '../dist/renderer/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (isDev) {
    void window.loadURL('http://127.0.0.1:5173')
  } else {
    const index = path.join(__dirname, '../dist/renderer/index.html')
    void window.loadURL(pathToFileURL(index).toString())
  }
  window.once('ready-to-show', () => window.show())
}

async function listCupsPrinters() {
  try {
    const { stdout } = await execFileAsync('lpstat', ['-a'], { timeout: 2500 })
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(/\s+/)[0])
      .filter(Boolean)
  } catch {
    return []
  }
}

async function printPdfOnLinux(pdfPath: string) {
  const printers = await listCupsPrinters()
  const extra = ['Abrir PDF para imprimir', 'Cancelar']
  const buttons = printers.length ? [...printers, ...extra] : extra
  const result = await dialog.showMessageBox({
    type: 'question',
    title: 'Imprimir ordem de serviço',
    message: printers.length ? 'Escolha a impressora' : 'Nenhuma impressora CUPS encontrada',
    detail: 'A busca de impressoras na rede (Avahi) foi ignorada para o diálogo não travar.',
    buttons,
    defaultId: 0,
    cancelId: buttons.length - 1,
    noLink: true,
  })
  const chosen = buttons[result.response]
  if (!chosen || chosen === 'Cancelar') return { canceled: true as const }
  if (chosen === 'Abrir PDF para imprimir') {
    const error = await shell.openPath(pdfPath)
    if (error) throw new Error(error)
    return { ok: true as const, via: 'pdf' }
  }
  await execFileAsync('lp', ['-d', chosen, '-o', 'media=A4', '-o', 'fit-to-page', pdfPath], { timeout: 20000 })
  return { ok: true as const, via: 'cups' }
}

async function renderPrintHtml(html: string) {
  const htmlPath = path.join(app.getPath('temp'), `os-print-${Date.now()}.html`)
  await fs.promises.writeFile(htmlPath, html, 'utf8')
  const printWin = new BrowserWindow({
    show: false,
    width: 794,
    height: 1123,
    autoHideMenuBar: true,
    webPreferences: { sandbox: true, contextIsolation: true },
  })
  try {
    await printWin.loadFile(htmlPath)
    await printWin.webContents.executeJavaScript(`
      Promise.all([...document.images].map((img) => img.complete ? null : new Promise((resolve) => {
        img.onload = img.onerror = () => resolve(null)
      })))
    `)
    return printWin
  } catch (error) {
    if (!printWin.isDestroyed()) printWin.close()
    throw error
  } finally {
    await fs.promises.unlink(htmlPath).catch(() => undefined)
  }
}

async function printHtmlDocument(html: string) {
  const printWin = await renderPrintHtml(html)
  try {
    if (process.platform === 'linux') {
      const pdf = await printWin.webContents.printToPDF({
        printBackground: true,
        landscape: false,
        pageSize: 'A4',
        preferCSSPageSize: true,
        margins: { marginType: 'none' },
      })
      const pdfPath = path.join(app.getPath('temp'), `os-${Date.now()}.pdf`)
      await fs.promises.writeFile(pdfPath, pdf)
      return printPdfOnLinux(pdfPath)
    }

    await new Promise<void>((resolve, reject) => {
      printWin.webContents.print({
        silent: false,
        printBackground: true,
        landscape: false,
        pageSize: 'A4',
        margins: { marginType: 'none' },
      }, (success, failureReason) => {
        if (success) resolve()
        else if (failureReason === 'cancelled') resolve()
        else reject(new Error(failureReason || 'Falha ao imprimir.'))
      })
    })
    return { ok: true as const, via: 'dialog' }
  } finally {
    if (!printWin.isDestroyed()) printWin.close()
  }
}

app.whenReady().then(async () => {
  ipcMain.on('api:url', (event) => {
    event.returnValue = `http://127.0.0.1:${process.env.API_PORT || 3456}`
  })
  ipcMain.handle('backup:save', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Exportar backup',
      defaultPath: `shoficina-backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: 'SQLite', extensions: ['db'] }],
    })
    return result.canceled ? null : result.filePath
  })
  ipcMain.handle('backup:open', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Restaurar backup',
      filters: [{ name: 'SQLite', extensions: ['db'] }],
      properties: ['openFile'],
    })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle('print:html', async (_event, html: string) => {
    if (typeof html !== 'string' || html.length < 20) throw new Error('Documento de impressão inválido.')
    return printHtmlDocument(html)
  })

  let closer: { close: () => Promise<void> } | undefined
  if (!isDev) {
    try {
      closer = await startBackend()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await dialog.showErrorBox('CellFicina', `Não foi possível iniciar o sistema.\n\n${message}`)
      app.quit()
      return
    }
  } else {
    process.env.APP_USER_DATA = userData()
  }

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
  app.on('before-quit', async () => {
    if (closer) await closer.close()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
