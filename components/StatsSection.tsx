import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Hash, Wifi, HardDrive, ArrowDown, ArrowUp } from 'lucide-react';
import { SystemStats } from '../types';

interface StatsSectionProps {
  stats: SystemStats | null;
}

export const StatsSection: React.FC<StatsSectionProps> = ({ stats }) => {
  // Placeholder data for chart (would be replaced with real time-series data)
  const chartData = [
    { name: 'Mon', download: 40, upload: 20 },
    { name: 'Tue', download: 30, upload: 15 },
    { name: 'Wed', download: 65, upload: 35 },
    { name: 'Thu', download: 45, upload: 25 },
    { name: 'Fri', download: 90, upload: 50 },
    { name: 'Sat', download: 75, upload: 40 },
    { name: 'Sun', download: 95, upload: 55 },
  ];

  const formatSpeed = (bytesPerSec: number) => {
    if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
    return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
      {/* Stats Cards */}
      <div className="space-y-4 lg:col-span-1">
        <StatCard 
          icon={<Users size={20} />} 
          label="Total Users" 
          value={stats?.database?.totalUsers ?? '...'} 
          color="indigo" 
        />
        <StatCard 
          icon={<Hash size={20} />} 
          label="Total Torrents" 
          value={stats?.database?.totalTorrents ?? '...'} 
          color="emerald" 
        />
        <StatCard 
          icon={<Wifi size={20} />} 
          label="Active Torrents" 
          value={stats?.engine?.activeTorrents ?? stats?.database?.activeTorrents ?? '...'} 
          color="blue" 
        />
        <StatCard 
          icon={<HardDrive size={20} />} 
          label="Total Downloaded" 
          value={formatSize(stats?.engine?.totalDownloaded ?? 0)} 
          color="rose" 
        />
      </div>

      {/* Chart Section */}
      <div className="lg:col-span-3 bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-300">Network Activity</h3>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <ArrowDown size={14} className="text-blue-500" />
              <span className="text-gray-400">
                {formatSpeed(stats?.engine?.totalDownloadSpeed ?? 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUp size={14} className="text-emerald-500" />
              <span className="text-gray-400">
                {formatSpeed(stats?.engine?.totalUploadSpeed ?? 0)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Speed Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-400 text-sm mb-1">
              <ArrowDown size={16} />
              Download Speed
            </div>
            <div className="text-2xl font-bold text-white">
              {formatSpeed(stats?.engine?.totalDownloadSpeed ?? 0)}
            </div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-400 text-sm mb-1">
              <ArrowUp size={16} />
              Upload Speed
            </div>
            <div className="text-2xl font-bold text-white">
              {formatSpeed(stats?.engine?.totalUploadSpeed ?? 0)}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48 min-h-[192px] w-full">
          <ResponsiveContainer width="100%" height={192}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorDownload" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorUpload" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                itemStyle={{ color: '#e4e4e7' }}
              />
              <Area type="monotone" dataKey="download" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDownload)" strokeWidth={2} />
              <Area type="monotone" dataKey="upload" stroke="#10b981" fillOpacity={1} fill="url(#colorUpload)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string | number, color: string }) => {
  const colorMap: Record<string, string> = {
    indigo: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl border ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
};
