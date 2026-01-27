
import React, { useState } from 'react';
import { authService } from '../services/api';
import { Shield, Key, Mail, User, ArrowRight, Loader2 } from 'lucide-react';

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
      let res;
      if (isLogin) {
        res = await authService.login({
          email: formData.email,
          password: formData.password,
        });
      } else {
        res = await authService.register(formData);
      }
      onAuthSuccess(res.token);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6">
      <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 sm:p-10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500 mb-6">
            <Shield size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isLogin ? 'Welcome Back' : 'Create Secure Identity'}
          </h2>
          <p className="text-gray-500 text-sm">
            {isLogin 
              ? 'Authorized access to TorrentEdge control plane.' 
              : 'Join the distributed network and start seeding.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="text" 
                  required
                  placeholder="Username"
                  className="w-full bg-[#0a0a0b] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
            </div>
          )}
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="email" 
                required
                placeholder="Email Address"
                className="w-full bg-[#0a0a0b] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="password" 
                required
                placeholder="Secure Password"
                className="w-full bg-[#0a0a0b] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-4"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isLogin ? 'Access Console' : 'Initialize Node'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-gray-500 text-sm mb-2">
            {isLogin ? "New to the Edge?" : "Already verified?"}
          </p>
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-500 font-bold hover:text-indigo-400 transition-colors"
          >
            {isLogin ? 'Register Node' : 'Log In Instead'}
          </button>
        </div>
      </div>
    </div>
  );
};
