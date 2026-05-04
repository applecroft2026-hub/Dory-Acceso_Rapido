const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getApps: () => ipcRenderer.invoke('get-apps'),
  saveApps: (apps) => ipcRenderer.invoke('save-apps', apps),
  hideWindow: () => ipcRenderer.send('hide-window'),
  launchApp: (appPath) => ipcRenderer.send('launch-app', appPath),
  openImageDialog: () => ipcRenderer.invoke('dialog:openImage'),
  openExeDialog: () => ipcRenderer.invoke('dialog:openExe'),
  onWindowOpened: (callback) => ipcRenderer.on('window-opened', callback),
  removeWindowOpenedListener: () => ipcRenderer.removeAllListeners('window-opened')
});
