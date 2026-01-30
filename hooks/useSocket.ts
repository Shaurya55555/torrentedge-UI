import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '../components/Toast';

interface TorrentEvent {
  infoHash: string;
  name?: string;
  timestamp: number;
  error?: string;
  [key: string]: any;
}

interface SpeedEvent {
  downloadSpeed: number;
  uploadSpeed: number;
  timestamp: number;
}

// ==================== SHARED SOCKET SINGLETON ====================
let sharedSocket: Socket | null = null;
let socketRefCount = 0;
const speedListeners = new Set<(data: SpeedEvent) => void>();
const connectListeners = new Set<(connected: boolean) => void>();

function getSharedSocket(): Socket | null {
  const token = localStorage.getItem('te_token');
  if (!token) return null;

  if (!sharedSocket) {
    console.log('[Socket] Creating shared socket connection...');
    sharedSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    sharedSocket.on('connect', () => {
      console.log('[Socket] Connected:', sharedSocket?.id);
      sharedSocket?.emit('subscribe:all');
      connectListeners.forEach(fn => fn(true));
    });

    sharedSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      connectListeners.forEach(fn => fn(false));
    });

    sharedSocket.on('connect_error', (error) => {
      console.warn('[Socket] Connection error:', error.message);
    });

    sharedSocket.on('stats:speed', (data: SpeedEvent) => {
      speedListeners.forEach(fn => fn(data));
    });
  }

  return sharedSocket;
}

function releaseSharedSocket() {
  socketRefCount--;
  if (socketRefCount <= 0 && sharedSocket) {
    console.log('[Socket] Releasing shared socket...');
    sharedSocket.emit('unsubscribe:all');
    sharedSocket.disconnect();
    sharedSocket = null;
    socketRefCount = 0;
    speedListeners.clear();
    connectListeners.clear();
  }
}

// ==================== MAIN SOCKET HOOK ====================
interface UseSocketOptions {
  onProgress?: (data: TorrentEvent) => void;
  onSpeedUpdate?: (data: SpeedEvent) => void;
  enableToasts?: boolean;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const { onProgress, onSpeedUpdate, enableToasts = true } = options;
  const toastRef = useRef(useToast());
  const toast = toastRef.current;

  useEffect(() => {
    const socket = getSharedSocket();
    if (!socket) return;

    socketRefCount++;

    // Speed updates callback
    if (onSpeedUpdate) {
      speedListeners.add(onSpeedUpdate);
    }

    // Torrent events with toasts
    const handleAdded = (data: TorrentEvent) => {
      if (enableToasts) {
        toast.addToast({
          type: 'download',
          title: 'Torrent Added',
          message: data.name || data.infoHash?.substring(0, 12) + '...',
        });
      }
    };

    const handleStarted = (data: TorrentEvent) => {
      if (enableToasts) {
        toast.info('Download Started', data.name || 'Torrent download initiated');
      }
    };

    const handleCompleted = (data: TorrentEvent) => {
      if (enableToasts) {
        toast.addToast({
          type: 'success',
          title: 'Download Complete! 🎉',
          message: data.name || 'Torrent finished downloading',
          duration: 10000,
        });
      }
    };

    const handleError = (data: TorrentEvent) => {
      if (enableToasts) {
        toast.error('Torrent Error', data.error || data.name || 'An error occurred');
      }
    };

    const handleProgress = (data: TorrentEvent) => {
      onProgress?.(data);
    };

    socket.on('torrent:added', handleAdded);
    socket.on('torrent:started', handleStarted);
    socket.on('torrent:completed', handleCompleted);
    socket.on('torrent:error', handleError);
    socket.on('torrent:progress', handleProgress);

    return () => {
      socket.off('torrent:added', handleAdded);
      socket.off('torrent:started', handleStarted);
      socket.off('torrent:completed', handleCompleted);
      socket.off('torrent:error', handleError);
      socket.off('torrent:progress', handleProgress);

      if (onSpeedUpdate) {
        speedListeners.delete(onSpeedUpdate);
      }

      releaseSharedSocket();
    };
  }, [onProgress, onSpeedUpdate, enableToasts, toast]);

  const subscribeTo = useCallback((infoHash: string) => {
    sharedSocket?.emit('subscribe:torrent', { infoHash });
  }, []);

  const unsubscribeFrom = useCallback((infoHash: string) => {
    sharedSocket?.emit('unsubscribe:torrent', { infoHash });
  }, []);

  return {
    socket: sharedSocket,
    subscribeTo,
    unsubscribeFrom,
    isConnected: sharedSocket?.connected ?? false,
  };
};

// ==================== SPEED SOCKET HOOK (for SpeedGraph) ====================
export const useSpeedSocket = () => {
  const [latestSpeed, setLatestSpeed] = useState<SpeedEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = getSharedSocket();
    if (!socket) return;

    socketRefCount++;

    // Set initial connection state
    setIsConnected(socket.connected);

    // Listen for speed updates
    const handleSpeed = (data: SpeedEvent) => {
      setLatestSpeed(data);
    };
    speedListeners.add(handleSpeed);

    // Listen for connection changes
    const handleConnect = (connected: boolean) => {
      setIsConnected(connected);
    };
    connectListeners.add(handleConnect);

    return () => {
      speedListeners.delete(handleSpeed);
      connectListeners.delete(handleConnect);
      releaseSharedSocket();
    };
  }, []);

  return { latestSpeed, isConnected };
};
