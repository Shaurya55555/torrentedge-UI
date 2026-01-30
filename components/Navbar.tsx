import React from 'react';
import { LogOut, Settings, LayoutDashboard, User } from 'lucide-react';
import { useConnectionStatus } from '../hooks/useConnectionStatus';

type Page = 'dashboard' | 'settings';

interface NavbarProps {
  isAuthenticated: boolean;
  onLogout: () => void;
  currentPage?: Page;
  onNavigate?: (page: Page) => void;
  username?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  isAuthenticated, 
  onLogout, 
  currentPage = 'dashboard', 
  onNavigate,
  username,
}) => {
  const { isConnected, showDisconnected } = useConnectionStatus();

  return (
    <nav className="fixed top-0 left-0 right-0 h-12 bg-bg-primary border-b border-border-subtle z-50">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-6">
          {/* Logo + Connection Status */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onNavigate?.('dashboard')}
              className="font-semibold text-text-primary hover:text-accent transition-colors"
            >
              TorrentEdge
            </button>
            {isAuthenticated && (
              <span 
                className={`w-2 h-2 rounded-full transition-colors ${
                  showDisconnected 
                    ? 'bg-red-500 animate-pulse' 
                    : isConnected 
                      ? 'bg-green-500' 
                      : 'bg-text-tertiary animate-pulse'
                }`}
                title={showDisconnected ? 'Disconnected — reconnecting...' : isConnected ? 'Connected' : 'Connecting...'}
              />
            )}
          </div>
          
          {/* Nav tabs - desktop */}
          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-1">
              <NavTab 
                active={currentPage === 'dashboard'} 
                onClick={() => onNavigate?.('dashboard')}
                icon={<LayoutDashboard size={15} />}
              >
                Downloads
              </NavTab>
              <NavTab 
                active={currentPage === 'settings'} 
                onClick={() => onNavigate?.('settings')}
                icon={<Settings size={15} />}
              >
                Settings
              </NavTab>
            </div>
          )}
        </div>

        {/* Right: User + Logout */}
        {isAuthenticated && (
          <div className="flex items-center gap-3">
            {/* Username */}
            {username && (
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-text-secondary">
                <User size={14} />
                <span>{username}</span>
              </div>
            )}
            
            {/* Logout */}
            <button 
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
              title={username ? `Logout ${username}` : 'Logout'}
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

// Simple nav tab component
const NavTab: React.FC<{
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ active, onClick, icon, children }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors
      ${active 
        ? 'text-text-primary bg-bg-tertiary' 
        : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
      }
    `}
  >
    {icon}
    {children}
  </button>
);
