
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Users, Hash, Wifi, HardDrive } from 'lucide-react';
import { SystemStats } from '../types';

interface StatsSectionProps {
  stats: SystemStats | null;
}

export const StatsSection: React.FC<StatsSectionProps> = ({ stats }) => {
  const data = [
    { name: 'Mon', active: 40 },
    { name: 'Tue', active: 30 },
    { name: 'Wed', active: 65 },
    { name: 'Thu', active: 45 },
    { name: 'Fri', active: 90 },
    { name: 'Sat', active: 75 },
    { name: 'Sun', active: 95 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
      {/* Stats Cards */}
      <div className="space-y-4 lg:col-span-1">
        <StatCard 
          icon={<Users size={20} />} 
          label="Total Users" 
          value={stats?.totalUsers ?? '...'} 
          color="indigo" 
        />
        <StatCard 
          icon={<Hash size={20} />} 
          label="Total Torrents" 
          value={stats?.totalTorrents ?? '...'} 
          color="emerald" 
        />
        <StatCard 
          icon={<Wifi size={20} />} 
          label="Active Peers" 
          value={stats?.activePeers ?? '...'} 
          color="blue" 
        />
        <StatCard 
          icon={<HardDrive size={20} />} 
          label="Network Health" 
          value="99.9%" 
          color="rose" 
        />
      </div>

      {/* Chart Section */}
      <div className="lg:col-span-3 bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-300">Network Activity Tracking</h3>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Download</span>
            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Upload</span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                itemStyle={{ color: '#e4e4e7' }}
              />
              <Area type="monotone" dataKey="active" stroke="#6366f1" fillOpacity={1} fill="url(#colorActive)" strokeWidth={2} />
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
}
