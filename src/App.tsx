import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import {
  Check,
  Eye,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  Film,
  FolderOpen,
  HardDrive,
  Languages,
  Loader2,
  Minus,
  Monitor,
  Music,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Trash2,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FileCandidate, FileKind, LifetimeStats, ScanResult, ScanSettings, SwipeTrashApi } from "./types";

type Language = "en" | "fr" | "es";
type SwipeAction = "keep" | "trash";

const DEFAULT_SETTINGS: ScanSettings = {
  includeDocuments: true,
  includeDownloads: true,
  dailyGoal: 12,
  minAgeDays: 7
};

const SWIPE_EXIT_MS = 190;
const EMPTY_DAY = { kept: 0, trashed: 0, trashedBytes: 0 };
const EMPTY_TOTALS: LifetimeStats = { trashed: 0, trashedBytes: 0 };

const COPY = {
  en: {
    title: "Daily clean-up",
    goal: "Daily goal",
    settings: "Settings",
    scanning: "Scanning",
    done: "Done for today",
    empty: "Nothing to review",
    refresh: "Refresh",
    reveal: "Reveal in folder",
    preview: "Open preview",
    undo: "Undo",
    keep: "Keep",
    trash: "Trash",
    sources: "Sources",
    documents: "Documents",
    downloads: "Downloads",
    session: "Session",
    files: "Files",
    language: "Language",
    statistics: "Statistics",
    deletedFiles: "Files deleted",
    dataRemoved: "Data removed",
    todayDeleted: "Deleted today",
    lastScan: "Last scan",
    filtered: "Filtered",
    close: "Close",
    start: "Start",
    tutorialTitle: "Swipe to decide",
    tutorialBody: "Right keeps the file. Left moves it to the system trash immediately.",
    tutorialHint: "Use the two icons below for folder and preview.",
    moved: "Moved to trash.",
    kept: "Kept.",
    failedTrash: "Could not move this file to trash.",
    failedKeep: "Could not keep this file.",
    ageToday: "today",
    dayShort: "d",
    monthShort: "mo",
    yearShort: "y"
  },
  fr: {
    title: "Tri quotidien",
    goal: "Objectif du jour",
    settings: "Réglages",
    scanning: "Scan en cours",
    done: "Terminé pour aujourd'hui",
    empty: "Rien à trier",
    refresh: "Actualiser",
    reveal: "Afficher dans le dossier",
    preview: "Ouvrir l’aperçu",
    undo: "Annuler",
    keep: "Garder",
    trash: "Corbeille",
    sources: "Sources",
    documents: "Documents",
    downloads: "Téléchargements",
    session: "Session",
    files: "Fichiers",
    language: "Langue",
    statistics: "Statistiques",
    deletedFiles: "Fichiers supprimés",
    dataRemoved: "Données retirées",
    todayDeleted: "Supprimés aujourd’hui",
    lastScan: "Dernier scan",
    filtered: "Filtrés",
    close: "Fermer",
    start: "Commencer",
    tutorialTitle: "Swipe pour décider",
    tutorialBody: "À droite tu gardes. À gauche le fichier part directement dans la corbeille système.",
    tutorialHint: "Les deux icônes servent à ouvrir le dossier et prévisualiser.",
    moved: "Mis à la corbeille.",
    kept: "Gardé.",
    failedTrash: "Impossible de mettre ce fichier à la corbeille.",
    failedKeep: "Impossible de garder ce fichier.",
    ageToday: "aujourd'hui",
    dayShort: "j",
    monthShort: "mois",
    yearShort: "an"
  },
  es: {
    title: "Limpieza diaria",
    goal: "Objetivo diario",
    settings: "Ajustes",
    scanning: "Escaneando",
    done: "Listo por hoy",
    empty: "Nada que revisar",
    refresh: "Actualizar",
    reveal: "Mostrar en carpeta",
    preview: "Abrir vista previa",
    undo: "Deshacer",
    keep: "Conservar",
    trash: "Papelera",
    sources: "Fuentes",
    documents: "Documentos",
    downloads: "Descargas",
    session: "Sesión",
    files: "Archivos",
    language: "Idioma",
    statistics: "Estadísticas",
    deletedFiles: "Archivos eliminados",
    dataRemoved: "Datos retirados",
    todayDeleted: "Eliminados hoy",
    lastScan: "Último escaneo",
    filtered: "Filtrados",
    close: "Cerrar",
    start: "Empezar",
    tutorialTitle: "Desliza para decidir",
    tutorialBody: "Derecha conserva el archivo. Izquierda lo mueve a la papelera del sistema.",
    tutorialHint: "Los dos iconos sirven para abrir carpeta y previsualizar.",
    moved: "Movido a la papelera.",
    kept: "Conservado.",
    failedTrash: "No se pudo mover este archivo a la papelera.",
    failedKeep: "No se pudo conservar este archivo.",
    ageToday: "hoy",
    dayShort: "d",
    monthShort: "mes",
    yearShort: "año"
  }
} satisfies Record<Language, Record<string, string>>;

