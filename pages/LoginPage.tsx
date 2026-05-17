import React, { useState, useEffect, useRef, useCallback } from 'react';
import { authService } from '../services/api';
import { Mail, Key, User, Loader2 } from 'lucide-react';

// Extend window for Google's GSI
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, options: any) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface LoginPageProps {
  onAuthSuccess: (token: string) => void;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const LoginPage: React.FC<LoginPageProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // Stable callback for Google Sign-In
  const handleGoogleResponse = useCallback(async (response: any) => {
    console.log('[Google Auth] Response received:', response);
    
    if (!response.credential) {
      console.error('[Google Auth] No credential in response:', response);
      setError('Google authentication failed: No credential received');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('[Google Auth] Sending credential to backend...');
      const data = await authService.googleAuth(response.credential);
      console.log('[Google Auth] Backend response:', data);
      onAuthSuccess(data.token);
    } catch (err: any) {
      console.error('[Google Auth] Backend error:', err);
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  }, [onAuthSuccess]);

  // Initialize Google Sign-In
  useEffect(() => {
    let checkInterval: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let mounted = true;

    const initializeGoogle = () => {
      if (!mounted) return;
      
      // Skip Google initialization if no client ID configured
      if (!GOOGLE_CLIENT_ID) {
        console.warn('[Google Auth] No VITE_GOOGLE_CLIENT_ID configured, Google Sign-In disabled');
        setGoogleLoaded(false);
        return;
      }
      
      if (!window.google) {
        console.error('[Google Auth] Google SDK not loaded');
        return;
      }
      
      if (!googleButtonRef.current) {
        console.warn('[Google Auth] Button ref not ready, retrying...');
        setTimeout(initializeGoogle, 100);
        return;
      }

      console.log('[Google Auth] Initializing with client ID:', GOOGLE_CLIENT_ID.substring(0, 20) + '...');
      
      try {
        // Cancel any previous Google prompt
        if (isInitializedRef.current) {
          window.google.accounts.id.cancel();
        }
        
        // Clear previous button content
        googleButtonRef.current.innerHTML = '';
        
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          use_fedcm_for_prompt: false,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: 320,
          text: isLogin ? 'signin_with' : 'signup_with',
          shape: 'rectangular',
        });
        
        isInitializedRef.current = true;
        setGoogleLoaded(true);
        console.log('[Google Auth] Initialization complete');
      } catch (err) {
        console.error('[Google Auth] Initialization error:', err);
        setError('Failed to initialize Google Sign-In');
      }
    };

    // Check if Google script is already loaded
    if (window.google) {
      console.log('[Google Auth] Google SDK already loaded');
      initializeGoogle();
    } else {
      console.log('[Google Auth] Waiting for Google SDK to load...');
      // Wait for script to load
      checkInterval = setInterval(() => {
        if (window.google) {
          if (checkInterval) clearInterval(checkInterval);
          initializeGoogle();
        }
      }, 100);

      // Timeout after 10 seconds
      timeoutId = setTimeout(() => {
        if (checkInterval) clearInterval(checkInterval);
        if (mounted && !window.google) {
          console.error('[Google Auth] Google SDK failed to load (timeout)');
          setError('Google Sign-In unavailable. Please try email login or disable ad blockers.');
        }
      }, 10000);
    }

    // Cleanup function
    return () => {
      mounted = false;
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutId) clearTimeout(timeoutId);
      // Cancel Google prompt on unmount
      if (window.google && isInitializedRef.current) {
        try {
          window.google.accounts.id.cancel();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [isLogin, handleGoogleResponse]);

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

        {/* Google Sign-In Button - only show if configured */}
        {GOOGLE_CLIENT_ID && (
          <>
            <div className="mb-6 flex justify-center min-h-[44px]">
              {!googleLoaded && !error && (
                <div className="flex items-center gap-2 text-text-tertiary text-sm">
                  <Loader2 className="animate-spin" size={16} />
                  <span>Loading Google Sign-In...</span>
                </div>
              )}
              <div 
                ref={googleButtonRef} 
                className={googleLoaded ? '' : 'hidden'}
              ></div>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-subtle"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-bg-primary text-text-tertiary">or continue with email</span>
              </div>
            </div>
          </>
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
