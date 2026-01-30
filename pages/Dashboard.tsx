import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { torrentService, statsService } from '../services/api';
import { Torrent, SystemStats } from '../types';
import { TorrentDetailModal } from '../components/TorrentDetailModal';
import { SpeedGraph } from '../components/SpeedGraph';
import { useToast } from '../components/Toast';
import { useDeleteConfirm } from '../components/ConfirmDialog';
import { useSocket } from '../hooks/useSocket';
import { 
  Plus, Upload, RefreshCw, Pause, Play, Trash2, 
  ArrowDown, ArrowUp, ChevronUp, ChevronDown, Search, X
} from 'lucide-react';

// Format bytes to human readable
const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatSpeed = (bytesPerSec: number) => {
  if (bytesPerSec === 0) return '—';
  return `${formatSize(bytesPerSec)}/s`;
};

type SortField = 'name' | 'size' | 'progress' | 'speed' | 'added';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'downloading' | 'seeding' | 'paused' | 'completed' | 'error';

export const Dashboard: React.FC = () => {
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTorrent, setSelectedTorrent] = useState<Torrent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [magnetInput, setMagnetInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const toast = useToast();
  const confirmDelete = useDeleteConfirm();

  // Sorting & Filtering
  const [sortField, setSortField] = useState<SortField>('added');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Drag & drop
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WebSocket for real-time updates
  useSocket({
    enableToasts: true,
    onProgress: useCallback((data) => {
      setTorrents(prev => prev.map(t => 
        t.infoHash === data.infoHash 
          ? { ...t, progress: data.percentage, downloadSpeed: data.downloadSpeed, uploadSpeed: data.uploadSpeed }
          : t
      ));
    }, []),
  });

  const fetchData = useCallback(async () => {
    try {
      const [torrentList, systemStats] = await Promise.all([
        torrentService.list(),
        statsService.getGlobal()
      ]);
      setTorrents(torrentList);
      setStats(systemStats);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case 'n':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setShowAddModal(true);
          }
          break;
        case 'u':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
          break;
        case 'r':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            fetchData();
          }
          break;
        case 'escape':
          setShowAddModal(false);
          setSelectedTorrent(null);
          break;
        case '/':
          e.preventDefault();
          document.querySelector<HTMLInputElement>('[data-search]')?.focus();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchData]);

  // Drag & drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files: File[] = Array.from(e.dataTransfer.files);
    const torrentFiles = files.filter(f => f.name.endsWith('.torrent'));
    
    if (torrentFiles.length === 0) {
      // Check if it's a magnet link in text
      const text = e.dataTransfer.getData('text/plain');
      if (text?.startsWith('magnet:')) {
        try {
          await torrentService.addMagnet(text);
          toast.success('Added', 'Magnet link added');
          fetchData();
        } catch (err: any) {
          toast.error('Error', err.message);
        }
        return;
      }
      toast.warning('Invalid file', 'Please drop a .torrent file');
      return;
    }

    setUploading(true);
    let successCount = 0;
    for (const file of torrentFiles) {
      try {
        await torrentService.upload(file);
        successCount++;
      } catch (err: any) {
        toast.error('Upload failed', `${file.name}: ${err.message}`);
      }
    }
    if (successCount > 0) {
      toast.success('Uploaded', `${successCount} file${successCount > 1 ? 's' : ''} added`);
      fetchData();
    }
    setUploading(false);
  }, [fetchData, toast]);

  // Filtered & sorted torrents
  const filteredTorrents = useMemo(() => {
    let result = [...torrents];

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(t => {
        if (statusFilter === 'completed') return (t.progress ?? 0) >= 100;
        return t.status === statusFilter;
      });
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(q) || 
        t.infoHash?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'size':
          cmp = (a.size || 0) - (b.size || 0);
          break;
        case 'progress':
          cmp = (a.progress ?? 0) - (b.progress ?? 0);
          break;
        case 'speed':
          cmp = (a.downloadSpeed || 0) - (b.downloadSpeed || 0);
          break;
        case 'added':
          cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [torrents, statusFilter, searchQuery, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleAddMagnet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magnetInput.trim()) return;
    try {
      await torrentService.addMagnet(magnetInput);
      setMagnetInput('');
      setShowAddModal(false);
      toast.success('Added', 'Torrent added successfully');
      fetchData();
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to add torrent');
    }
  };

  // Demo torrent - Big Buck Bunny (open source movie, ~276MB)
  const DEMO_MAGNET = 'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com';

  const handleAddDemo = async () => {
    try {
      await torrentService.addMagnet(DEMO_MAGNET);
      toast.success('Demo added', 'Big Buck Bunny (276 MB) — open source movie');
      fetchData();
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to add demo');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const torrentFiles = files.filter(f => f.name.endsWith('.torrent'));
    if (torrentFiles.length === 0) {
      toast.warning('Invalid file', 'Please select a .torrent file');
      return;
    }
    
    setUploading(true);
    let successCount = 0;
    for (const file of torrentFiles) {
      try {
        await torrentService.upload(file);
        successCount++;
      } catch (err: any) {
        toast.error('Upload failed', `${file.name}: ${err.message}`);
      }
    }
    if (successCount > 0) {
      toast.success('Uploaded', `${successCount} file${successCount > 1 ? 's' : ''} added`);
      fetchData();
    }
    setUploading(false);
    e.target.value = '';
  };

  const handlePause = async (id: string) => {
    try {
      await torrentService.pause(id);
      fetchData();
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await torrentService.resume(id);
      fetchData();
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const { confirmed, deleteFiles } = await confirmDelete(name);
    if (!confirmed) return;
    try {
      await torrentService.delete(id, deleteFiles);
      toast.success('Deleted');
      fetchData();
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { all: torrents.length, downloading: 0, seeding: 0, paused: 0, completed: 0, error: 0 };
    torrents.forEach(t => {
      if ((t.progress ?? 0) >= 100) counts.completed++;
      else if (t.status === 'downloading') counts.downloading++;
      else if (t.status === 'seeding') counts.seeding++;
      else if (t.status === 'paused') counts.paused++;
      else if (t.status === 'error') counts.error++;
    });
    return counts;
  }, [torrents]);

  return (
    <div 
      className="max-w-6xl mx-auto px-4 py-6 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-40 bg-bg-primary/90 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-accent flex items-center justify-center mx-auto mb-4">
              <Upload size={24} className="text-accent" />
            </div>
            <p className="text-lg font-medium text-text-primary">Drop .torrent files here</p>
            <p className="text-sm text-text-tertiary mt-1">or drop a magnet link</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Downloads</h1>
          <button 
            onClick={fetchData}
            className="p-1.5 text-text-tertiary hover:text-text-secondary transition-colors"
            title="Refresh (R)"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-muted rounded cursor-pointer transition-colors">
            <Upload size={15} />
            <span className="hidden sm:inline">{uploading ? 'Uploading...' : 'Upload'}</span>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".torrent"
              multiple
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={uploading} 
            />
          </label>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent hover:bg-accent-hover text-white rounded transition-colors"
            title="Add magnet (N)"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>

      {/* Stats bar + Speed Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Speed Graph - takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <SpeedGraph />
        </div>

        {/* Stats */}
        {stats && (
          <div className="bg-bg-secondary rounded-lg border border-border-subtle p-4">
            <div className="text-xs font-medium text-text-secondary mb-3">System Stats</div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Users" value={stats.database.totalUsers} />
              <StatCard label="Torrents" value={stats.database.totalTorrents} />
              <StatCard label="Active" value={stats.engine.activeTorrents} highlight />
              <StatCard label="Downloaded" value={formatSize(stats.engine.totalDownloaded)} />
              <StatCard label="Uploaded" value={formatSize(stats.engine.totalUploaded)} />
              <StatCard label="Ratio" value={
                stats.engine.totalDownloaded > 0 
                  ? (stats.engine.totalUploaded / stats.engine.totalDownloaded).toFixed(2)
                  : '—'
              } />
            </div>
          </div>
        )}
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        {/* Status tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {(['all', 'downloading', 'seeding', 'paused', 'completed', 'error'] as StatusFilter[]).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 text-xs rounded whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-bg-tertiary text-text-primary'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              {statusCounts[status] > 0 && (
                <span className="ml-1 text-text-tertiary">({statusCounts[status]})</span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 sm:max-w-xs relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            data-search
            type="text"
            placeholder="Search... (/)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-tertiary border border-border-subtle rounded pl-8 pr-8 py-1.5 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="hidden sm:flex items-center gap-4 text-xs text-text-secondary ml-auto">
            <span className="flex items-center gap-1">
              <ArrowDown size={12} className="text-accent" />
              {formatSpeed(stats.downloadSpeed || 0)}
            </span>
            <span className="flex items-center gap-1">
              <ArrowUp size={12} className="text-green-500" />
              {formatSpeed(stats.uploadSpeed || 0)}
            </span>
          </div>
        )}
      </div>

      {/* Torrent list */}
      <div className="border border-border-subtle rounded-md overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 bg-bg-secondary text-xs text-text-tertiary border-b border-border-subtle">
          <SortHeader field="name" current={sortField} dir={sortDir} onSort={handleSort} className="col-span-5">
            Name
          </SortHeader>
          <SortHeader field="size" current={sortField} dir={sortDir} onSort={handleSort} className="col-span-2">
            Size
          </SortHeader>
          <SortHeader field="progress" current={sortField} dir={sortDir} onSort={handleSort} className="col-span-2">
            Progress
          </SortHeader>
          <SortHeader field="speed" current={sortField} dir={sortDir} onSort={handleSort} className="col-span-2">
            Speed
          </SortHeader>
          <div className="col-span-1"></div>
        </div>

        {/* Rows */}
        {loading && torrents.length === 0 ? (
          <div className="py-16 text-center">
            <RefreshCw size={20} className="animate-spin text-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-text-tertiary">Loading torrents...</p>
          </div>
        ) : filteredTorrents.length === 0 ? (
          <div className="py-16 text-center">
            {torrents.length === 0 ? (
              <>
                <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
                  <Plus size={20} className="text-text-tertiary" />
                </div>
                <p className="text-sm text-text-secondary mb-1">No torrents yet</p>
                <p className="text-xs text-text-tertiary mb-4">Add a magnet link or drop a .torrent file</p>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-white rounded transition-colors"
                  >
                    Add Magnet
                  </button>
                  <button
                    onClick={handleAddDemo}
                    className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-muted rounded transition-colors"
                  >
                    Try Demo
                  </button>
                </div>
                <p className="text-xs text-text-tertiary hidden sm:block">
                  <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">N</kbd> add magnet · 
                  <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary ml-1">U</kbd> upload file
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-3">
                  <Search size={20} className="text-text-tertiary" />
                </div>
                <p className="text-sm text-text-secondary mb-1">No matches</p>
                <p className="text-xs text-text-tertiary">Try adjusting your search or filters</p>
              </>
            )}
          </div>
        ) : (
          filteredTorrents.map((torrent) => (
            <TorrentRow 
              key={torrent._id || torrent.infoHash}
              torrent={torrent}
              onPause={() => handlePause(torrent.infoHash || torrent._id)}
              onResume={() => handleResume(torrent.infoHash || torrent._id)}
              onDelete={() => handleDelete(torrent.infoHash || torrent._id, torrent.name)}
              onClick={() => setSelectedTorrent(torrent)}
            />
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <h2 className="text-md font-semibold mb-4">Add Magnet Link</h2>
          <form onSubmit={handleAddMagnet}>
            <textarea 
              required
              rows={3}
              autoFocus
              placeholder="magnet:?xt=urn:btih:..."
              className="w-full bg-bg-tertiary border border-border-subtle rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-colors resize-none mb-2"
              value={magnetInput}
              onChange={(e) => setMagnetInput(e.target.value)}
            />
            <p className="text-xs text-text-tertiary mb-4">
              Paste a magnet link to add a torrent
            </p>
            <div className="flex gap-2 justify-end">
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={!magnetInput.trim()}
                className="px-3 py-1.5 text-sm bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded transition-colors"
              >
                Add
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail Modal */}
      {selectedTorrent && (
        <TorrentDetailModal 
          torrent={selectedTorrent} 
          onClose={() => setSelectedTorrent(null)} 
        />
      )}
    </div>
  );
};

// ==================== Sort Header ====================
const SortHeader: React.FC<{
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (field: SortField) => void;
  className?: string;
  children: React.ReactNode;
}> = ({ field, current, dir, onSort, className, children }) => {
  const isActive = current === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-left hover:text-text-secondary transition-colors ${className} ${
        isActive ? 'text-text-primary' : ''
      }`}
    >
      {children}
      {isActive && (
        dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      )}
    </button>
  );
};

// ==================== Torrent Row ====================
interface TorrentRowProps {
  torrent: Torrent;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
  onClick: () => void;
}

const TorrentRow: React.FC<TorrentRowProps> = ({ torrent, onPause, onResume, onDelete, onClick }) => {
  const progress = torrent.progress ?? 0;
  const isPaused = torrent.status === 'paused';
  const isComplete = progress >= 100;
  const isError = torrent.status === 'error';
  const isDownloading = torrent.status === 'downloading';
  
  // Status dot color
  const statusDot = {
    downloading: 'bg-accent',
    seeding: 'bg-green-500',
    paused: 'bg-text-tertiary',
    error: 'bg-red-500',
    completed: 'bg-green-500',
  }[torrent.status] || 'bg-text-tertiary';

  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 py-3 border-b border-border-subtle last:border-b-0 hover:bg-bg-secondary/50 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      {/* Name + status */}
      <div className="sm:col-span-5 min-w-0 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot} ${isDownloading ? 'animate-pulse' : ''}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text-primary truncate" title={torrent.name}>
            {torrent.name}
          </p>
          {/* Mobile: size + status */}
          <p className="text-xs text-text-tertiary sm:hidden">
            {formatSize(torrent.size || 0)}
            {isError && <span className="text-red-500 ml-2">Error</span>}
          </p>
        </div>
      </div>

      {/* Size */}
      <div className="hidden sm:flex sm:col-span-2 items-center text-sm text-text-secondary">
        {formatSize(torrent.size || 0)}
      </div>

      {/* Progress */}
      <div className="sm:col-span-2 flex items-center">
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                isError ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-accent'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span className="text-xs text-text-secondary w-10 text-right tabular-nums">
            {progress.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Speed */}
      <div className="hidden sm:flex sm:col-span-2 items-center text-xs text-text-secondary">
        {isDownloading && (
          <div className="flex flex-col">
            <span className="flex items-center gap-1">
              <ArrowDown size={11} className="text-accent" />
              {formatSpeed(torrent.downloadSpeed || 0)}
            </span>
            {(torrent.uploadSpeed || 0) > 0 && (
              <span className="flex items-center gap-1">
                <ArrowUp size={11} className="text-green-500" />
                {formatSpeed(torrent.uploadSpeed || 0)}
              </span>
            )}
          </div>
        )}
        {torrent.status === 'seeding' && (
          <span className="flex items-center gap-1">
            <ArrowUp size={11} className="text-green-500" />
            {formatSpeed(torrent.uploadSpeed || 0)}
          </span>
        )}
      </div>

      {/* Actions - visible on hover (desktop) or always (mobile) */}
      <div className="sm:col-span-1 flex items-center justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {isPaused ? (
          <ActionButton onClick={(e) => { e.stopPropagation(); onResume(); }} title="Resume">
            <Play size={14} />
          </ActionButton>
        ) : (
          <ActionButton onClick={(e) => { e.stopPropagation(); onPause(); }} title="Pause">
            <Pause size={14} />
          </ActionButton>
        )}
        <ActionButton onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete" danger>
          <Trash2 size={14} />
        </ActionButton>
      </div>
    </div>
  );
};

// ==================== Action Button ====================
const ActionButton: React.FC<{
  onClick: (e: React.MouseEvent) => void;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ onClick, title, danger, children }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      danger 
        ? 'text-text-tertiary hover:text-red-500 hover:bg-red-500/10' 
        : 'text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary'
    }`}
  >
    {children}
  </button>
);

// ==================== Modal ====================
const Modal: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => {
  // Close on Escape
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-bg-secondary border border-border-subtle rounded-lg p-5 max-w-md w-full animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

// ==================== Stat Pill ====================
const StatPill: React.FC<{
  label: string;
  value: string | number;
  highlight?: boolean;
}> = ({ label, value, highlight }) => (
  <div className="flex items-center gap-1.5 whitespace-nowrap">
    <span className="text-text-tertiary">{label}</span>
    <span className={`font-medium tabular-nums ${highlight ? 'text-accent' : 'text-text-primary'}`}>
      {value}
    </span>
  </div>
);

// ==================== Stat Card ====================
const StatCard: React.FC<{
  label: string;
  value: string | number;
  highlight?: boolean;
}> = ({ label, value, highlight }) => (
  <div className="bg-bg-tertiary rounded px-3 py-2">
    <div className="text-[10px] text-text-tertiary uppercase tracking-wide mb-0.5">{label}</div>
    <div className={`text-sm font-semibold tabular-nums ${highlight ? 'text-accent' : 'text-text-primary'}`}>
      {value}
    </div>
  </div>
);
