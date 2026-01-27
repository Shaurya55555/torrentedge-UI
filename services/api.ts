
import { AuthResponse, UserProfile, Torrent, TorrentDetail, SystemStats, ApiError } from '../types';

const BASE_URL = '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('te_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const err = data as ApiError;
    throw new Error(err.error || 'Request failed');
  }
  return data as T;
}

export const authService = {
  register: async (payload: any): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<AuthResponse>(res);
  },
  login: async (payload: any): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<AuthResponse>(res);
  },
};

export const userService = {
  getProfile: async (): Promise<UserProfile> => {
    const res = await fetch(`${BASE_URL}/user/profile`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<UserProfile>(res);
  },
};

export const torrentService = {
  create: async (payload: { name: string; magnetURI: string; size: number }) => {
    const res = await fetch(`${BASE_URL}/torrent/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<{ torrentId: string; status: string }>(res);
  },
  list: async (): Promise<Torrent[]> => {
    const res = await fetch(`${BASE_URL}/torrent/list`);
    return handleResponse<Torrent[]>(res);
  },
  track: async (id: string): Promise<TorrentDetail> => {
    const res = await fetch(`${BASE_URL}/torrent/track/${id}`);
    return handleResponse<TorrentDetail>(res);
  },
};

export const systemService = {
  getStats: async (): Promise<SystemStats> => {
    const res = await fetch(`${BASE_URL}/statistics`);
    return handleResponse<SystemStats>(res);
  },
  health: async () => {
    const res = await fetch(`${BASE_URL}/health`);
    return handleResponse<{ status: string; uptime: number }>(res);
  },
};

export const fileService = {
  upload: async (formData: FormData) => {
    const token = localStorage.getItem('te_token');
    const res = await fetch(`${BASE_URL}/file/upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    return handleResponse<{ fileId: string; torrentId: string; status: string }>(res);
  },
  getDownloadUrl: (id: string) => `${BASE_URL}/file/download/${id}`,
};
