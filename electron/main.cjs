const { app, BrowserWindow, ipcMain, net, protocol, screen, shell } = require("electron");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const DEFAULT_SETTINGS = {
  includeDocuments: true,
  includeDownloads: true,
  dailyGoal: 12,
  minAgeDays: 7
};

const MAX_SCAN_FILES = 12000;
const MAX_SCAN_DEPTH = 8;
const MAX_TRASH_BATCH = 20;
const PREVIEW_SCHEME = "swipetrash-file";
const DEFAULT_DEV_SERVER_URL = "http://127.0.0.1:5173";
const SAFE_DEV_SERVER_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

const SKIPPED_DIR_NAMES = new Set([
  "node_modules",
  "__macosx",
  ".gradle",
  ".m2",
  ".next",
  ".nuxt",
  ".yarn",
  "assets",
  "bin",
  "build",
  "crash-reports",
  "dist",
  "gradle",
  "indexes",
  "install",
  "installs",
  "library",
  "libraries",
  "application support",
  "applications",
  "logs",
  "mods",
  "objects",
  "packages",
  "resourcepacks",
  "resources",
  "runtime",
  "runtimes",
  "saves",
  "shaderpacks",
  "src",
  "target",
  "cache",
  "caches",
  "contents",
  "system volume information",
  "vendor",
  "venv",
  ".venv",
  "env",
  ".git",
  ".svn",
  ".hg",
  "__pycache__"
]);

const SKIPPED_PATH_SEGMENTS = new Set([
  ".minecraft",
  "battle.net",
  "curseforge",
  "epic games",
  "minecraft",
  "minecraftinstances",
  "modrinth",
  "overwolf",
  "riot games",
  "steam",
  "steamapps"
]);

const SKIPPED_DIR_SUFFIXES = [
  ".app",
  ".bundle",
  ".framework",
  ".kext",
  ".photoslibrary",
  ".library",
  ".xcodeproj",
  ".xcworkspace",
  ".playground"
];

const SENSITIVE_EXTENSIONS = new Set([
  ".1pif",
  ".cer",
  ".crt",
  ".csr",
  ".db",
  ".env",
  ".key",
  ".kdbx",
  ".mobileprovision",
  ".p12",
  ".pem",
  ".pfx",
  ".sqlite",
  ".sqlite3",
  ".wallet"
]);

const SENSITIVE_WORDS = [
  "2fa",
  "assurance",
  "bank",
  "banque",
  "certificat",
  "certificate",
  "contrat",
  "facture",
  "iban",
  "identity",
  "identite",
  "impot",
  "invoice",
  "medical",
  "mot de passe",
  "passport",
  "passeport",
  "password",
  "rib",
  "sante",
  "secret",
  "tax"
];

const IMAGE_EXTENSIONS = new Set([".avif", ".bmp", ".gif", ".heic", ".jpeg", ".jpg", ".png", ".svg", ".tif", ".tiff", ".webp"]);
const VIDEO_EXTENSIONS = new Set([".avi", ".m4v", ".mkv", ".mov", ".mp4", ".mpeg", ".mpg", ".webm"]);
const AUDIO_EXTENSIONS = new Set([".aac", ".aiff", ".flac", ".m4a", ".mp3", ".ogg", ".wav"]);
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".csv",
  ".html",
  ".ics",
  ".js",
  ".json",
  ".log",
  ".md",
  ".rtf",
  ".tex",
  ".ts",
  ".txt",
  ".xml",
  ".yaml",
  ".yml"
]);
const ARCHIVE_EXTENSIONS = new Set([".7z", ".bz2", ".gz", ".rar", ".tar", ".tgz", ".zip"]);
const INSTALLER_EXTENSIONS = new Set([".dmg", ".iso", ".msi", ".pkg"]);
const DOCUMENT_EXTENSIONS = new Set([".doc", ".docx", ".key", ".numbers", ".pages", ".pdf", ".ppt", ".pptx", ".xls", ".xlsx"]);
const UNSAFE_PREVIEW_EXTENSIONS = new Set([".svg"]);

