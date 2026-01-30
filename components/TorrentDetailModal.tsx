import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Download, Upload, Server, Users, Clock, HardDrive, 
  FileText, Activity, Wifi, Link2, Copy, Check, RefreshCw,
  ArrowDown, ArrowUp, Gauge, Layers, Grid3X3, FolderOpen
} from 'lucide-react';
import { torrentService } from '../services/api';
import { Torrent, TorrentDetail } from '../types';
import { PieceMap } from './PieceMap';
import { FileSelector } from './FileSelector';

interface TorrentDetailModalProps {
  torrent: Torrent;
  onClose: () => void;
}

export const TorrentDetailModal: React.FC<TorrentDetailModalProps> = ({ torrent, onClose }) => {
  const [stats, setStats] = useState<TorrentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSec: number) => {
    return formatSize(bytesPerSec) + '/s';
  };

  const formatEta = (seconds: number) => {
    if (!seconds || seconds < 0 || !isFinite(seconds)) return '∞';
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  const fetchStats = useCallback(async () => {
    try {
      const data = await torrentService.getStats(torrent.infoHash || torrent._id);
      setStats(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch torrent stats:', err);
      setError(err.message || 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, [torrent]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 2000); // Live updates
    return () => clearInterval(interval);
  }, [fetchStats]);

  const copyInfoHash = () => {
    navigator.clipboard.writeText(torrent.infoHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    downloading: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    seeding: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    paused: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    error: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    completed: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    idle: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    checking: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    fetching_metadata: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    queued: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  };

  const currentStatus = stats?.state || torrent.status;
  const progress = stats?.percentage ?? torrent.progress ?? 0;

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/5">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl font-bold text-white truncate mb-2" title={torrent.name}>
              {torrent.name}
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-2.5 py-1 rounded-full border text-xs uppercase font-bold tracking-wider ${statusColors[currentStatus] || statusColors.pending}`}>
                {currentStatus}
              </span>
              <span className="text-sm text-gray-400">{formatSize(torrent.size)}</span>
              <button
                onClick={copyInfoHash}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors font-mono"
                title="Copy info hash"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                {torrent.infoHash?.substring(0, 12)}...
              </button>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && !stats ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="animate-spin text-indigo-500" size={32} />
            </div>
          ) : error ? (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl">
              {error}
            </div>
          ) : (
            <>
              {/* Progress Section */}
              <div className="bg-zinc-800/50 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-300">Download Progress</span>
                  <span className="text-lg font-bold text-white">{progress.toFixed(1)}%</span>
                </div>
                <div className="h-3 w-full bg-zinc-700 rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      currentStatus === 'downloading' ? 'bg-gradient-to-r from-blue-600 to-blue-400' : 
                      currentStatus === 'seeding' ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
                      currentStatus === 'completed' ? 'bg-gradient-to-r from-indigo-600 to-indigo-400' : 
                      'bg-gray-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{formatSize((stats?.downloaded ?? 0) || (torrent.size * progress / 100))}</span>
                  <span>ETA: {formatEta(stats?.eta ?? torrent.eta ?? -1)}</span>
                  <span>{formatSize(torrent.size)}</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard 
                  icon={<ArrowDown className="text-blue-500" size={18} />}
                  label="Download"
                  value={formatSpeed(stats?.downloadSpeed ?? torrent.downloadSpeed ?? 0)}
                />
                <StatCard 
                  icon={<ArrowUp className="text-emerald-500" size={18} />}
                  label="Upload"
                  value={formatSpeed(stats?.uploadSpeed ?? torrent.uploadSpeed ?? 0)}
                />
                <StatCard 
                  icon={<Users className="text-indigo-500" size={18} />}
                  label="Peers"
                  value={`${stats?.peers?.connected ?? torrent.peers?.connected ?? 0} / ${stats?.peers?.total ?? torrent.peers?.total ?? 0}`}
                />
                <StatCard 
                  icon={<Server className="text-rose-500" size={18} />}
                  label="Seeds"
                  value={String(stats?.seeds ?? torrent.seeds ?? 0)}
                />
              </div>

              {/* Pieces Info */}
              {stats && (
                <div className="bg-zinc-800/50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                    <Layers size={16} className="text-indigo-500" />
                    Piece Information
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Total Pieces</div>
                      <div className="text-white font-medium">{stats.pieceCount ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Completed</div>
                      <div className="text-emerald-400 font-medium">{stats.completedPieces ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Active</div>
                      <div className="text-blue-400 font-medium">{stats.activePieces ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Pending Requests</div>
                      <div className="text-yellow-400 font-medium">{stats.pendingRequests ?? 0}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Piece Map Visualization */}
              {stats && stats.bitfield && stats.bitfield.length > 0 && (
                <div className="bg-zinc-800/50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                    <Grid3X3 size={16} className="text-indigo-500" />
                    Piece Map
                  </h3>
                  <PieceMap 
                    bitfield={stats.bitfield} 
                    pieceCount={stats.pieceCount ?? 0}
                    maxCells={300}
                  />
                </div>
              )}

              {/* Files Section with Selection */}
              <div className="bg-zinc-800/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <FolderOpen size={16} className="text-indigo-500" />
                  File Selection
                </h3>
                <FileSelector 
                  torrentId={torrent.infoHash || torrent._id}
                />
              </div>

              {/* Trackers Section */}
              {torrent.trackers && torrent.trackers.length > 0 && (
                <div className="bg-zinc-800/50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                    <Link2 size={16} className="text-indigo-500" />
                    Trackers ({torrent.trackers.length})
                  </h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {torrent.trackers.map((tracker, idx) => (
                      <div 
                        key={idx}
                        className="py-2 px-3 bg-zinc-900/50 rounded-lg text-xs font-mono text-gray-400 truncate"
                        title={tracker}
                      >
                        {tracker}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-gray-300 font-medium rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper component for stat cards
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-zinc-800/50 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
    <div className="text-lg font-bold text-white">{value}</div>
  </div>
);
