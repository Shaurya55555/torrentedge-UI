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
  ArrowDown, ArrowUp, ChevronUp, ChevronDown, Search, X,
  FileUp, Link, FolderInput, CheckCircle2, AlertTriangle, Copy,
  Settings2, PlusCircle, Lock, Download, Share2, ExternalLink
} from 'lucide-react';
import { QRCode } from '../components/QRCode';

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

let dashboardPollRefCount = 0;
let dashboardPollInterval: ReturnType<typeof setInterval> | null = null;

const startDashboardPolling = (poll: () => void, intervalMs: number) => {
  if (!dashboardPollInterval) {
    dashboardPollInterval = setInterval(poll, intervalMs);
  }
  dashboardPollRefCount += 1;
};

const stopDashboardPolling = () => {
  dashboardPollRefCount = Math.max(0, dashboardPollRefCount - 1);
  if (dashboardPollRefCount === 0 && dashboardPollInterval) {
    clearInterval(dashboardPollInterval);
    dashboardPollInterval = null;
  }
};

export const Dashboard: React.FC = () => {
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTorrent, setSelectedTorrent] = useState<Torrent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'magnet' | 'upload' | 'create'>('magnet');
  const [magnetInput, setMagnetInput] = useState('');
  const [uploading, setUploading] = useState(false);
  // Create-from-file tab state
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [createName, setCreateName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState<{
    magnetURI: string;
    infoHash: string;
    torrentFileName: string;
    torrentFileB64: string;   // base64 .torrent for client-side download
    name: string;
    fileSize: number;
    pieceCount: number;
    warnings?: string[];
  } | null>(null);
  // Advanced options (collapsible)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advPieceSize, setAdvPieceSize] = useState<256 | 512 | 1024>(256);
  const [advPrivate, setAdvPrivate] = useState(false);
  const [advTrackers, setAdvTrackers] = useState<string[]>([]);
  const [advTrackerInput, setAdvTrackerInput] = useState('');
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

  // Hashing progress state (for Create from File)
  const [hashProgress, setHashProgress] = useState<{
    fileName: string;
    percent: number;
    done: boolean;
  } | null>(null);

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
    onHashProgress: useCallback((data) => {
      if (data.done) {
        // Keep at 100% briefly so user sees it, then clear
        setHashProgress({ fileName: data.fileName, percent: 100, done: true });
        setTimeout(() => setHashProgress(null), 800);
      } else {
        setHashProgress({ fileName: data.fileName, percent: data.percent, done: false });
      }
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
    const pollOnce = () => {
      if (document.visibilityState !== 'visible') return;
      fetchData();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pollOnce();
      }
    };

    pollOnce();
    startDashboardPolling(pollOnce, 15000);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopDashboardPolling();
    };
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
          closeAddModal();
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
      const result = await torrentService.addMagnet(magnetInput);
      setMagnetInput('');
      closeAddModal();
      // Backend returns 200 with message when torrent already in user's list
      if ((result as any).message === 'Already in your list') {
        toast.info('Already added', 'This torrent is already in your list');
      } else {
        toast.success('Added', 'Torrent added successfully');
      }
      fetchData();
    } catch (err: any) {
      toast.error('Error', err.message || 'Failed to add torrent');
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    // Reset create-from-file state so next open is fresh
    setTimeout(() => {
      setAddModalTab('magnet');
      setCreateFile(null);
      setCreateName('');
      setCreateResult(null);
      setHashProgress(null);
      setShowAdvanced(false);
      setAdvPieceSize(256);
      setAdvPrivate(false);
      setAdvTrackers([]);
      setAdvTrackerInput('');
    }, 200);
  };

  const handleCreateFromFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFile) return;
    setCreateLoading(true);
    setCreateResult(null);
    try {
      const res = await torrentService.createFromFile(createFile, createName || undefined, {
        pieceSize:   advPieceSize * 1024,   // convert KB → bytes
        private:     advPrivate,
        trackers:    advTrackers.length > 0 ? advTrackers : undefined,
      });
      setCreateResult({
        magnetURI:       res.magnetURI,
        infoHash:        res.infoHash,
        torrentFileName: res.torrentFileName,
        torrentFileB64:  res.torrentFile,
        name:            res.torrent.name,
        fileSize:        res.fileSize,
        pieceCount:      res.pieceCount,
        warnings:        res.warnings,
      });
      toast.success('Torrent created', `"${res.torrent.name}" is now seeding`);
      fetchData();
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        toast.info('Already seeding', 'This file was already added');
      } else {
        toast.error('Error', err.message || 'Failed to create torrent');
      }
    } finally {
      setCreateLoading(false);
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

  // 4.4 — owned vs leeching breakdown
  const ownershipCounts = useMemo(() => ({
    owned:    torrents.filter(t => t.isOwner !== false).length,
    leeching: torrents.filter(t => t.isOwner === false).length,
  }), [torrents]);

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
            {/* 4.4 — ownership breakdown */}
            <div className="mt-3 pt-3 border-t border-border-subtle grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-[11px] text-text-tertiary">Seeding</span>
                <span className="text-[11px] font-semibold text-text-primary ml-auto">{ownershipCounts.owned}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="text-[11px] text-text-tertiary">Leeching</span>
                <span className="text-[11px] font-semibold text-text-primary ml-auto">{ownershipCounts.leeching}</span>
              </div>
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
        <Modal onClose={closeAddModal}>
          {/* ── Tab Bar ── */}
          <div className="flex gap-1 mb-5 bg-bg-tertiary rounded-lg p-1">
            {([
              { id: 'magnet', label: 'Magnet Link',    Icon: Link       },
              { id: 'upload', label: 'Upload .torrent', Icon: FileUp     },
              { id: 'create', label: 'Create from File',Icon: FolderInput },
            ] as const).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => { setAddModalTab(id); setCreateResult(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                  addModalTab === id
                    ? 'bg-bg-primary text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{id === 'magnet' ? 'Magnet' : id === 'upload' ? 'Upload' : 'Create'}</span>
              </button>
            ))}
          </div>

          {/* ── Magnet Tab ── */}
          {addModalTab === 'magnet' && (
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
                <button type="button" onClick={closeAddModal} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                <button type="submit" disabled={!magnetInput.trim()} className="px-3 py-1.5 text-sm bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded transition-colors">Add</button>
              </div>
            </form>
          )}

          {/* ── Upload .torrent Tab ── */}
          {addModalTab === 'upload' && (
            <div>
              <p className="text-xs text-text-tertiary mb-3">Select a <code className="bg-bg-tertiary px-1 rounded">.torrent</code> file to upload</p>
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border-subtle rounded-lg cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all">
                <Upload size={22} className="text-text-tertiary mb-2" />
                <span className="text-sm text-text-secondary">Click to browse</span>
                <span className="text-xs text-text-tertiary mt-0.5">or drag a .torrent file here</span>
                <input
                  type="file"
                  accept=".torrent"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    try {
                      await torrentService.upload(file);
                      closeAddModal();
                      toast.success('Uploaded', `${file.name} added`);
                      fetchData();
                    } catch (err: any) {
                      toast.error('Upload failed', err.message);
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              </label>
              {uploading && (
                <p className="text-xs text-text-tertiary mt-2 text-center animate-pulse">Uploading…</p>
              )}
              <div className="flex justify-end mt-4">
                <button onClick={closeAddModal} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {/* ── Create from File Tab ── */}
          {addModalTab === 'create' && (
            <div>
              {/* ── Success / Result screen ── */}
              {createResult ? (
                <div>
                  {/* Header */}
                  <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border-subtle">
                    <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} className="text-green-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{createResult.name}</p>
                      <p className="text-xs text-green-500">Torrent created · now seeding</p>
                    </div>
                  </div>

                  {/* Warnings */}
                  {createResult.warnings && createResult.warnings.length > 0 && (
                    <div className="flex items-start gap-2 mb-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                      <AlertTriangle size={13} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-yellow-300 leading-relaxed">{createResult.warnings.join(' ')}</p>
                    </div>
                  )}

                  {/* Metadata pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-bg-tertiary rounded text-xs text-text-secondary border border-border-subtle">
                      {formatSize(createResult.fileSize)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-bg-tertiary rounded text-xs text-text-secondary border border-border-subtle">
                      {createResult.pieceCount} pieces
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-bg-tertiary rounded text-xs font-mono text-text-tertiary border border-border-subtle" title={createResult.infoHash}>
                      {createResult.infoHash.slice(0, 8)}…{createResult.infoHash.slice(-4)}
                    </span>
                  </div>

                  {/* Magnet link row */}
                  <div className="mb-3">
                    <label className="block text-xs text-text-tertiary mb-1.5 font-medium">Magnet Link</label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-bg-tertiary border border-border-subtle rounded px-3 py-2 min-w-0 overflow-hidden">
                        <p className="text-xs font-mono text-text-secondary truncate" title={createResult.magnetURI}>
                          {createResult.magnetURI}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(createResult!.magnetURI);
                          toast.success('Copied!', 'Magnet link ready to share');
                        }}
                        title="Copy magnet link"
                        className="px-2.5 py-1.5 bg-bg-tertiary border border-border-subtle rounded hover:border-accent/50 hover:text-accent transition-all flex-shrink-0 flex items-center gap-1 text-xs text-text-tertiary"
                      >
                        <Copy size={13} />
                        <span className="hidden sm:inline">Copy</span>
                      </button>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="mb-4">
                    <label className="block text-xs text-text-tertiary mb-2 font-medium">Scan to download</label>
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-bg-tertiary border border-border-subtle rounded-lg flex-shrink-0">
                        <QRCode value={createResult.magnetURI} size={240} className="w-[120px] h-[120px]" />
                      </div>
                      <div className="flex flex-col justify-center gap-1.5 pt-1">
                        <p className="text-xs text-text-secondary font-medium">Share this QR</p>
                        <p className="text-xs text-text-tertiary leading-relaxed">
                          Anyone who scans this can download directly from your machine — no middleman, no server.
                        </p>
                        <button
                          onClick={() => {
                            const canvas = document.querySelector<HTMLCanvasElement>('canvas[title="Scan to open magnet link"]');
                            if (!canvas) return;
                            const a = document.createElement('a');
                            a.href = canvas.toDataURL('image/png');
                            a.download = `${createResult!.name}-qr.png`;
                            a.click();
                          }}
                          className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-accent transition-colors w-fit mt-1"
                        >
                          <Download size={11} />
                          Save QR as PNG
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {/* Download .torrent */}
                    <button
                      onClick={() => {
                        const bytes   = atob(createResult!.torrentFileB64);
                        const arr     = new Uint8Array(bytes.length);
                        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
                        const blob    = new Blob([arr], { type: 'application/x-bittorrent' });
                        const url     = URL.createObjectURL(blob);
                        const a       = document.createElement('a');
                        a.href        = url;
                        a.download    = createResult!.torrentFileName;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded hover:border-accent/50 hover:text-accent transition-all text-text-secondary"
                    >
                      <Download size={13} />
                      Download .torrent
                    </button>

                    {/* Open in client */}
                    <a
                      href={createResult.magnetURI}
                      title="Open in torrent client"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded hover:border-accent/50 hover:text-accent transition-all text-text-secondary"
                    >
                      <ExternalLink size={13} />
                      Open in client
                    </a>

                    {/* Share CTA */}
                    {typeof navigator.share === 'function' ? (
                      <button
                        onClick={() => navigator.share({
                          title: createResult!.name,
                          text:  `Download "${createResult!.name}" via BitTorrent`,
                          url:   createResult!.magnetURI,
                        }).catch(() => {})}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent/10 border border-accent/30 rounded hover:bg-accent/20 transition-all text-accent font-medium"
                      >
                        <Share2 size={13} />
                        Share link
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `Download "${createResult!.name}" via BitTorrent:\n${createResult!.magnetURI}`
                          );
                          toast.success('Copied!', 'Share text copied to clipboard');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent/10 border border-accent/30 rounded hover:bg-accent/20 transition-all text-accent font-medium"
                      >
                        <Share2 size={13} />
                        Copy share text
                      </button>
                    )}
                  </div>

                  {/* Footer actions */}
                  <div className="flex gap-2 justify-end pt-3 border-t border-border-subtle">
                    <button
                      onClick={() => { setCreateFile(null); setCreateName(''); setCreateResult(null); setShowAdvanced(false); }}
                      className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Create another
                    </button>
                    <button onClick={closeAddModal} className="px-3 py-1.5 text-sm bg-accent hover:bg-accent-hover text-white rounded transition-colors">
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* Input state */
                <form onSubmit={handleCreateFromFile}>
                  <p className="text-xs text-text-tertiary mb-3">
                    Upload any file — TorrentEdge creates a <code className="bg-bg-tertiary px-1 rounded">.torrent</code> and starts seeding it immediately.
                  </p>

                  {/* File picker */}
                  <div className="mb-3">
                    <label className="block text-xs text-text-tertiary mb-1">File <span className="text-red-400">*</span></label>
                    {createFile ? (
                      <div className="flex items-center gap-2 bg-bg-tertiary border border-border-subtle rounded px-3 py-2">
                        <FolderInput size={14} className="text-accent flex-shrink-0" />
                        <span className="text-sm text-text-primary truncate flex-1">{createFile.name}</span>
                        <span className="text-xs text-text-tertiary flex-shrink-0">{formatSize(createFile.size)}</span>
                        <button
                          type="button"
                          onClick={() => { setCreateFile(null); setCreateName(''); }}
                          className="text-text-tertiary hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border-subtle rounded-lg cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all">
                        <FolderInput size={20} className="text-text-tertiary mb-1.5" />
                        <span className="text-sm text-text-secondary">Click to choose file</span>
                        <span className="text-xs text-text-tertiary mt-0.5">PDF, MP3, MP4, ZIP — anything</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            setCreateFile(f);
                            const base = f.name.replace(/\.[^.]+$/, '');
                            setCreateName(base);
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Name field */}
                  <div className="mb-3">
                    <label className="block text-xs text-text-tertiary mb-1">
                      Torrent name <span className="text-text-tertiary">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder={createFile?.name || 'My File'}
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      className="w-full bg-bg-tertiary border border-border-subtle rounded px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-colors"
                    />
                  </div>

                  {/* ── Advanced Options (collapsible) ── */}
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(v => !v)}
                      className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors w-full py-1"
                    >
                      <Settings2 size={12} />
                      <span>Advanced options</span>
                      {showAdvanced ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
                    </button>

                    {showAdvanced && (
                      <div className="mt-2 border border-border-subtle rounded-lg p-3 space-y-4 bg-bg-tertiary/40">

                        {/* Piece size */}
                        <div>
                          <label className="block text-xs text-text-tertiary mb-2">Piece size</label>
                          <div className="flex gap-2">
                            {([256, 512, 1024] as const).map((kb) => (
                              <button
                                key={kb}
                                type="button"
                                onClick={() => setAdvPieceSize(kb)}
                                className={`flex-1 py-1.5 text-xs rounded border transition-all ${
                                  advPieceSize === kb
                                    ? 'border-accent bg-accent/10 text-accent font-medium'
                                    : 'border-border-subtle text-text-tertiary hover:border-accent/40 hover:text-text-secondary'
                                }`}
                              >
                                {kb < 1024 ? `${kb} KB` : '1 MB'}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-text-tertiary mt-1.5">
                            {advPieceSize === 256  && 'Best for small files (< 64 MB). More pieces = better integrity checking.'}
                            {advPieceSize === 512  && 'Balanced. Good for files up to 512 MB.'}
                            {advPieceSize === 1024 && 'Best for large files (> 512 MB). Fewer pieces = faster hashing.'}
                          </p>
                        </div>

                        {/* Custom trackers */}
                        <div>
                          <label className="block text-xs text-text-tertiary mb-2">Custom trackers</label>
                          {advTrackers.length > 0 && (
                            <ul className="mb-2 space-y-1">
                              {advTrackers.map((url, i) => (
                                <li key={i} className="flex items-center gap-2 bg-bg-primary border border-border-subtle rounded px-2.5 py-1.5">
                                  <span className="text-xs font-mono text-text-secondary truncate flex-1">{url}</span>
                                  <button
                                    type="button"
                                    onClick={() => setAdvTrackers(ts => ts.filter((_, j) => j !== i))}
                                    className="text-text-tertiary hover:text-red-400 transition-colors flex-shrink-0"
                                  >
                                    <X size={12} />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="udp://tracker.opentrackr.org:1337/announce"
                              value={advTrackerInput}
                              onChange={(e) => setAdvTrackerInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const url = advTrackerInput.trim();
                                  if (url && !advTrackers.includes(url)) {
                                    setAdvTrackers(ts => [...ts, url]);
                                    setAdvTrackerInput('');
                                  }
                                }
                              }}
                              className="flex-1 bg-bg-primary border border-border-subtle rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const url = advTrackerInput.trim();
                                if (url && !advTrackers.includes(url)) {
                                  setAdvTrackers(ts => [...ts, url]);
                                  setAdvTrackerInput('');
                                }
                              }}
                              disabled={!advTrackerInput.trim()}
                              className="px-2.5 py-1.5 rounded border border-border-subtle text-text-tertiary hover:border-accent/50 hover:text-accent disabled:opacity-40 transition-all flex items-center gap-1"
                            >
                              <PlusCircle size={13} />
                            </button>
                          </div>
                          <p className="text-xs text-text-tertiary mt-1.5">
                            {advTrackers.length === 0
                              ? 'Leave empty to use default trackers. Press Enter or + to add.'
                              : `${advTrackers.length} custom tracker${advTrackers.length !== 1 ? 's' : ''} — default trackers will not be added.`}
                          </p>
                        </div>

                        {/* Private toggle */}
                        <div>
                          <button
                            type="button"
                            onClick={() => setAdvPrivate(v => !v)}
                            className={`flex items-center gap-3 w-full p-2.5 rounded border transition-all ${
                              advPrivate
                                ? 'border-accent/50 bg-accent/5'
                                : 'border-border-subtle hover:border-accent/30'
                            }`}
                          >
                            <Lock size={14} className={advPrivate ? 'text-accent' : 'text-text-tertiary'} />
                            <div className="text-left flex-1">
                              <p className={`text-xs font-medium ${advPrivate ? 'text-accent' : 'text-text-secondary'}`}>
                                Private torrent
                              </p>
                              <p className="text-xs text-text-tertiary">
                                {advPrivate
                                  ? 'DHT disabled — only tracked peers can connect'
                                  : 'DHT enabled — peers can find you without a tracker'}
                              </p>
                            </div>
                            {/* toggle pill */}
                            <div className={`w-8 h-4.5 rounded-full flex items-center transition-all flex-shrink-0 ${advPrivate ? 'bg-accent' : 'bg-bg-primary border border-border-subtle'}`}>
                              <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all mx-0.5 ${advPrivate ? 'translate-x-3.5' : 'translate-x-0'}`} />
                            </div>
                          </button>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* Hashing progress bar (shown while createLoading) */}
                  {createLoading && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-text-tertiary truncate max-w-[70%]">
                          {hashProgress ? `Hashing ${hashProgress.fileName}…` : 'Preparing…'}
                        </span>
                        <span className="text-xs font-mono text-text-secondary">
                          {hashProgress ? `${hashProgress.percent}%` : '0%'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-150"
                          style={{ width: `${hashProgress?.percent ?? 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-text-tertiary mt-1">
                        {hashProgress && !hashProgress.done
                          ? 'Computing SHA1 hashes for each piece…'
                          : hashProgress?.done
                            ? 'Hashing complete — saving…'
                            : 'Uploading file…'}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={closeAddModal} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                    <button
                      type="submit"
                      disabled={!createFile || createLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded transition-colors"
                    >
                      {createLoading ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          Creating…
                        </>
                      ) : (
                        <>
                          <FolderInput size={13} />
                          Create &amp; Seed
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
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

  // 4.2 — role badge: owner = seeding (green), leecher = leeching (blue)
  const roleBadge = torrent.isOwner === false
    ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20 flex-shrink-0">↓ Leeching</span>
    : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/15 text-green-400 border border-green-500/20 flex-shrink-0">↑ Seeding</span>;

  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 py-3 border-b border-border-subtle last:border-b-0 hover:bg-bg-secondary/50 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      {/* Name + status */}
      <div className="sm:col-span-5 min-w-0 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot} ${isDownloading ? 'animate-pulse' : ''}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm text-text-primary truncate" title={torrent.name}>
              {torrent.name}
            </p>
            {roleBadge}
          </div>
          {/* 4.3 — uploader username for leechers */}
          <p className="text-xs text-text-tertiary sm:hidden">
            {formatSize(torrent.size || 0)}
            {torrent.isOwner === false && torrent.uploadedBy?.username && (
              <span className="ml-2 text-text-tertiary">by {torrent.uploadedBy.username}</span>
            )}
            {isError && <span className="text-red-500 ml-2">Error</span>}
          </p>
          {torrent.isOwner === false && torrent.uploadedBy?.username && (
            <p className="hidden sm:block text-xs text-text-tertiary">
              uploaded by <span className="text-text-secondary">{torrent.uploadedBy.username}</span>
            </p>
          )}
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
