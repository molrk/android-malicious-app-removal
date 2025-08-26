const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // ADB operations
  checkDevices: () => ipcRenderer.invoke('check-devices'),
  getDeviceInfo: (deviceId) => ipcRenderer.invoke('get-device-info', deviceId),
  startLogcat: (options) => ipcRenderer.invoke('start-logcat', options),
  stopLogcat: () => ipcRenderer.invoke('stop-logcat'),
  executeAdbCommand: (command) => ipcRenderer.invoke('execute-adb-command', command),
  saveLog: (content, filename) => ipcRenderer.invoke('save-log', content, filename),
  checkAdb: () => ipcRenderer.invoke('check-adb'),

  // Event listeners for logcat data
  onLogcatData: (callback) => {
    ipcRenderer.on('logcat-data', (event, data) => callback(data));
  },
  onLogcatError: (callback) => {
    ipcRenderer.on('logcat-error', (event, error) => callback(error));
  },
  onLogcatClosed: (callback) => {
    ipcRenderer.on('logcat-closed', (event, code) => callback(code));
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // Utility functions
  platform: process.platform,
  version: {
    node: process.versions.node,
    electron: process.versions.electron
  }
});