protocol.registerSchemesAsPrivileged([
  {
    scheme: PREVIEW_SCHEME,
    privileges: {
      secure: true,
      standard: true,
      stream: true,
      supportFetchAPI: true
    }
  }
]);

let stateCache;

const VISIBLE_APP_WIDTH = 650;
const VISIBLE_APP_HEIGHT = 720;
const INVISIBLE_SCREEN_WIDTH_MARGINS = 1;

class UserFacingError extends Error {}

function getDisplayCenter(display) {
  const { workArea } = display;
  return {
    x: workArea.x + workArea.width / 2,
    y: workArea.y + workArea.height / 2
  };
}

function getBoundsCenter(bounds) {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  };
}

function getShellWindowBounds(display = screen.getPrimaryDisplay(), center = getDisplayCenter(display)) {
  const { workArea } = display;
  const width = Math.round(workArea.width * (1 + INVISIBLE_SCREEN_WIDTH_MARGINS * 2) + VISIBLE_APP_WIDTH);
  const height = Math.min(VISIBLE_APP_HEIGHT, Math.round(workArea.height));
  return {
    x: Math.round(center.x - width / 2),
    y: Math.round(center.y - height / 2),
    width,
    height
  };
}

function getVisibleWindowBounds(display = screen.getPrimaryDisplay(), center = getDisplayCenter(display)) {
  const height = Math.min(VISIBLE_APP_HEIGHT, Math.round(display.workArea.height));
  return {
    x: Math.round(center.x - VISIBLE_APP_WIDTH / 2),
    y: Math.round(center.y - height / 2),
    width: VISIBLE_APP_WIDTH,
    height
  };
}

function getVisibleSurfaceBounds(window) {
  const bounds = window.getBounds();
  const surfaceWidth = bounds.width <= 620 ? bounds.width : Math.min(VISIBLE_APP_WIDTH, Math.max(320, bounds.width - 80));
  const surfaceHeight = Math.min(VISIBLE_APP_HEIGHT, bounds.height);
  return {
    x: bounds.x + (bounds.width - surfaceWidth) / 2,
    y: bounds.y + (bounds.height - surfaceHeight) / 2,
    width: surfaceWidth,
    height: surfaceHeight
  };
}

function pointInsideBounds(point, bounds) {
  return point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
}

function installTransparentClickThrough(window) {
  let isIgnoringMouse = false;
  let interval = null;

  const updateMouseMode = () => {
    if (window.isDestroyed()) {
      return;
    }

    const cursor = screen.getCursorScreenPoint();
    const shouldIgnoreMouse = !pointInsideBounds(cursor, getVisibleSurfaceBounds(window));
    if (shouldIgnoreMouse === isIgnoringMouse) {
      return;
    }

    isIgnoringMouse = shouldIgnoreMouse;
    window.setIgnoreMouseEvents(shouldIgnoreMouse, { forward: true });
  };

  const startTracking = () => {
    if (window.isDestroyed()) {
      return;
    }

    isIgnoringMouse = false;
    window.setIgnoreMouseEvents(false, { forward: true });
    setTimeout(updateMouseMode, 320);
    interval ??= setInterval(updateMouseMode, 60);
  };

  window.once("closed", () => {
    if (interval) {
      clearInterval(interval);
    }
  });
  window.on("show", startTracking);
  window.on("focus", startTracking);
  window.on("move", updateMouseMode);
}

function installDisplayAwareShellSizing(window) {
  let resizeTimer = null;

  const syncToCurrentDisplay = () => {
    if (window.isDestroyed()) {
      return;
    }

    const currentBounds = window.getBounds();
    const center = getBoundsCenter(currentBounds);
    const display = screen.getDisplayNearestPoint(center);
    const nextBounds = getShellWindowBounds(display, center);
    const widthChanged = Math.abs(currentBounds.width - nextBounds.width) > 1;
    const heightChanged = Math.abs(currentBounds.height - nextBounds.height) > 1;
    if (!widthChanged && !heightChanged) {
      return;
    }

    window.setBounds(nextBounds, false);
  };

  const scheduleSync = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(syncToCurrentDisplay, 180);
  };

  window.on("move", scheduleSync);
  screen.on("display-added", scheduleSync);
  screen.on("display-removed", scheduleSync);
  screen.on("display-metrics-changed", scheduleSync);
  window.once("closed", () => {
    clearTimeout(resizeTimer);
    screen.off("display-added", scheduleSync);
    screen.off("display-removed", scheduleSync);
    screen.off("display-metrics-changed", scheduleSync);
  });
}

