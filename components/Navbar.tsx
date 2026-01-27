
import React from 'react';
import { Activity, ShieldCheck, LogOut, Terminal } from 'lucide-react';

interface NavbarProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isAuthenticated, onLogout }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-white/5 z-50">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-500 font-bold text-xl tracking-tight">
          <Terminal size={24} />
          <span className="text-white">Torrent<span className="text-indigo-500">Edge</span></span>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-gray-400">
            <span className="flex items-center gap-1.5"><Activity size={14} className="text-emerald-500" /> API: Live</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-indigo-500" /> SSL Active</span>
          </div>
          
          {isAuthenticated && (
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-sm hover:bg-zinc-800 transition-all text-gray-300"
            >
              <LogOut size={16} />
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

const LucideIcon = ({ name, size = 16, className = "" }: { name: string, size?: number, className?: string }) => {
  // Helper for rendering icons dynamically if needed
  return <div className={className}>Icon</div>;
}
