const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("swipeTrash", {
  getCandidates: (settings) => ipcRenderer.invoke("files:get-candidates", settings),
  recordKeep: (filePath) => ipcRenderer.invoke("files:record-keep", filePath),
  forgetDecision: (filePath) => ipcRenderer.invoke("files:forget-decision", filePath),
  trashFiles: (filePaths) => ipcRenderer.invoke("files:trash", filePaths),
  openFile: (filePath) => ipcRenderer.invoke("files:open", filePath),
  revealFile: (filePath) => ipcRenderer.invoke("files:reveal", filePath),
  setInteractiveRegion: (region) => ipcRenderer.send("window:set-interactive-region", region),
  setInteractionActive: (active) => ipcRenderer.send("window:set-interaction-active", active),
  setMouseEventsIgnored: (ignored) => ipcRenderer.send("window:set-ignore-mouse-events", ignored),
  windowAction: (action) => ipcRenderer.send("window:action", action)
});