function createWindow() {
  const isMac = process.platform === "darwin";
  const isWindows = process.platform === "win32";
  const bounds = isMac ? getShellWindowBounds() : getVisibleWindowBounds();
  const mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 420,
    minHeight: 520,
    backgroundColor: isMac ? "#00000000" : "#f6f4ef",
    transparent: isMac,
    frame: !isMac,
    hasShadow: !isMac,
    show: false,
    vibrancy: undefined,
    visualEffectState: isMac ? "active" : undefined,
    title: "SwipeTrash",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: !app.isPackaged || process.env.SWIPETRASH_DEVTOOLS === "1"
    }
  });

  if (isWindows && typeof mainWindow.setBackgroundMaterial === "function") {
    mainWindow.setBackgroundMaterial("acrylic");
  }

  if (isMac) {
    installTransparentClickThrough(mainWindow);
    installDisplayAwareShellSizing(mainWindow);
  }

  let didShow = false;
  const showWindow = () => {
    if (didShow || mainWindow.isDestroyed()) {
      return;
    }
    didShow = true;
    if (isMac) {
      mainWindow.setBounds(bounds, false);
    }
    mainWindow.show();
    mainWindow.focus();
  };

  mainWindow.once("ready-to-show", showWindow);
  mainWindow.webContents.once("did-finish-load", () => {
    setTimeout(showWindow, 80);
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  } else {
    mainWindow.loadURL(getDevServerUrl());
    if (process.env.SWIPETRASH_DEVTOOLS === "1") {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  }
}

function getDevServerUrl() {
  const rawUrl = process.env.VITE_DEV_SERVER_URL || DEFAULT_DEV_SERVER_URL;
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "http:" || !SAFE_DEV_SERVER_HOSTS.has(parsed.hostname)) {
    throw new Error("Unsafe Vite dev server URL. Use a localhost HTTP URL.");
  }
  return parsed.toString();
}

function normalizeSettings(settings = {}) {
  return {
    includeDocuments: settings.includeDocuments !== false,
    includeDownloads: settings.includeDownloads !== false,
    dailyGoal: clampInteger(settings.dailyGoal, 12, 4, 40),
    minAgeDays: clampInteger(settings.minAgeDays, 7, 0, 365)
  };
}

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function loadState() {
  if (stateCache) {
    return stateCache;
  }

  const statePath = getStatePath();
  try {
    const raw = await fs.readFile(statePath, "utf8");
    const parsed = JSON.parse(raw);
    stateCache = {
      version: 1,
      settings: normalizeSettings(parsed.settings || DEFAULT_SETTINGS),
      reviewed: parsed.reviewed && typeof parsed.reviewed === "object" ? parsed.reviewed : {},
      days: parsed.days && typeof parsed.days === "object" ? parsed.days : {},
      totals: normalizeTotals(parsed.totals)
    };
  } catch {
    stateCache = {
      version: 1,
      settings: DEFAULT_SETTINGS,
      reviewed: {},
      days: {},
      totals: normalizeTotals()
    };
  }

  return stateCache;
}

async function saveState() {
  if (!stateCache) {
    return;
  }

  const statePath = getStatePath();
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(stateCache, null, 2), "utf8");
}

function getStatePath() {
  return path.join(app.getPath("userData"), "swipetrash-state.json");
}

function getConfiguredRoots(settings) {
  const roots = [];

  if (settings.includeDocuments) {
    roots.push({ label: "Documents", path: app.getPath("documents") });
  }
  if (settings.includeDownloads) {
    roots.push({ label: "Downloads", path: app.getPath("downloads") });
  }

  return roots;
}

