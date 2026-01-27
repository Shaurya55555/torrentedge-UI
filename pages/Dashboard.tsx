
import React, { useState, useEffect, useCallback } from 'react';
import { torrentService, systemService, fileService } from '../services/api';
import { Torrent, SystemStats } from '../types';
import { StatsSection } from '../components/StatsSection';
import { TorrentCard } from '../components/TorrentCard';
import { Plus, Search, Filter, Upload, Zap, RefreshCw } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [magnetInput, setMagnetInput] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [torrentList, systemStats] = await Promise.all([
        torrentService.list(),
        systemService.getStats()
      ]);
      setTorrents(torrentList);
      setStats(systemStats);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Live-ish updates
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAddTorrent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magnetInput) return;
    try {
      await torrentService.create({
        name: `New Torrent ${Date.now()}`,
        magnetURI: magnetInput,
        size: 0
      });
      setMagnetInput('');
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to add torrent');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await fileService.upload(formData);
      fetchData();
    } catch (err) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const filteredTorrents = torrents.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.includes(searchQuery)
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
            Add Torrent
          </button>
          <label className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-gray-300 rounded-xl font-semibold transition-all cursor-pointer">
            <Upload size={20} />
            {uploading ? 'Processing...' : 'Upload File'}
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <StatsSection stats={stats} />

      {/* Main Content */}
      <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Filter by name or hash ID..."
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
              <TorrentCard key={torrent.id} torrent={torrent} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500 border-2 border-dashed border-white/5 rounded-2xl">
            <p className="font-medium">No active torrents found matching your query.</p>
          </div>
        )}
      </div>

      {/* Magnet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Torrent</h2>
            <form onSubmit={handleAddTorrent}>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Magnet URI</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="magnet:?xt=urn:btih:..."
                    className="w-full bg-[#0a0a0b] border border-white/10 rounded-xl p-4 text-sm mono focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                    value={magnetInput}
                    onChange={(e) => setMagnetInput(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Initiate Download
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
    </div>
  );
};
