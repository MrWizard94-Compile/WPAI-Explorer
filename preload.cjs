const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wpaiDesktop', {
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath)
});