function isInsideRoot(filePath, roots) {
  const resolved = path.resolve(filePath);
  return roots.some((root) => {
    const resolvedRoot = path.resolve(root.path);
    return resolved === resolvedRoot || resolved.startsWith(`${resolvedRoot}${path.sep}`);
  });
}

function shouldSkipDirectory(name, directoryPath = "") {
  const lower = name.toLowerCase();
  return (
    name.startsWith(".") ||
    SKIPPED_DIR_NAMES.has(lower) ||
    SKIPPED_PATH_SEGMENTS.has(lower) ||
    SKIPPED_DIR_SUFFIXES.some((suffix) => lower.endsWith(suffix)) ||
    hasSkippedPathSegment(directoryPath)
  );
}

function shouldSkipFile(name, filePath = "") {
  const lower = name.toLowerCase();
  const extension = path.extname(lower);
  return (
    name.startsWith(".") ||
    !extension ||
    isHashLikeName(lower, extension) ||
    hasSkippedPathSegment(filePath) ||
    SENSITIVE_EXTENSIONS.has(extension) ||
    SENSITIVE_WORDS.some((word) => lower.includes(word))
  );
}

function hasSkippedPathSegment(filePath) {
  if (!filePath) {
    return false;
  }

  return path
    .resolve(filePath)
    .split(path.sep)
    .map((segment) => segment.toLowerCase())
    .some((segment) => SKIPPED_PATH_SEGMENTS.has(segment));
}

function isHashLikeName(name, extension) {
  const stem = extension ? name.slice(0, -extension.length) : name;
  return /^[a-f0-9]{16,}$/i.test(stem) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stem);
}

function classifyFile(extension) {
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  if (AUDIO_EXTENSIONS.has(extension)) return "audio";
  if (TEXT_EXTENSIONS.has(extension)) return "text";
  if (ARCHIVE_EXTENSIONS.has(extension)) return "archive";
  if (INSTALLER_EXTENSIONS.has(extension)) return "installer";
  if (extension === ".pdf") return "pdf";
  if (DOCUMENT_EXTENSIONS.has(extension)) return "document";
  return "other";
}

function clutterScore(name, extension, rootLabel, ageDays, kind) {
  const lower = name.toLowerCase();
  let score = 0;
  const reasons = [];

  if (rootLabel === "Downloads") {
    score += 1;
    reasons.push("Download");
  }
  if (kind === "installer") {
    score += 4;
    reasons.push("Installer");
  }
  if (kind === "archive") {
    score += 3;
    reasons.push("Archive");
  }
  if (lower.includes("screenshot") || lower.includes("capture d’écran") || lower.includes("capture d'ecran")) {
    score += 3;
    reasons.push("Screenshot");
  }
  if (/\(\d+\)| copy| copie| duplicate| doublon/.test(lower)) {
    score += 2;
    reasons.push("Likely duplicate");
  }
  if ([".tmp", ".download", ".crdownload", ".part"].includes(extension)) {
    score += 4;
    reasons.push("Temporary file");
  }
  if (ageDays >= 90) {
    score += 1;
    reasons.push("Old file");
  }

  return {
    score,
    reason: reasons.slice(0, 2).join(" · ") || "Old file"
  };
}

async function scanCandidates(settings, state) {
  const roots = getConfiguredRoots(settings);
  const candidates = [];
  const stats = {
    scanned: 0,
    filtered: 0,
    missingRoots: [],
    roots: roots.map((root) => root.label)
  };

  for (const root of roots) {
    try {
      const stat = await fs.stat(root.path);
      if (!stat.isDirectory()) {
        stats.missingRoots.push(root.label);
        continue;
      }
    } catch {
      stats.missingRoots.push(root.label);
      continue;
    }

    await walkDirectory(root.path, root, settings, state, candidates, stats, 0);
  }

  const selected = selectDailyCandidates(candidates, settings.dailyGoal * 3);
  await Promise.all(selected.map((candidate) => enrichCandidate(candidate)));

  return {
    candidates: selected,
    settings,
    stats,
    day: localDayKey(),
    dayStats: getDayStats(state),
    totals: getTotals(state)
  };
}

