// Preload script to expose IPC safely
const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] Script loaded successfully');

try {
  // Expose ipcRenderer to the renderer process
  contextBridge.exposeInMainWorld('ipcRenderer', {
    send: (channel, ...args) => {
      console.log(`[Preload] IPC send: ${channel}`, args);
      return ipcRenderer.send(channel, ...args);
    },
    invoke: (channel, ...args) => {
      console.log(`[Preload] IPC invoke: ${channel}`, args);
      return ipcRenderer.invoke(channel, ...args);
    },
    on: (channel, func) => {
      console.log(`[Preload] IPC on: ${channel}`);
      return ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    removeListener: (channel, func) => {
      console.log(`[Preload] IPC removeListener: ${channel}`);
      return ipcRenderer.removeListener(channel, func);
    },
    removeAllListeners: (channel) => {
      console.log(`[Preload] IPC removeAllListeners: ${channel}`);
      return ipcRenderer.removeAllListeners(channel);
    }
  });
  
  console.log('[Preload] IPC exposed successfully to window.ipcRenderer');
} catch (error) {
  console.error('[Preload] Error exposing IPC:', error);
}