export default function App() {
  const api = useMemo(() => window.swipeTrash ?? createMockApi(), []);
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage());
  const t = COPY[language];
  const [settings, setSettings] = useState<ScanSettings>(DEFAULT_SETTINGS);
  const [files, setFiles] = useState<FileCandidate[]>([]);
  const [index, setIndex] = useState(0);
  const [undoEntry, setUndoEntry] = useState<{ file: FileCandidate; index: number } | null>(null);
  const [dayStats, setDayStats] = useState(EMPTY_DAY);
  const [totals, setTotals] = useState<LifetimeStats>(EMPTY_TOTALS);
  const [scanStats, setScanStats] = useState<ScanResult["stats"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => window.localStorage.getItem("swipetrash.onboarded") !== "1");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState({ active: false, startX: 0, x: 0 });
  const [flight, setFlight] = useState<{ action: SwipeAction; x: number } | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const didLoad = useRef(false);
  const decisionQueue = useRef<Promise<void>>(Promise.resolve());
  const lastIgnoredMouseEvents = useRef<boolean | null>(true);
  const interactionActive = useRef(false);

  const current = files[index] ?? null;
  const reviewedToday = dayStats.kept + dayStats.trashed;
  const progress = Math.min(100, Math.round((reviewedToday / Math.max(settings.dailyGoal, 1)) * 100));
  const canUndo = Boolean(undoEntry && undoEntry.index === index - 1 && !acting);

  const loadDeck = useCallback(
    async (nextSettings: ScanSettings) => {
      setLoading(true);
      setError("");
      try {
        const result = await api.getCandidates(nextSettings);
        setSettings(result.settings);
        setFiles(result.candidates);
        setIndex(0);
        setUndoEntry(null);
        setDayStats(result.dayStats);
        setTotals(result.totals);
        setScanStats(result.stats);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Scan failed.");
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  useEffect(() => {
    if (didLoad.current) {
      return;
    }
    didLoad.current = true;
    void loadDeck(DEFAULT_SETTINGS);
  }, [loadDeck]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timeout = window.setTimeout(() => setNotice(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    interactionActive.current = drag.active || Boolean(flight);
    api.setInteractionActive?.(interactionActive.current);
  }, [api, drag.active, flight]);

  useEffect(() => {
    if (!api.setInteractiveRegion) {
      return;
    }

    const updateRegion = () => {
      const surface = surfaceRef.current;
      if (!surface) {
        return;
      }
      const rect = surface.getBoundingClientRect();
      api.setInteractiveRegion?.({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      });
    };

    updateRegion();
    const resizeObserver = new ResizeObserver(updateRegion);
    if (surfaceRef.current) {
      resizeObserver.observe(surfaceRef.current);
    }
    window.addEventListener("resize", updateRegion);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateRegion);
    };
  }, [api]);

  useEffect(() => {
    if (!api.setMouseEventsIgnored) {
      return;
    }

    const setIgnored = (ignored: boolean) => {
      if (lastIgnoredMouseEvents.current === ignored) {
        return;
      }
      lastIgnoredMouseEvents.current = ignored;
      api.setMouseEventsIgnored?.(ignored);
    };

    const onMouseMove = (event: MouseEvent) => {
      const surface = surfaceRef.current;
      if (!surface) {
        setIgnored(false);
        return;
      }
      if (interactionActive.current) {
        setIgnored(false);
        return;
      }
      const rect = surface.getBoundingClientRect();
      const isInsideSurface =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      setIgnored(!isInsideSurface);
    };
    const onMouseLeave = () => setIgnored(true);

    window.addEventListener("mousemove", onMouseMove, { capture: true });
    window.addEventListener("pointermove", onMouseMove, { capture: true });
    window.addEventListener("mouseleave", onMouseLeave);
    setIgnored(true);

    return () => {
      window.removeEventListener("mousemove", onMouseMove, { capture: true });
      window.removeEventListener("pointermove", onMouseMove, { capture: true });
      window.removeEventListener("mouseleave", onMouseLeave);
      setIgnored(false);
    };
  }, [api]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, input, select, textarea, [role='dialog']")) {
        return;
      }
      if (event.key === "ArrowLeft") {
        void decide("trash");
      }
      if (event.key === "ArrowRight") {
        void decide("keep");
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        void undo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function decide(action: SwipeAction) {
    if (!current || acting) {
      return;
    }

    const file = current;
    const actionIndex = index;
    const releaseX = drag.active ? drag.x : 0;
    setActing(true);
    setFlight({ action, x: releaseX });
    setDrag({ active: false, startX: 0, x: 0 });

    await delay(SWIPE_EXIT_MS);
    setIndex((previous) => previous + 1);
    setFlight(null);
    setActing(false);

    decisionQueue.current = decisionQueue.current.catch(() => undefined).then(async () => {
      try {
        if (action === "keep") {
          const result = await api.recordKeep(file.path);
          setDayStats(result.dayStats);
          setTotals(result.totals);
          setUndoEntry({ file, index: actionIndex });
          setNotice(t.kept);
        } else {
          const result = await api.trashFiles([file.path]);
          const moved = result.results.some((item) => item.ok);
          if (!moved) {
            throw new Error(result.results[0]?.error || t.failedTrash);
          }
          setDayStats(result.dayStats);
          setTotals(result.totals);
          setUndoEntry(null);
          setNotice(t.moved);
          if (!result.nativeSoundPlayed) {
            void playFallbackTrashSound();
          }
        }
      } catch (decisionError) {
        setError(decisionError instanceof Error ? decisionError.message : action === "trash" ? t.failedTrash : t.failedKeep);
      }
    });
  }

  async function undo() {
    if (!undoEntry || !canUndo) {
      return;
    }

    setActing(true);
    try {
      const result = await api.forgetDecision(undoEntry.file.path);
      setDayStats(result.dayStats);
      setTotals(result.totals);
      setIndex(undoEntry.index);
      setUndoEntry(null);
    } catch (undoError) {
      setError(undoError instanceof Error ? undoError.message : "Undo failed.");
    } finally {
      setActing(false);
    }
  }

  function updateSettings(patch: Partial<ScanSettings>) {
    const nextSettings = {
      ...settings,
      ...patch
    };
    setSettings(nextSettings);
    void loadDeck(nextSettings);
  }

  function setLanguage(nextLanguage: Language) {
    setLanguageState(nextLanguage);
    window.localStorage.setItem("swipetrash.language", nextLanguage);
  }

  function closeTutorial() {
    setShowTutorial(false);
    window.localStorage.setItem("swipetrash.onboarded", "1");
  }

  function enableWindowMouseEvents() {
    if (lastIgnoredMouseEvents.current === false) {
      return;
    }
    lastIgnoredMouseEvents.current = false;
    api.setMouseEventsIgnored?.(false);
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (!current || acting) {
      return;
    }
    enableWindowMouseEvents();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ active: true, startX: event.clientX, x: 0 });
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (!drag.active) {
      return;
    }
    setDrag((previous) => ({ ...previous, x: event.clientX - previous.startX }));
  }

  function onPointerUp() {
    if (!drag.active) {
      return;
    }

    if (drag.x > 118) {
      void decide("keep");
      return;
    }
    if (drag.x < -118) {
      void decide("trash");
      return;
    }

    setDrag({ active: false, startX: 0, x: 0 });
  }

  const cardStyle = {
    "--swipe-x": `${flight?.x ?? drag.x}px`,
    "--swipe-rotate": `${(flight?.x ?? drag.x) / 42}deg`,
    transform: flight ? undefined : `translate3d(${drag.x}px, 0, 0) rotate(${drag.x / 42}deg)`
  } as CSSProperties;
  const keepOpacity = Math.min(1, Math.max(0, drag.x / 120));
  const trashOpacity = Math.min(1, Math.max(0, -drag.x / 120));

  return (
    <div className="app-shell">
      <div className="app-surface" ref={surfaceRef} onPointerEnter={enableWindowMouseEvents} onPointerDownCapture={enableWindowMouseEvents}>
        <div className="window-controls">
          <button className="window-control close" type="button" onClick={() => api.windowAction?.("close")} aria-label="Close" />
          <button className="window-control minimize" type="button" onClick={() => api.windowAction?.("minimize")} aria-label="Minimize" />
          <button className="window-control zoom" type="button" onClick={() => api.windowAction?.("zoom")} aria-label="Zoom" />
        </div>

        <header className="topbar">
          <div className="brand-block">
            <div>
              <p className="eyebrow">SwipeTrash</p>
              <h1>{t.title}</h1>
            </div>
          </div>

          <div className="progress-block" aria-label={t.goal}>
            <div className="progress-copy">
              <span>{t.goal}</span>
              <strong>
                {Math.min(reviewedToday, settings.dailyGoal)} / {settings.dailyGoal}
              </strong>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <button className="settings-button" type="button" onClick={() => setSettingsOpen(true)} aria-label={t.settings} title={t.settings}>
            <Settings2 size={19} />
          </button>
        </header>

        <main className="workspace">
          <section className={`deck-area ${flight ? `deck-${flight.action}` : ""}`} aria-live="polite">
            {loading ? (
              <div className="state-panel">
                <Loader2 className="spin" size={28} />
                <p>{t.scanning}</p>
              </div>
            ) : error && !current ? (
              <div className="state-panel">
                <X size={28} />
                <p>{error}</p>
              </div>
            ) : current ? (
              <>
                <article
                  key={current.id || current.path}
                  className={`swipe-card ${drag.active ? "dragging" : ""} ${flight ? `flight-${flight.action}` : ""}`}
                  style={cardStyle}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                >
                  <div className="swipe-overlay keep-overlay" style={{ opacity: keepOpacity }} />
                  <div className="swipe-overlay trash-overlay" style={{ opacity: trashOpacity }} />
                  <div className="decision-stamp keep-stamp" style={{ opacity: keepOpacity }}>
                    <Check size={18} />
                    <span>{t.keep}</span>
                  </div>
                  <div className="decision-stamp trash-stamp" style={{ opacity: trashOpacity }}>
                    <Trash2 size={18} />
                    <span>{t.trash}</span>
                  </div>

                  <div className="file-header">
                    <div className="file-title">
                      {iconForKind(current.kind)}
                      <div>
                        <h2 title={current.name}>{current.name}</h2>
                        <p>{current.reason}</p>
                      </div>
                    </div>
                  </div>

                  <FilePreview file={current} />

                  <footer className="file-footer">
                    <span title={current.directory}>{current.directory}</span>
                    <span>{formatBytes(current.size, language)} · {formatDate(current.modifiedAt, language)}</span>
                  </footer>
                </article>

                <div className="action-dock">
                  <IconButton label={t.reveal} onClick={() => current && void api.revealFile(current.path)} disabled={!current}>
                    <FolderOpen size={21} />
                  </IconButton>
                  <IconButton label={t.preview} onClick={() => current && void api.openFile(current.path)} disabled={!current}>
                    <Eye size={21} />
                  </IconButton>
                </div>
              </>
            ) : (
              <div className="state-panel">
                <ShieldCheck size={30} />
                <p>{reviewedToday >= settings.dailyGoal ? t.done : t.empty}</p>
                <button className="secondary-button" type="button" onClick={() => void loadDeck(settings)}>
                  <RefreshCw size={16} />
                  <span>{t.refresh}</span>
                </button>
              </div>
            )}
          </section>
        </main>
      </div>

      {(notice || error) && (
        <div className={`toast ${error ? "error" : ""}`} role="status">
          {error || notice}
        </div>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <div className="settings-panel">
            <header className="settings-header">
              <h2 id="settings-title">{t.settings}</h2>
              <button type="button" onClick={() => setSettingsOpen(false)} aria-label={t.close} title={t.close}>
                <X size={18} />
              </button>
            </header>

            <div className="panel-section">
              <div className="section-title">
                <HardDrive size={16} />
                <span>{t.sources}</span>
              </div>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={settings.includeDocuments}
                  onChange={(event) => updateSettings({ includeDocuments: event.currentTarget.checked })}
                />
                <span>{t.documents}</span>
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={settings.includeDownloads}
                  onChange={(event) => updateSettings({ includeDownloads: event.currentTarget.checked })}
                />
                <span>{t.downloads}</span>
              </label>
            </div>

            <div className="panel-section">
              <div className="section-title">
                <Settings2 size={16} />
                <span>{t.session}</span>
              </div>
              <Stepper label={t.files} value={settings.dailyGoal} min={4} max={40} onChange={(value) => updateSettings({ dailyGoal: value })} />
            </div>

            <div className="panel-section">
              <label className="select-label" htmlFor="language">
                <Languages size={16} />
                <span>{t.language}</span>
              </label>
              <select id="language" value={language} onChange={(event) => setLanguage(event.currentTarget.value as Language)}>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
              </select>
            </div>

            <div className="panel-section stats-section">
              <div className="section-title">
                <Trash2 size={16} />
                <span>{t.statistics}</span>
              </div>
              <StatLine label={t.deletedFiles} value={String(totals.trashed)} />
              <StatLine label={t.dataRemoved} value={formatBytes(totals.trashedBytes, language)} />
              <StatLine label={t.todayDeleted} value={`${dayStats.trashed} · ${formatBytes(dayStats.trashedBytes, language)}`} />
              <StatLine label={t.lastScan} value={String(scanStats?.scanned ?? 0)} />
              <StatLine label={t.filtered} value={String(scanStats?.filtered ?? 0)} />
            </div>
          </div>
        </div>
      )}

      {showTutorial && (
        <div className="modal-backdrop tutorial-backdrop" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
          <div className="tutorial-panel">
            <div className="tutorial-card-preview">
              <div className="tutorial-zone trash-zone">
                <Trash2 size={18} />
              </div>
              <div className="tutorial-mini-card" />
              <div className="tutorial-zone keep-zone">
                <Check size={18} />
              </div>
            </div>
            <h2 id="tutorial-title">{t.tutorialTitle}</h2>
            <p>{t.tutorialBody}</p>
            <p>{t.tutorialHint}</p>
            <button className="primary-button" type="button" onClick={closeTutorial}>
              {t.start}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({
  label,
  max,
  min,
  onChange,
  value
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div className="stepper">
      <span>{label}</span>
      <div>
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Reduce ${label}`}>
          <Minus size={14} />
        </button>
        <strong>{value}</strong>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Increase ${label}`}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function IconButton({
  children,
  disabled,
  label,
  onClick
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="icon-button" type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      {children}
    </button>
  );
}

function FilePreview({ file }: { file: FileCandidate }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [file.path]);

  if (file.kind === "image" && file.previewUrl && !imageFailed) {
    return (
      <div className="preview-frame">
        <img className="preview-media" src={file.previewUrl} alt="" draggable={false} onError={() => setImageFailed(true)} />
      </div>
    );
  }

  if (file.kind === "video" && file.previewUrl) {
    return (
      <div className="preview-frame">
        <video className="preview-media" src={file.previewUrl} controls />
      </div>
    );
  }

  if (file.kind === "audio" && file.previewUrl) {
    return (
      <div className="preview-frame audio-preview">
        <Music size={48} />
        <audio src={file.previewUrl} controls />
      </div>
    );
  }

  if (file.kind === "pdf" && file.previewUrl) {
    return (
      <div className="preview-frame">
        <iframe title={file.name} src={file.previewUrl} />
      </div>
    );
  }

  if (file.kind === "text" && file.textPreview) {
    return (
      <div className="preview-frame text-preview">
        <pre>{file.textPreview}</pre>
      </div>
    );
  }

  const Icon = iconComponentForKind(file.kind);
  return (
    <div className="preview-frame blank-preview">
      <Icon size={62} strokeWidth={1.5} />
      <span>{file.extension || "FILE"}</span>
    </div>
  );
}

function iconForKind(kind: FileKind) {
  const Icon = iconComponentForKind(kind);
  return (
    <div className="kind-icon">
      <Icon size={18} />
    </div>
  );
}

function iconComponentForKind(kind: FileKind): LucideIcon {
  const icons: Record<FileKind, LucideIcon> = {
    archive: FileArchive,
    audio: FileAudio,
    document: FileText,
    image: FileImage,
    installer: Monitor,
    other: File,
    pdf: FileText,
    text: FileText,
    video: Film
  };
  return icons[kind] ?? File;
}

function formatAge(days: number, t: Record<string, string>) {
  if (days < 1) return t.ageToday;
  if (days < 31) return `${days}${t.dayShort}`;
  if (days < 365) return `${Math.round(days / 30)} ${t.monthShort}`;
  return `${Math.round(days / 365)} ${t.yearShort}`;
}

function formatDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatBytes(bytes: number, language: Language = "en") {
  const units = language === "fr" ? ["o", "Ko", "Mo", "Go", "To"] : ["B", "KB", "MB", "GB", "TB"];
  const locale = language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-US";
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: unitIndex === 0 ? 0 : 1
  }).format(value);
  return `${formatted} ${units[unitIndex]}`;
}

function readStoredLanguage(): Language {
  const stored = window.localStorage.getItem("swipetrash.language");
  return stored === "fr" || stored === "es" || stored === "en" ? stored : "en";
}

async function playFallbackTrashSound() {
  const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextClass = window.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const audio = new AudioContextClass();
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.22);
  gain.connect(audio.destination);

  const low = audio.createOscillator();
  low.type = "triangle";
  low.frequency.setValueAtTime(420, audio.currentTime);
  low.frequency.exponentialRampToValueAtTime(180, audio.currentTime + 0.2);
  low.connect(gain);
  low.start();
  low.stop(audio.currentTime + 0.24);

  window.setTimeout(() => void audio.close(), 320);
}

function createMockApi(): SwipeTrashApi {
  let mockFiles = createMockFiles();
  let dayStats = { ...EMPTY_DAY };
  let totals = { ...EMPTY_TOTALS };

  return {
    async getCandidates(settings = {}) {
      await delay(220);
      const nextSettings = { ...DEFAULT_SETTINGS, ...settings };
      return {
        candidates: mockFiles.slice(0, nextSettings.dailyGoal * 3),
        settings: nextSettings,
        stats: {
          scanned: 186,
          filtered: 41,
          missingRoots: [],
          roots: ["Documents", "Downloads"]
        },
        day: new Date().toISOString().slice(0, 10),
        dayStats,
        totals
      };
    },
    async recordKeep(filePath) {
      void filePath;
      dayStats = { ...dayStats, kept: dayStats.kept + 1 };
      return { ok: true, dayStats, totals };
    },
    async forgetDecision() {
      dayStats = { ...dayStats, kept: Math.max(0, dayStats.kept - 1) };
      return { ok: true, dayStats, totals };
    },
    async trashFiles(filePaths) {
      const deleted = mockFiles.filter((file) => filePaths.includes(file.path));
      const bytes = deleted.reduce((sum, file) => sum + file.size, 0);
      mockFiles = mockFiles.filter((file) => !filePaths.includes(file.path));
      dayStats = { ...dayStats, trashed: dayStats.trashed + deleted.length, trashedBytes: dayStats.trashedBytes + bytes };
      totals = { trashed: totals.trashed + deleted.length, trashedBytes: totals.trashedBytes + bytes };
      return {
        results: filePaths.map((filePath) => ({ path: filePath, ok: true })),
        dayStats,
        totals,
        nativeSoundPlayed: false
      };
    },
    async openFile() {
      return { ok: true };
    },
    async revealFile() {
      return { ok: true };
    }
  };
}

function createMockFiles(): FileCandidate[] {
  const now = Date.now();
  return [
    {
      id: "mock-1",
      name: "Screenshot 2025-11-03.png",
      path: "/mock/Downloads/Screenshot 2025-11-03.png",
      directory: "/mock/Downloads",
      rootLabel: "Downloads",
      extension: "PNG",
      kind: "image",
      size: 1843200,
      sizeLabel: "1.8 MB",
      modifiedAt: new Date(now - 1000 * 60 * 60 * 24 * 58).toISOString(),
      ageDays: 58,
      reason: "Screenshot · Old file",
      score: 4,
      previewUrl: sampleImage("Screenshot", "#e8eee8"),
      textPreview: ""
    },
    {
      id: "mock-2",
      name: "Export-notes.txt",
      path: "/mock/Documents/Export-notes.txt",
      directory: "/mock/Documents",
      rootLabel: "Documents",
      extension: "TXT",
      kind: "text",
      size: 6800,
      sizeLabel: "7 KB",
      modifiedAt: new Date(now - 1000 * 60 * 60 * 24 * 120).toISOString(),
      ageDays: 120,
      reason: "Old file",
      score: 1,
      previewUrl: "",
      textPreview: "Temporary list\n- old draft\n- notes copied from a browser\n- probably duplicated elsewhere"
    },
    {
      id: "mock-3",
      name: "Installer-copy.dmg",
      path: "/mock/Downloads/Installer-copy.dmg",
      directory: "/mock/Downloads",
      rootLabel: "Downloads",
      extension: "DMG",
      kind: "installer",
      size: 188743680,
      sizeLabel: "180 MB",
      modifiedAt: new Date(now - 1000 * 60 * 60 * 24 * 42).toISOString(),
      ageDays: 42,
      reason: "Installer · Likely duplicate",
      score: 6,
      previewUrl: "",
      textPreview: ""
    }
  ];
}

function sampleImage(label: string, fill: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1300" viewBox="0 0 900 1300"><rect width="900" height="1300" fill="${fill}"/><rect x="70" y="90" width="760" height="1120" rx="18" fill="#ffffff" stroke="#20201d" stroke-opacity=".14"/><text x="112" y="188" font-family="Inter, Arial" font-size="54" font-weight="700" fill="#20201d">${label}</text><rect x="112" y="260" width="560" height="34" rx="8" fill="#20201d" opacity=".12"/><rect x="112" y="328" width="650" height="34" rx="8" fill="#20201d" opacity=".08"/><rect x="112" y="396" width="430" height="34" rx="8" fill="#20201d" opacity=".08"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