async function walkDirectory(directoryPath, root, settings, state, candidates, stats, depth) {
  if (depth > MAX_SCAN_DEPTH || stats.scanned >= MAX_SCAN_FILES) {
    return;
  }

  let entries;
  try {
    entries = await fs.readdir(directoryPath, { withFileTypes: true });
  } catch {
    stats.filtered += 1;
    return;
  }

  shuffle(entries);

  for (const entry of entries) {
    if (stats.scanned >= MAX_SCAN_FILES) {
      return;
    }

    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isSymbolicLink()) {
      stats.filtered += 1;
      continue;
    }

    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name, fullPath)) {
        stats.filtered += 1;
        continue;
      }
      await walkDirectory(fullPath, root, settings, state, candidates, stats, depth + 1);
      continue;
    }

    if (!entry.isFile()) {
      stats.filtered += 1;
      continue;
    }

    stats.scanned += 1;
    const candidate = await buildCandidate(fullPath, root, settings, state);
    if (candidate) {
      candidates.push(candidate);
    } else {
      stats.filtered += 1;
    }
  }
}

async function buildCandidate(filePath, root, settings, state) {
  const resolved = path.resolve(filePath);
  if (state.reviewed[resolved]) {
    return null;
  }

  const name = path.basename(resolved);
  if (shouldSkipFile(name, resolved)) {
    return null;
  }

  let stat;
  try {
    stat = await fs.stat(resolved);
  } catch {
    return null;
  }

  if (!stat.isFile() || stat.size <= 0) {
    return null;
  }

  const ageDays = Math.max(0, Math.floor((Date.now() - stat.mtimeMs) / 86_400_000));
  if (ageDays < settings.minAgeDays) {
    return null;
  }

  const extension = path.extname(name).toLowerCase();
  const kind = classifyFile(extension);
  if (kind === "other") {
    return null;
  }

  const score = clutterScore(name, extension, root.label, ageDays, kind);

  return {
    id: crypto.createHash("sha1").update(`${resolved}:${stat.mtimeMs}`).digest("hex").slice(0, 16),
    name,
    path: resolved,
    directory: path.dirname(resolved),
    rootLabel: root.label,
    extension: extension.replace(".", "").toUpperCase(),
    kind,
    size: stat.size,
    sizeLabel: formatBytes(stat.size),
    modifiedAt: new Date(stat.mtimeMs).toISOString(),
    ageDays,
    reason: score.reason,
    score: score.score,
    previewUrl: previewUrlFor(resolved, kind),
    textPreview: ""
  };
}

async function enrichCandidate(candidate) {
  if (candidate.kind !== "text" || candidate.size > 1024 * 1024) {
    return candidate;
  }

  try {
    const handle = await fs.open(candidate.path, "r");
    const buffer = Buffer.alloc(Math.min(candidate.size, 18_000));
    await handle.read(buffer, 0, buffer.length, 0);
    await handle.close();
    candidate.textPreview = buffer.toString("utf8").replace(/\0/g, "").trim();
  } catch {
    candidate.textPreview = "";
  }

  return candidate;
}

function previewUrlFor(filePath, kind) {
  if (!["audio", "image", "pdf", "video"].includes(kind) || UNSAFE_PREVIEW_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
    return "";
  }

  const encoded = Buffer.from(filePath, "utf8").toString("base64url");
  return `${PREVIEW_SCHEME}://preview/${encodeURIComponent(encoded)}`;
}

function selectDailyCandidates(candidates, limit) {
  const likelyClutter = candidates.filter((candidate) => candidate.score >= 3);
  const ordinary = candidates.filter((candidate) => candidate.score < 3);
  shuffle(likelyClutter);
  shuffle(ordinary);

  const mixed = [];
  while (mixed.length < limit && (likelyClutter.length || ordinary.length)) {
    for (let i = 0; i < 3 && likelyClutter.length && mixed.length < limit; i += 1) {
      mixed.push(likelyClutter.pop());
    }
    if (ordinary.length && mixed.length < limit) {
      mixed.push(ordinary.pop());
    }
  }

  return mixed.filter(Boolean);
}

