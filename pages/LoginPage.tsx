import React, { useState } from 'react';
import { authService } from '../services/api';
import { Mail, Key, User, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onAuthSuccess: (token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = isLogin 
        ? await authService.login({ email: formData.email, password: formData.password })
        : await authService.register(formData);
      onAuthSuccess(res.token);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-lg font-semibold text-text-primary mb-1">
            {isLogin ? 'Sign in' : 'Create account'}
          </h1>
          <p className="text-sm text-text-tertiary">
            {isLogin ? 'Welcome back' : 'Get started with TorrentEdge'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
              <input 
                type="text" 
                required
                placeholder="Username"
                className="w-full bg-bg-tertiary border border-border-subtle rounded px-3 py-2.5 pl-10 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-colors"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
            <input 
              type="email" 
              required
              placeholder="Email"
              className="w-full bg-bg-tertiary border border-border-subtle rounded px-3 py-2.5 pl-10 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-colors"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
            <input 
              type="password" 
              required
              placeholder="Password"
              className="w-full bg-bg-tertiary border border-border-subtle rounded px-3 py-2.5 pl-10 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-colors"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
          >
            {loading ? (
              <Loader2 className="animate-spin mx-auto" size={18} />
            ) : (
              isLogin ? 'Sign in' : 'Create account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-text-secondary hover:text-accent transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};
