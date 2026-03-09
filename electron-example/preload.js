const { contextBridge, ipcRenderer } = require('electron');

// Mengekspos fungsi aman ke tampilan web (HTML)
contextBridge.exposeInMainWorld('electronAPI', {
  stopAlarm: () => ipcRenderer.send('stop-alarm')
});
