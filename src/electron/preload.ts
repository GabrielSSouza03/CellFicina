import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('shoficina', {
  getApiUrl: () => ipcRenderer.sendSync('api:url'),
  selectBackupPath: () => ipcRenderer.invoke('backup:save'),
  selectRestorePath: () => ipcRenderer.invoke('backup:open'),
  printHtml: (html: string) => ipcRenderer.invoke('print:html', html) as Promise<{ ok?: boolean; canceled?: boolean; via?: string }>,
})
