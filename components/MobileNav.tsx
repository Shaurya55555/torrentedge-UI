import React from 'react';
import { LayoutDashboard, Settings, LogOut } from 'lucide-react';

type Page = 'dashboard' | 'settings';

interface MobileNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentPage, onNavigate, onLogout }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-14 bg-bg-primary border-t border-border-subtle z-50 sm:hidden">
      <div className="h-full flex items-center justify-around">
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
        <NavButton 
          onClick={onLogout}
          icon={<LogOut size={20} />}
          label="Logout"
        />
      </div>
    </nav>
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
