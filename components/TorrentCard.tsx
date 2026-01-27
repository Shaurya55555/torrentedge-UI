
import React from 'react';
import { Torrent } from '../types';
import { Download, Upload, Server, Play, Pause, Trash2, Info } from 'lucide-react';

interface TorrentCardProps {
  torrent: Torrent;
}

export const TorrentCard: React.FC<TorrentCardProps> = ({ torrent }) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    downloading: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    seeding: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
    paused: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
    error: 'bg-rose-500/20 text-rose-500 border-rose-500/30',
    completed: 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30',
  };

  return (
    <div className="group bg-zinc-900/40 border border-white/5 rounded-2xl p-5 hover:bg-zinc-900/60 transition-all border-l-4 border-l-transparent hover:border-l-indigo-500">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-white truncate max-w-[200px] sm:max-w-md lg:max-w-lg mb-1" title={torrent.name}>
            {torrent.name}
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="font-medium">{formatSize(torrent.size)}</span>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] uppercase font-bold tracking-widest ${statusColors[torrent.status]}`}>
              {torrent.status}
            </span>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
            <Play size={16} />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${torrent.status === 'downloading' ? 'bg-blue-500' : 'bg-emerald-500'}`}
            style={{ width: `${torrent.progress ?? 0}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
          <span>{torrent.progress ?? 0}% PROGRESS</span>
          <span>EST: 4M 20S</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Download size={14} className="text-blue-500" />
          <span>{torrent.seeders} Seeders</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Upload size={14} className="text-rose-500" />
          <span>{torrent.leechers} Leechers</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
          <Server size={14} className="text-indigo-500" />
          <span>Peers: 12</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
          <Info size={14} className="text-emerald-500" />
          <span>ID: {torrent.id.slice(0, 8)}</span>
        </div>
      </div>
    </div>
  );
};
