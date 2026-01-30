import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Wifi, WifiOff } from 'lucide-react';
import { statsService } from '../services/api';
import { SpeedSample } from '../types';
import { useSpeedSocket } from '../hooks/useSocket';

interface SpeedGraphProps {
  refreshInterval?: number; // in ms, fallback polling interval (default 2000)
}

export const SpeedGraph: React.FC<SpeedGraphProps> = ({ refreshInterval = 2000 }) => {
  const [history, setHistory] = useState<SpeedSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const historyRef = useRef<SpeedSample[]>([]);
  
  // Socket.IO hook for live updates
  const { latestSpeed, isConnected } = useSpeedSocket();

  // Format bytes/sec to human readable
  const formatSpeed = (bytesPerSec: number): string => {
    if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
    return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format timestamp to relative seconds (e.g., "-30s")
  const formatTime = (timestamp: number, latestTimestamp: number): string => {
    const diff = Math.round((timestamp - latestTimestamp) / 1000);
    return `${diff}s`;
  };

  // Initial fetch to populate history
  const fetchHistory = useCallback(async () => {
    try {
      const response = await statsService.getSpeedHistory();
      setHistory(response.history);
      historyRef.current = response.history;
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch speed history:', err);
      setError(err.message || 'Failed to fetch speed history');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Handle live socket updates - append to history
  useEffect(() => {
    if (latestSpeed && isConnected) {
      setHistory(prev => {
        const newHistory = [...prev, latestSpeed];
        // Keep only last 60 samples
        if (newHistory.length > 60) {
          newHistory.shift();
        }
        historyRef.current = newHistory;
        return newHistory;
      });
    }
  }, [latestSpeed, isConnected]);

  // Fallback polling when socket is disconnected
  useEffect(() => {
    if (isConnected) {
      // Socket is connected, no need for polling
      return;
    }

    // Socket disconnected, use polling as fallback
    const interval = setInterval(fetchHistory, refreshInterval);
    return () => clearInterval(interval);
  }, [isConnected, fetchHistory, refreshInterval]);

  // Transform data for chart
  const chartData = history.map((sample, index) => {
    const latestTimestamp = history.length > 0 ? history[history.length - 1].timestamp : sample.timestamp;
    return {
      time: formatTime(sample.timestamp, latestTimestamp),
      download: sample.downloadSpeed,
      upload: sample.uploadSpeed,
      index
    };
  });

  // Calculate max for Y axis
  const maxSpeed = Math.max(
    ...history.map(s => Math.max(s.downloadSpeed, s.uploadSpeed)),
    1024 // minimum 1 KB/s for scale
  );

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-white/10 rounded-lg p-3 shadow-xl">
          <p className="text-gray-400 text-xs mb-2">{label}</p>
          <p className="text-blue-400 text-sm">
            ↓ {formatSpeed(payload[0]?.value || 0)}
          </p>
          <p className="text-emerald-400 text-sm">
            ↑ {formatSpeed(payload[1]?.value || 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading && history.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={20} className="text-indigo-500 animate-pulse" />
          <h3 className="font-semibold text-gray-300">Live Speed Graph</h3>
        </div>
        <div className="h-48 flex items-center justify-center text-gray-500">
          Loading speed data...
        </div>
      </div>
    );
  }

  if (error && history.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={20} className="text-red-500" />
          <h3 className="font-semibold text-gray-300">Live Speed Graph</h3>
        </div>
        <div className="h-48 flex items-center justify-center text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-indigo-500" />
          <h3 className="font-semibold text-gray-300">Live Speed Graph</h3>
          {isConnected ? (
            <Wifi size={14} className="text-emerald-500" title="Live updates" />
          ) : (
            <WifiOff size={14} className="text-yellow-500" title="Polling mode" />
          )}
        </div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-400">Download</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-gray-400">Upload</span>
          </div>
        </div>
      </div>

      <div className="h-48 min-h-[192px] w-full">
        <ResponsiveContainer width="100%" height={192}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorDownloadGraph" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorUploadGraph" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#52525b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="#52525b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(value) => {
                if (value === 0) return '0';
                if (value >= 1048576) return `${(value / 1048576).toFixed(0)}M`;
                if (value >= 1024) return `${(value / 1024).toFixed(0)}K`;
                return `${value}`;
              }}
              domain={[0, maxSpeed * 1.1]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="download" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorDownloadGraph)" 
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Area 
              type="monotone" 
              dataKey="upload" 
              stroke="#10b981" 
              fillOpacity={1} 
              fill="url(#colorUploadGraph)" 
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 text-center text-xs text-gray-500">
        Last {history.length} seconds • {isConnected ? 'Live updates' : `Polling every ${refreshInterval / 1000}s`}
      </div>
    </div>
  );
};
