export type FileKind = "archive" | "audio" | "document" | "image" | "installer" | "other" | "pdf" | "text" | "video";

export type DecisionAction = "keep" | "keep_always" | "skip" | "trash";

export interface ScanSettings {
  includeDocuments: boolean;
  includeDownloads: boolean;
  dailyGoal: number;
  minAgeDays: number;
}

export interface DayStats {
  kept: number;
  trashed: number;
  trashedBytes: number;
}

export interface LifetimeStats {
  trashed: number;
  trashedBytes: number;
}

export interface ScanStats {
  scanned: number;
  filtered: number;
  missingRoots: string[];
  roots: string[];
}

export interface FileCandidate {
  id: string;
  name: string;
  path: string;
  directory: string;
  rootLabel: string;
  extension: string;
  kind: FileKind;
  size: number;
  sizeLabel: string;
  modifiedAt: string;
  ageDays: number;
  reason: string;
  score: number;
  previewUrl: string;
  textPreview: string;
}

export interface ScanResult {
  candidates: FileCandidate[];
  settings: ScanSettings;
  stats: ScanStats;
  day: string;
  dayStats: DayStats;
  totals: LifetimeStats;
}

export interface TrashFileResult {
  path: string;
  ok: boolean;
  error?: string;
}

export interface TrashResult {
  results: TrashFileResult[];
  dayStats: DayStats;
  totals: LifetimeStats;
  nativeSoundPlayed: boolean;
}

export interface SwipeTrashApi {
  getCandidates(settings?: Partial<ScanSettings>): Promise<ScanResult>;
  recordKeep(filePath: string): Promise<{ ok: boolean; dayStats: DayStats; totals: LifetimeStats }>;
  recordKeepAlways(filePath: string): Promise<{ ok: boolean; dayStats: DayStats; totals: LifetimeStats }>;
  forgetDecision(filePath: string): Promise<{ ok: boolean; dayStats: DayStats; totals: LifetimeStats }>;
  trashFiles(filePaths: string[]): Promise<TrashResult>;
  openFile(filePath: string): Promise<{ ok: boolean; error?: string }>;
  revealFile(filePath: string): Promise<{ ok: boolean }>;
  windowAction?(action: "close" | "minimize" | "zoom"): void;
}

declare global {
  interface Window {
    swipeTrash?: SwipeTrashApi;
  }
}
