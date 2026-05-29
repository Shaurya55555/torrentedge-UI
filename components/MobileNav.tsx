import React from 'react';
import { LayoutDashboard, Settings, LogOut, UploadCloud } from 'lucide-react';

type Page = 'dashboard' | 'settings' | 'dropzone';

interface MobileNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentPage, onNavigate, onLogout }) => {
  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-bg-primary border-t border-border-subtle z-50">
      <div className="flex h-full max-w-md mx-auto">
        <NavButton
          active={currentPage === 'dropzone'}
          onClick={() => onNavigate('dropzone')}
          icon={<UploadCloud size={20} />}
          label="Dropzone"
        />
        <NavButton
          active={currentPage === 'dashboard'}
          onClick={() => onNavigate('dashboard')}
          icon={<LayoutDashboard size={20} />}
          label="Downloads"
        />
        <NavButton
          active={currentPage === 'settings'}
          onClick={() => onNavigate('settings')}
          icon={<Settings size={20} />}
          label="Settings"
        />
        <button
          onClick={onLogout}
          className="flex-1 flex flex-col items-center justify-center gap-1 text-text-tertiary hover:text-red-400 hover:bg-bg-hover transition-colors"
        >
          <LogOut size={20} />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

const NavButton: React.FC<{
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-0.5 py-2 px-4 transition-colors ${
      active ? 'text-accent' : 'text-text-tertiary'
    }`}
  >
    {icon}
    <span className="text-[10px]">{label}</span>
  </button>
);
