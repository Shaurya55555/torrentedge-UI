import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Socket needs to connect directly to backend, not through proxy
const SOCKET_URL = 'http://localhost:3029';

interface UseSocketOptions {
  autoConnect?: boolean;
  subscribeAll?: boolean;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true, subscribeAll = false } = options;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!autoConnect) return;

    // Create socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setIsConnected(true);

      // Subscribe to all updates if requested
      if (subscribeAll) {
        socket.emit('subscribe:all');
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    return () => {
      if (subscribeAll) {
        socket.emit('unsubscribe:all');
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [autoConnect, subscribeAll]);

  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, callback);
    return () => {
      socket.off(event, callback);
    };
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit(event, data);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    subscribe,
    emit,
  };
}

// Specialized hook for speed updates
export function useSpeedSocket() {
  const { subscribe, isConnected } = useSocket({ subscribeAll: true });
  const [latestSpeed, setLatestSpeed] = useState<{
    downloadSpeed: number;
    uploadSpeed: number;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe('stats:speed', (data) => {
      setLatestSpeed({
        downloadSpeed: data.downloadSpeed,
        uploadSpeed: data.uploadSpeed,
        timestamp: data.timestamp,
      });
    });

    return unsubscribe;
  }, [subscribe]);

  return { latestSpeed, isConnected };
}