function formatBytes(bytes) {
  const units = ["o", "Ko", "Mo", "Go", "To"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: unitIndex === 0 ? 0 : 1 }).format(value)} ${units[unitIndex]}`;
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
  }
  return items;
}

function getDayStats(state) {
  const day = localDayKey();
  return {
    kept: 0,
    trashed: 0,
    trashedBytes: 0,
    ...(state.days[day] || {})
  };
}

function normalizeTotals(totals = {}) {
  return {
    trashed: Number.isFinite(totals.trashed) ? Math.max(0, totals.trashed) : 0,
    trashedBytes: Number.isFinite(totals.trashedBytes) ? Math.max(0, totals.trashedBytes) : 0
  };
}

function getTotals(state) {
  state.totals = normalizeTotals(state.totals);
  return state.totals;
}

function rememberDecision(state, filePath, action, size = 0) {
  const resolved = path.resolve(filePath);
  const day = localDayKey();
  const dayStats = getDayStats(state);
  const key = action === "trash" ? "trashed" : "kept";
  state.reviewed[resolved] = {
    action,
    at: new Date().toISOString(),
    day
  };
  state.days[day] = {
    ...dayStats,
    [key]: (dayStats[key] || 0) + 1,
    trashedBytes: action === "trash" ? (dayStats.trashedBytes || 0) + size : dayStats.trashedBytes || 0
  };

  if (action === "trash") {
    const totals = getTotals(state);
    totals.trashed += 1;
    totals.trashedBytes += size;
  }
}

async function playNativeTrashSound() {
  if (process.platform !== "darwin") {
    return false;
  }

  const candidates = [
    "/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/dock/drag to trash.aif",
    "/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/finder/move to trash.aif",
    "/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/finder/empty trash.aif"
  ];

  for (const soundPath of candidates) {
    try {
      await fs.access(soundPath);
      const child = spawn("/usr/bin/afplay", [soundPath], { detached: true, stdio: "ignore" });
      child.on("error", () => {});
      child.unref();
      return true;
    } catch {
      // Try the next installed system sound.
    }
  }

  return false;
}

function validateFilePath(filePath, settings) {
  if (typeof filePath !== "string" || !filePath) {
    throw new UserFacingError("Chemin invalide.");
  }

  const resolved = path.resolve(filePath);
  const roots = getConfiguredRoots(settings);
  if (!isInsideRoot(resolved, roots)) {
    throw new UserFacingError("Ce fichier n'est pas dans les sources autorisées.");
  }

  return resolved;
}

async function validateReviewableFilePath(filePath, settings) {
  const resolved = validateFilePath(filePath, settings);
  let stat;
  try {
    stat = await fs.lstat(resolved);
  } catch {
    throw new UserFacingError("Ce fichier n'est plus disponible.");
  }

  if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0) {
    throw new UserFacingError("Ce fichier ne peut pas être traité par SwipeTrash.");
  }

  const name = path.basename(resolved);
  if (shouldSkipFile(name, resolved)) {
    throw new UserFacingError("Ce fichier ne peut pas être traité par SwipeTrash.");
  }

  const kind = classifyFile(path.extname(name).toLowerCase());
  if (kind === "other") {
    throw new UserFacingError("Ce type de fichier n'est pas pris en charge.");
  }

  return { kind, resolved, stat };
}

function isPreviewableCandidate(filePath, kind) {
  return ["audio", "image", "pdf", "video"].includes(kind) && !UNSAFE_PREVIEW_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function publicErrorMessage(error, fallback) {
  return error instanceof UserFacingError ? error.message : fallback;
}

function registerPreviewProtocol() {
  protocol.handle(PREVIEW_SCHEME, async (request) => {
    try {
      const requestUrl = new URL(request.url);
      const encoded = decodeURIComponent(requestUrl.pathname.slice(1));
      const filePath = Buffer.from(encoded, "base64url").toString("utf8");
      const state = await loadState();
      const candidate = await validateReviewableFilePath(filePath, state.settings);
      if (!isPreviewableCandidate(candidate.resolved, candidate.kind)) {
        return new Response("Aperçu indisponible", { status: 404 });
      }
      return net.fetch(pathToFileURL(candidate.resolved).toString());
    } catch {
      return new Response("Aperçu indisponible", { status: 404 });
    }
  });
}

function registerIpcHandlers() {
  ipcMain.on("window:action", (event, action) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      return;
    }
    if (action === "close") {
      window.close();
      return;
    }
    if (action === "minimize") {
      window.minimize();
      return;
    }
    if (action === "zoom") {
      if (process.platform === "darwin") {
        const display = screen.getDisplayNearestPoint(getBoundsCenter(window.getBounds()));
        window.setBounds(getShellWindowBounds(display), true);
      } else if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  });

  ipcMain.handle("files:get-candidates", async (_event, requestedSettings = {}) => {
    const state = await loadState();
    state.settings = normalizeSettings({ ...state.settings, ...requestedSettings });
    await saveState();
    return scanCandidates(state.settings, state);
  });

  ipcMain.handle("files:record-keep", async (_event, filePath) => {
    const state = await loadState();
    const candidate = await validateReviewableFilePath(filePath, state.settings);
    rememberDecision(state, candidate.resolved, "keep");
    await saveState();
    return { ok: true, dayStats: getDayStats(state), totals: getTotals(state) };
  });

  ipcMain.handle("files:record-keep-always", async (_event, filePath) => {
    const state = await loadState();
    const candidate = await validateReviewableFilePath(filePath, state.settings);
    rememberDecision(state, candidate.resolved, "keep_always");
    await saveState();
    return { ok: true, dayStats: getDayStats(state), totals: getTotals(state) };
  });

  ipcMain.handle("files:forget-decision", async (_event, filePath) => {
    const state = await loadState();
    const resolved = validateFilePath(filePath, state.settings);
    if (state.reviewed[resolved]?.action === "keep" || state.reviewed[resolved]?.action === "keep_always") {
      delete state.reviewed[resolved];
      const day = localDayKey();
      if (state.days[day]) {
        state.days[day].kept = Math.max(0, (state.days[day].kept || 0) - 1);
      }
      await saveState();
    }
    return { ok: true, dayStats: getDayStats(state), totals: getTotals(state) };
  });

  ipcMain.handle("files:trash", async (_event, filePaths) => {
    const state = await loadState();
    const paths = Array.isArray(filePaths) ? filePaths.slice(0, MAX_TRASH_BATCH) : [];
    const results = [];
    let successCount = 0;

    for (const filePath of paths) {
      try {
        const candidate = await validateReviewableFilePath(filePath, state.settings);
        await shell.trashItem(candidate.resolved);
        rememberDecision(state, candidate.resolved, "trash", candidate.stat.size);
        successCount += 1;
        results.push({ path: candidate.resolved, ok: true });
      } catch (error) {
        results.push({
          path: typeof filePath === "string" ? filePath : "",
          ok: false,
          error: publicErrorMessage(error, "Impossible de déplacer ce fichier.")
        });
      }
    }

    const nativeSoundPlayed = successCount > 0 ? await playNativeTrashSound() : false;
    await saveState();
    return { results, dayStats: getDayStats(state), totals: getTotals(state), nativeSoundPlayed };
  });

  ipcMain.handle("files:open", async (_event, filePath) => {
    const state = await loadState();
    const candidate = await validateReviewableFilePath(filePath, state.settings);
    const error = await shell.openPath(candidate.resolved);
    return { ok: !error, error: error ? "Impossible d'ouvrir ce fichier." : "" };
  });

  ipcMain.handle("files:reveal", async (_event, filePath) => {
    const state = await loadState();
    const candidate = await validateReviewableFilePath(filePath, state.settings);
    shell.showItemInFolder(candidate.resolved);
    return { ok: true };
  });
}

app.whenReady().then(() => {
  registerPreviewProtocol();
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
