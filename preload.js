const { contextBridge, ipcRenderer } = require('electron');

// Expose ONLY a small, safe PC control API via contextBridge.
// Locked actions (delete files, payments, passwords, install/uninstall) are NEVER exposed.
contextBridge.exposeInMainWorld('roseDesktop', {
  isConnected: () => true,
  getStatus: () => ipcRenderer.invoke('pc:status'),
  openAppOrUrl: (target) => ipcRenderer.invoke('pc:openExternal', target),
  typeTextOrKeys: (text) => ipcRenderer.invoke('pc:typeText', text),
  readOrOpenFile: (filePath) => ipcRenderer.invoke('pc:readFile', filePath),
  sendWhatsApp: (phone, text) => ipcRenderer.invoke('pc:sendWhatsApp', phone, text),
  sendMessenger: (name, text) => ipcRenderer.invoke('pc:sendMessenger', name, text),
  playMedia: (name) => ipcRenderer.invoke('pc:playMedia', name),
});
