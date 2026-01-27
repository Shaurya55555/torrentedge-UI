
export interface Torrent {
  id: string;
  name: string;
  size: number;
  seeders: number;
  leechers: number;
  status: 'pending' | 'downloading' | 'seeding' | 'paused' | 'error' | 'completed';
  progress?: number;
}

export interface TorrentDetail {
  completedPieces: number;
  totalPieces: number;
  peers: string[];
}

export interface UserProfile {
  username: string;
  email: string;
  torrents: string[];
}

export interface SystemStats {
  totalUsers: number;
  totalTorrents: number;
  activePeers: number;
}

export interface AuthResponse {
  userId: string;
  token: string;
}

export interface ApiError {
  error: string;
  code?: number;
}
