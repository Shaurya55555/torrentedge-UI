
import React, { useState, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { Navbar } from './components/Navbar';
import { healthService } from './services/api';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('te_token'));
  const [healthStatus, setHealthStatus] = useState<'ok' | 'error' | 'loading'>('loading');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await healthService.check();
        setHealthStatus('ok');
      } catch (err) {
        setHealthStatus('error');
      }
    };
    checkHealth();
    
    // Polling health check
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAuthSuccess = (token: string) => {
    localStorage.setItem('te_token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('te_token');
    setIsAuthenticated(false);
  };

  if (healthStatus === 'error') {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6">
        <div className="bg-red-900/20 border border-red-500/50 p-8 rounded-xl text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-500 mb-4">System Offline</h1>
          <p className="text-gray-400 mb-6">TorrentEdge backend services are currently unreachable. Please ensure the server is running and try again.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-gray-200">
      <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
      <main className="pt-20 pb-12">
        {isAuthenticated ? (
          <Dashboard />
        ) : (
          <LoginPage onAuthSuccess={handleAuthSuccess} />
        )}
      </main>
    </div>
  );
};

export default App;
