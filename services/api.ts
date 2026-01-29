import { AuthResponse, UserProfile, Torrent, TorrentDetail, SystemStats, ApiError, SpeedHistoryResponse } from '../types';

const BASE_URL = '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('te_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

const getAuthHeadersMultipart = () => {
  const token = localStorage.getItem('te_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    // Auto-logout on 401 (invalid/expired token)
    if (response.status === 401) {
      localStorage.removeItem('te_token');
      window.location.reload();
    }
    const err = data as ApiError;
    throw new Error(err.error || err.message || 'Request failed');
  }
  return data as T;
}

// ==================== AUTH ====================
export const authService = {
  register: async (payload: { username: string; email: string; password: string }): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<AuthResponse>(res);
  },
  
  login: async (payload: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<AuthResponse>(res);
  },
};

// ==================== USER ====================
export const userService = {
  getProfile: async (): Promise<UserProfile> => {
    const res = await fetch(`${BASE_URL}/user/profile`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<UserProfile>(res);
  },
  
  updateProfile: async (payload: { username?: string; email?: string }): Promise<UserProfile> => {
    const res = await fetch(`${BASE_URL}/user/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<UserProfile>(res);
  },
};

// ==================== TORRENT ====================
export const torrentService = {
  // Get all torrents for authenticated user
  list: async (): Promise<Torrent[]> => {
    const res = await fetch(`${BASE_URL}/torrent`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Torrent[]>(res);
  },
  
  // Get single torrent by ID or infoHash
  get: async (id: string): Promise<Torrent> => {
    const res = await fetch(`${BASE_URL}/torrent/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Torrent>(res);
  },
  
  // Get real-time stats for a torrent
  getStats: async (id: string): Promise<TorrentDetail> => {
    const res = await fetch(`${BASE_URL}/torrent/${id}/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<TorrentDetail>(res);
  },
  
  // Upload .torrent file
  upload: async (file: File): Promise<Torrent> => {
    const formData = new FormData();
    formData.append('torrent', file);
    
    const res = await fetch(`${BASE_URL}/torrent/create`, {
      method: 'POST',
      headers: getAuthHeadersMultipart(),
      body: formData,
    });
    return handleResponse<Torrent>(res);
  },
  
  // Add magnet link (not yet supported by backend)
  addMagnet: async (magnetURI: string): Promise<Torrent> => {
    const res = await fetch(`${BASE_URL}/torrent/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ magnetURI }),
    });
    return handleResponse<Torrent>(res);
  },
  
  // Start torrent
  start: async (id: string): Promise<Torrent> => {
    const res = await fetch(`${BASE_URL}/torrent/${id}/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<Torrent>(res);
  },
  
  // Pause torrent
  pause: async (id: string): Promise<Torrent> => {
    const res = await fetch(`${BASE_URL}/torrent/${id}/pause`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<Torrent>(res);
  },
  
  // Resume torrent
  resume: async (id: string): Promise<Torrent> => {
    const res = await fetch(`${BASE_URL}/torrent/${id}/resume`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<Torrent>(res);
  },
  
  // Delete torrent
  delete: async (id: string, deleteFiles: boolean = false): Promise<{ message: string }> => {
    const res = await fetch(`${BASE_URL}/torrent/${id}?deleteFiles=${deleteFiles}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },
  
  // Search torrents
  search: async (query: string): Promise<Torrent[]> => {
    const res = await fetch(`${BASE_URL}/torrent/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Torrent[]>(res);
  },
};

// ==================== STATISTICS ====================
export const statsService = {
  // Get global stats (public)
  getGlobal: async (): Promise<SystemStats> => {
    const res = await fetch(`${BASE_URL}/statistics`);
    return handleResponse<SystemStats>(res);
  },
  
  // Get engine stats (requires auth)
  getEngine: async () => {
    const res = await fetch(`${BASE_URL}/statistics/engine`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  
  // Get user stats (requires auth)
  getUser: async () => {
    const res = await fetch(`${BASE_URL}/statistics/user`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  },
  
  // Get speed history for graphs (requires auth)
  getSpeedHistory: async (): Promise<SpeedHistoryResponse> => {
    const res = await fetch(`${BASE_URL}/statistics/speed-history`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<SpeedHistoryResponse>(res);
  },
};

// ==================== HEALTH ====================
export const healthService = {
  check: async (): Promise<{ status: string }> => {
    const res = await fetch(`${BASE_URL}/health`);
    return handleResponse<{ status: string }>(res);
  },
};

// Legacy exports for backward compatibility
export const systemService = statsService;
export const fileService = {
  upload: torrentService.upload,
};
