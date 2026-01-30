import { useState, useEffect } from 'react';
import { useSpeedSocket } from './useSocket';

export const useConnectionStatus = () => {
  const { isConnected } = useSpeedSocket();
  const [wasEverConnected, setWasEverConnected] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setWasEverConnected(true);
    }
  }, [isConnected]);

  return {
    isConnected,
    // Only show "disconnected" state if we were previously connected
    // This prevents showing red dot on initial load
    showDisconnected: wasEverConnected && !isConnected,
  };
};
