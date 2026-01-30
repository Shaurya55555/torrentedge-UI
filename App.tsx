import React, { useState, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { LoginPage } from './pages/LoginPage';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import { healthService, userService } from './services/api';
import { UserProfile } from './types';

type Page = 'dashboard' | 'settings';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('te_token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [healthStatus, setHealthStatus] = useState<'ok' | 'error' | 'loading'>('loading');
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await healthService.check();
        setHealthStatus('ok');
      } catch {
        setHealthStatus('error');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user profile when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      userService.getProfile()
        .then(setUser)
        .catch(() => setUser(null));
    } else {
      setUser(null);
    }
  }, [isAuthenticated]);

  const handleAuthSuccess = (token: string) => {
    localStorage.setItem('te_token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('te_token');
    setIsAuthenticated(false);
    setUser(null);
  };

  // Error state
  if (healthStatus === 'error') {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-text-secondary mb-4">
            Cannot connect to TorrentEdge server.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded text-sm hover:bg-bg-tertiary transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ConfirmProvider>
      <ToastProvider>
        <div className="min-h-screen bg-bg-primary text-text-primary">
          <Navbar 
            isAuthenticated={isAuthenticated} 
            onLogout={handleLogout}
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            username={user?.username}
          />
          
          <main className="pt-12 pb-16 sm:pb-6">
            {isAuthenticated ? (
              currentPage === 'settings' ? <Settings /> : <Dashboard />
            ) : (
              <LoginPage onAuthSuccess={handleAuthSuccess} />
            )}
          </main>

          {/* Mobile bottom nav */}
          {isAuthenticated && (
            <MobileNav 
              currentPage={currentPage}
              onNavigate={setCurrentPage}
              onLogout={handleLogout}
            />
          )}
        </div>
      </ToastProvider>
    </ConfirmProvider>
  );
};

export default App;
