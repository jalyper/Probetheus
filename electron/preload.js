const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Storage API (replaces localStorage)
  storage: {
    get: (key) => ipcRenderer.invoke('storage:get', key),
    set: (key, value) => ipcRenderer.invoke('storage:set', key, value),
    remove: (key) => ipcRenderer.invoke('storage:remove', key),
    clear: () => ipcRenderer.invoke('storage:clear'),
    has: (key) => ipcRenderer.invoke('storage:has', key),
    keys: () => ipcRenderer.invoke('storage:keys'),
    getPath: () => ipcRenderer.invoke('storage:getPath')
  },
  
  // Environment info
  isElectron: true,
  platform: process.platform
});

// Also expose a fallback for web version detection
contextBridge.exposeInMainWorld('isElectronApp', true);

console.log('Preload script loaded - Electron API exposed');
