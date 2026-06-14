const { contextBridge, ipcRenderer } = require("electron");

const MAX_TRASH_BATCH = 20;
const WINDOW_ACTIONS = new Set(["close", "minimize", "zoom"]);

function invokeWithPath(channel, filePath) {
  if (typeof filePath !== "string" || filePath.length === 0) {
    return Promise.reject(new TypeError("Invalid file path."));
  }
  return ipcRenderer.invoke(channel, filePath);
}

function normalizeSettings(settings = {}) {
  const input = settings && typeof settings === "object" ? settings : {};
  return {
    includeDocuments: input.includeDocuments !== false,
    includeDownloads: input.includeDownloads !== false,
    dailyGoal: clampInteger(input.dailyGoal, 12, 4, 40),
    minAgeDays: clampInteger(input.minAgeDays, 7, 0, 365)
  };
}

function normalizePathBatch(filePaths) {
  if (!Array.isArray(filePaths)) {
    return [];
  }
  return filePaths.filter((filePath) => typeof filePath === "string" && filePath.length > 0).slice(0, MAX_TRASH_BATCH);
}

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

contextBridge.exposeInMainWorld("swipeTrash", {
  getCandidates: (settings) => ipcRenderer.invoke("files:get-candidates", normalizeSettings(settings)),
  recordKeep: (filePath) => invokeWithPath("files:record-keep", filePath),
  forgetDecision: (filePath) => invokeWithPath("files:forget-decision", filePath),
  trashFiles: (filePaths) => ipcRenderer.invoke("files:trash", normalizePathBatch(filePaths)),
  openFile: (filePath) => invokeWithPath("files:open", filePath),
  revealFile: (filePath) => invokeWithPath("files:reveal", filePath),
  windowAction: (action) => {
    if (WINDOW_ACTIONS.has(action)) {
      ipcRenderer.send("window:action", action);
    }
  }
});
