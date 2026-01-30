// ==================== TORRENT ====================
export interface Torrent {
  _id: string;
  id?: string;  // alias for _id
  name: string;
  infoHash: string;
  magnetURI?: string;
  size: number;
  seeds: number;
  leeches: number;
  status: 'pending' | 'downloading' | 'seeding' | 'paused' | 'error' | 'completed' | 'fetching_metadata' | 'idle' | 'checking' | 'queued';
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  eta?: number;
  peers?: {
    connected: number;
    total: number;
  };
  files?: TorrentFile[];
  trackers?: string[];
  addedAt: string;
  completedPieces?: number;
  totalPieces?: number;
  uploadedBy?: {
    _id: string;
    username: string;
  };
}

export interface TorrentFile {
  name: string;
  size: number;
  path?: string;
}

export interface FileWithSelection {
  index: number;
  name: string;
  path: string;
  length: number;
  selected: boolean;
}

export interface TorrentDetail {
  infoHash: string;
  name: string;
  size: number;
  downloaded: number;
  total: number;
  percentage: number;
  downloadSpeed: number;
  uploadSpeed: number;
  eta: number;
  state: string;
  peers: {
    connected: number;
    total: number;
  };
  seeds: number;
  leeches: number;
  pieceCount: number;
  completedPieces: number;
  activePieces: number;
  pendingRequests: number;
  bitfield?: number[]; // 0=missing, 1=downloading, 2=complete
}

// ==================== USER ====================
export interface UserProfile {
  _id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

// ==================== STATS ====================
export interface SystemStats {
  database: {
    totalTorrents: number;
    totalUsers: number;
    activeTorrents: number;
  };
  engine: {
    totalDownloadSpeed: number;
    totalUploadSpeed: number;
    activeTorrents: number;
    totalTorrents: number;
    totalDownloaded: number;
    totalUploaded: number;
  };
  dht?: {
    enabled: boolean;
    running: boolean;
    nodes: number;
    port?: number;
    nodeId?: string;
  };
  timestamp: string;
}

export interface UserStats {
  totalTorrents: number;
  byStatus: {
    pending: number;
    downloading: number;
    seeding: number;
    paused: number;
    completed: number;
    error: number;
  };
  totalSize: number;
  totalDownloaded: number;
  live: {
    activeTorrents: number;
    totalDownloadSpeed: number;
    totalUploadSpeed: number;
  };
  timestamp: string;
}

// ==================== AUTH ====================
export interface AuthResponse {
  token: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  userId?: string;  // legacy
  message?: string;
}

// ==================== ERRORS ====================
export interface ApiError {
  error?: string;
  message?: string;
  code?: number;
}

// ==================== SPEED HISTORY ====================
export interface SpeedSample {
  timestamp: number;
  downloadSpeed: number;
  uploadSpeed: number;
}

export interface SpeedHistoryResponse {
  history: SpeedSample[];
  maxSamples: number;
  intervalMs: number;
  timestamp: string;
}

// ==================== SETTINGS ====================
export interface EngineSettings {
  downloadPath: string;
  maxActiveTorrents: number;
  maxConcurrent: number;
  port: number;
  dht: {
    enabled: boolean;
    port: number;
    running: boolean;
    nodes: number;
  };
  speedLimits: {
    download: number;
    upload: number;
  };
}
