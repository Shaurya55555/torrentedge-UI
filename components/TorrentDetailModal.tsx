import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowDown, ArrowUp, Users, Copy, Check, RefreshCw } from 'lucide-react';
import { torrentService } from '../services/api';
import { Torrent, TorrentDetail } from '../types';
import { FileSelector } from './FileSelector';

interface TorrentDetailModalProps {
  torrent: Torrent;
  onClose: () => void;
}

const formatSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatSpeed = (bytesPerSec: number) => `${formatSize(bytesPerSec)}/s`;

const formatEta = (seconds: number) => {
  if (!seconds || seconds < 0 || !isFinite(seconds)) return '—';
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(hours / 24)}d`;
};

export const TorrentDetailModal: React.FC<TorrentDetailModalProps> = ({ torrent, onClose }) => {
  const [stats, setStats] = useState<TorrentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const data = await torrentService.getStats(torrent.infoHash || torrent._id);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }, [torrent]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const copyHash = () => {
    navigator.clipboard.writeText(torrent.infoHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progress = stats?.percentage ?? torrent.progress ?? 0;
  const status = stats?.state || torrent.status;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div 
        className="bg-bg-secondary border-t sm:border border-border-subtle rounded-t-lg sm:rounded-lg w-full sm:max-w-xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border-subtle">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-sm font-medium text-text-primary truncate mb-1" title={torrent.name}>
              {torrent.name}
            </h2>
            <div className="flex items-center gap-3 text-xs text-text-tertiary">
              <StatusBadge status={status} />
              <span>{formatSize(torrent.size)}</span>
              <button
                onClick={copyHash}
                className="flex items-center gap-1 font-mono hover:text-text-secondary transition-colors"
                title="Copy info hash"
              >
                {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                {torrent.infoHash?.substring(0, 8)}…
              </button>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && !stats ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="animate-spin text-text-tertiary" size={20} />
            </div>
          ) : (
            <>
              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="text-text-secondary">Progress</span>
                  <span className="text-text-primary font-medium">{progress.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${progress >= 100 ? 'bg-green-500' : 'bg-accent'}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-[11px] text-text-tertiary">
                  <span>{formatSize((torrent.size * progress) / 100)} / {formatSize(torrent.size)}</span>
                  <span>ETA: {formatEta(stats?.eta ?? -1)}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <StatItem 
                  icon={<ArrowDown size={14} className="text-accent" />} 
                  label="Down" 
                  value={formatSpeed(stats?.downloadSpeed ?? 0)} 
                />
                <StatItem 
                  icon={<ArrowUp size={14} className="text-green-500" />} 
                  label="Up" 
                  value={formatSpeed(stats?.uploadSpeed ?? 0)} 
                />
                <StatItem 
                  icon={<Users size={14} className="text-text-tertiary" />} 
                  label="Peers" 
                  value={String(stats?.peers?.connected ?? 0)} 
                />
                <StatItem 
                  label="Seeds" 
                  value={String(stats?.seeds ?? 0)} 
                />
              </div>

              {/* Pieces */}
              {stats && (
                <div className="text-xs">
                  <div className="text-text-secondary mb-2">Pieces</div>
                  <div className="grid grid-cols-3 gap-2 text-text-tertiary">
                    <span>Total: <span className="text-text-primary">{stats.pieceCount ?? 0}</span></span>
                    <span>Done: <span className="text-green-500">{stats.completedPieces ?? 0}</span></span>
                    <span>Active: <span className="text-accent">{stats.activePieces ?? 0}</span></span>
                  </div>
                </div>
              )}

              {/* Files */}
              <div>
                <div className="text-xs text-text-secondary mb-2">Files</div>
                <FileSelector torrentId={torrent.infoHash || torrent._id} />
              </div>

              {/* Trackers */}
              {torrent.trackers && torrent.trackers.length > 0 && (
                <div>
                  <div className="text-xs text-text-secondary mb-2">
                    Trackers ({torrent.trackers.length})
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {torrent.trackers.slice(0, 5).map((tracker, idx) => (
                      <div 
                        key={idx}
                        className="text-[11px] font-mono text-text-tertiary truncate"
                        title={tracker}
                      >
                        {tracker}
                      </div>
                    ))}
                    {torrent.trackers.length > 5 && (
                      <div className="text-[11px] text-text-tertiary">
                        +{torrent.trackers.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const StatItem: React.FC<{ icon?: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-bg-tertiary rounded px-2 py-2">
    <div className="flex items-center justify-center gap-1 mb-0.5">
      {icon}
      <span className="text-[10px] text-text-tertiary uppercase">{label}</span>
    </div>
    <div className="text-xs font-medium text-text-primary">{value}</div>
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    downloading: { bg: 'bg-accent/10', text: 'text-accent', dot: 'bg-accent' },
    seeding: { bg: 'bg-green-500/10', text: 'text-green-500', dot: 'bg-green-500' },
    completed: { bg: 'bg-green-500/10', text: 'text-green-500', dot: 'bg-green-500' },
    paused: { bg: 'bg-text-tertiary/10', text: 'text-text-secondary', dot: 'bg-text-tertiary' },
    error: { bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
    queued: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', dot: 'bg-yellow-500' },
  };
  const { bg, text, dot } = config[status] || config.paused;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} ${status === 'downloading' ? 'animate-pulse' : ''}`} />
      <span className="capitalize text-[11px] font-medium">{status}</span>
    </span>
  );
};
