import React, { useState, useEffect, useCallback } from 'react';
import { torrentService, statsService } from '../services/api';
import { Torrent, SystemStats } from '../types';
import { StatsSection } from '../components/StatsSection';
import { SpeedGraph } from '../components/SpeedGraph';
import { TorrentCard } from '../components/TorrentCard';
import { TorrentDetailModal } from '../components/TorrentDetailModal';
import { Plus, Search, Filter, Upload, Zap, RefreshCw } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTorrent, setSelectedTorrent] = useState<Torrent | null>(null);
  const [magnetInput, setMagnetInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [torrentList, systemStats] = await Promise.all([
        torrentService.list(),
        statsService.getGlobal()
      ]);
      setTorrents(torrentList);
      setStats(systemStats);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Live updates
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAddMagnet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magnetInput) return;
    try {
      await torrentService.addMagnet(magnetInput);
      setMagnetInput('');
      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add torrent');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.torrent')) {
      alert('Please upload a .torrent file');
      return;
    }

    setUploading(true);
    try {
      await torrentService.upload(file);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handlePause = async (id: string) => {
    try {
      await torrentService.pause(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to pause torrent');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await torrentService.resume(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to resume torrent');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this torrent?')) return;
    try {
      await torrentService.delete(id, false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete torrent');
    }
  };

  const filteredTorrents = torrents.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.infoHash?.includes(searchQuery) ||
    t._id?.includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Network Control Plane</h1>
          <p className="text-gray-400">Manage distributed torrent flows and peer-to-peer orchestration.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus size={20} />
            Add Magnet
          </button>
          <label className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-gray-300 rounded-xl font-semibold transition-all cursor-pointer">
            <Upload size={20} />
            {uploading ? 'Uploading...' : 'Upload .torrent'}
            <input 
              type="file" 
              accept=".torrent"
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={uploading} 
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      <StatsSection stats={stats} />

      {/* Live Speed Graph */}
      <div className="mb-8">
        <SpeedGraph refreshInterval={2000} />
      </div>

      {/* Main Content */}
      <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Filter by name or hash..."
              className="w-full bg-[#0a0a0b] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="p-2.5 bg-[#0a0a0b] border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors">
              <Filter size={20} />
            </button>
            <button onClick={fetchData} className="p-2.5 bg-[#0a0a0b] border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {loading && torrents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
            <Zap size={48} className="animate-pulse text-indigo-500" />
            <p className="font-medium">Initializing torrent subsystem...</p>
          </div>
        ) : filteredTorrents.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredTorrents.map((torrent) => (
              <TorrentCard 
                key={torrent._id || torrent.infoHash} 
                torrent={torrent}
                onPause={() => handlePause(torrent.infoHash || torrent._id)}
                onResume={() => handleResume(torrent.infoHash || torrent._id)}
                onDelete={() => handleDelete(torrent.infoHash || torrent._id)}
                onViewDetails={() => setSelectedTorrent(torrent)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500 border-2 border-dashed border-white/5 rounded-2xl">
            <p className="font-medium">No torrents found. Add one to get started!</p>
          </div>
        )}
      </div>

      {/* Magnet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-white mb-6">Add Magnet Link</h2>
            <form onSubmit={handleAddMagnet}>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Magnet URI</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="magnet:?xt=urn:btih:..."
                    className="w-full bg-[#0a0a0b] border border-white/10 rounded-xl p-4 text-sm font-mono focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                    value={magnetInput}
                    onChange={(e) => setMagnetInput(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Note: Magnet link support is experimental. For best results, upload a .torrent file.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Add Torrent
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 bg-zinc-800 hover:bg-zinc-700 text-gray-300 font-bold py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Torrent Detail Modal */}
      {selectedTorrent && (
        <TorrentDetailModal 
          torrent={selectedTorrent} 
          onClose={() => setSelectedTorrent(null)} 
        />
      )}
    </div>
  );
};
