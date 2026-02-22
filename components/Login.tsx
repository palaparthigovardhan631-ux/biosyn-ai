
import React, { useState, useEffect, useRef } from 'react';
import { Language, User } from '../types';
import { translations } from '../translations';

interface LoginProps {
  onLogin: (userData: User) => void;
  language: Language;
}

function decodeJwt(token: string): any {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const binString = atob(base64);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
      bytes[i] = binString.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

export default function Login({ onLogin, language }: LoginProps) {
  const t = translations[language] || translations['English'];
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gsiStatus, setGsiStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [hasApiKey, setHasApiKey] = useState(true);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    const checkApiKey = async () => {
      if ((window as any).aistudio) {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    
    const initializeGoogleSignIn = () => {
      if (!isMounted.current) return;
      
      try {
        const google = (window as any).google;
        if (google?.accounts?.id) {
          google.accounts.id.initialize({
            client_id: "773413926369-biosyn-demo-access-portal.apps.googleusercontent.com",
            callback: handleCredentialResponse,
            auto_select: false,
            use_fedcm_for_prompt: false,
          });

          if (googleBtnContainerRef.current) {
            // Using innerHTML = '' is much safer than manual removeChild loops
            // as it doesn't throw if nodes are already removed by the browser/GSI.
            googleBtnContainerRef.current.innerHTML = '';
            google.accounts.id.renderButton(
              googleBtnContainerRef.current,
              { theme: "outline", size: "large", width: 280, text: "continue_with", shape: "rectangular" }
            );
            if (isMounted.current) setGsiStatus('ready');
          }
        } else {
          // Check again in 1 second if the script hasn't loaded yet
          setTimeout(initializeGoogleSignIn, 1000);
        }
      } catch (err) {
        console.warn("GSI Init attempt failed:", err);
        if (isMounted.current) setGsiStatus('failed');
      }
    };

    initializeGoogleSignIn();

    return () => {
      isMounted.current = false;
      // Clean up the container manually on unmount to prevent React from 
      // trying to manage nodes it didn't create (the Google Iframe).
      if (googleBtnContainerRef.current) {
        try {
          googleBtnContainerRef.current.innerHTML = '';
        } catch (e) {
          // Silently fail if cleanup fails
        }
      }
      try {
        const google = (window as any).google;
        if (google?.accounts?.id) {
          google.accounts.id.cancel();
        }
      } catch (e) {}
    };
  }, []);

  const handleCredentialResponse = (response: any) => {
    if (!isMounted.current) return;
    try {
      if (!response?.credential) throw new Error("Authentication failed");
      setIsLoading(true);
      const profile = decodeJwt(response.credential);
      if (profile?.email) {
        onLogin({
          email: profile.email,
          name: profile.name || "Medical Officer",
          picture: profile.picture
        });
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message);
        setIsLoading(false);
      }
    }
  };

  const handleDemoAccess = () => {
    setIsLoading(true);
    // Bypassing the 401 error by providing a mock medical profile
    setTimeout(() => {
      if (isMounted.current) {
        onLogin({
          email: "demo.officer@biosyn.ai",
          name: "Demo Medical Officer",
          picture: ""
        });
      }
    }, 800);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-fadeIn min-h-[400px]">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="mt-6 text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">Establishing Secure Link...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-12 px-4 relative z-10 animate-fadeIn">
      <div className="w-full max-w-[400px] bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-[2.5rem] p-10 shadow-[0_0_80px_rgba(0,0,0,0.5)] flex flex-col items-center">
        <div className="flex items-center space-x-4 mb-12">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/40 border border-blue-400/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path>
            </svg>
          </div>
          <div className="text-left">
            <h1 className="text-4xl font-black text-white tracking-tighter leading-none">{t.appTitle}</h1>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Clinical Intelligence</span>
          </div>
        </div>

        <div className="w-full flex items-center justify-between mb-10">
          <div className="flex-1 h-[1px] bg-slate-800/50"></div>
          <div className="px-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Identity Verification</div>
          <div className="flex-1 h-[1px] bg-slate-800/50"></div>
        </div>

        <div className="w-full space-y-4 flex flex-col items-center">
          {!hasApiKey && (
            <button 
              onClick={handleSelectKey}
              className="w-[280px] py-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-amber-900/40 transition-all active:scale-95 mb-4"
            >
              Select Gemini API Key
            </button>
          )}

          {/* GSI Container - Managed outside of React's direct virtual DOM tree */}
          <div className="relative w-full flex justify-center min-h-[44px]">
            <div ref={googleBtnContainerRef} className="z-10" />
            {gsiStatus === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center space-x-2 bg-slate-900 rounded-xl">
                <div className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Syncing Hub...</span>
              </div>
            )}
          </div>

          <div className="w-full flex items-center justify-between my-2">
            <div className="flex-1 h-[1px] bg-slate-800/30"></div>
            <div className="px-3 text-[8px] font-black text-slate-700 uppercase">OR</div>
            <div className="flex-1 h-[1px] bg-slate-800/30"></div>
          </div>

          {/* Secure Demo Bypass */}
          <button 
            onClick={handleDemoAccess}
            className="w-[280px] py-3.5 rounded-xl border border-slate-700 hover:border-blue-500/50 bg-slate-950/50 hover:bg-blue-600/5 text-slate-400 hover:text-blue-400 font-black text-[11px] uppercase tracking-[0.15em] transition-all flex items-center justify-center space-x-3 group"
          >
            <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Bypass to Demo Access</span>
          </button>
        </div>

        <div className="mt-10 text-center">
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest leading-relaxed">
            Authorized Personnel Only.<br/>
            Compliant with Medical Data Sovereignty Standards.
          </p>
        </div>

        {error && (
          <div className="mt-8 p-4 bg-red-950/20 border border-red-900/30 rounded-2xl w-full animate-scaleIn">
            <p className="text-[10px] text-red-400 font-bold text-center leading-relaxed">
              AUTH_ERROR: {error}<br/>
              <span className="text-red-500/60">Try Demo Access for preview.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
