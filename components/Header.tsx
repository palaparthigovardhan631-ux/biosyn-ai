
import React from 'react';
import { Language, User } from '../types';
import { translations } from '../translations';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isAuthenticated: boolean;
  user: User | null;
  onLogout: () => void;
  isOnline: boolean;
  onOpenInfo: (type: 'protocols' | 'precision' | 'compliance') => void;
  currentView: 'home' | 'profile' | 'wellness' | 'settings';
  onViewChange: (view: 'home' | 'profile' | 'wellness' | 'settings') => void;
}

const languages: Language[] = ['English', 'Telugu', 'Spanish', 'French', 'German', 'Chinese', 'Arabic', 'Hindi', 'Portuguese', 'Japanese'];

const Header: React.FC<HeaderProps> = ({ language, onLanguageChange, isAuthenticated, user, onLogout, isOnline, onOpenInfo, currentView, onViewChange }) => {
  const t = translations[language];

  return (
    <header className="bg-slate-950/90 backdrop-blur-xl sticky top-0 z-40 border-b border-slate-800 shadow-xl no-print">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onViewChange('home')}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/60 ring-1 ring-blue-400/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path>
            </svg>
          </div>
          <div>
            <div className="flex items-center">
              <span className="text-xl font-black text-white tracking-tighter">{t.appTitle}</span>
              <span className="text-blue-500 font-black ml-1 text-xs px-1.5 py-0.5 bg-blue-500/10 rounded-md">PRO</span>
            </div>
            <div className="flex items-center space-x-1 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
              <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-500/80' : 'text-orange-500/80'}`}>
                {isOnline ? 'Active' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        
        <nav className="hidden lg:flex items-center space-x-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          <button 
            onClick={() => onViewChange('home')} 
            className={`transition-colors py-2 ${currentView === 'home' ? 'text-blue-400' : 'hover:text-blue-400'}`}
          >
            {t.home}
          </button>
          <button 
            onClick={() => onViewChange('wellness')} 
            className={`transition-colors py-2 ${currentView === 'wellness' ? 'text-blue-400' : 'hover:text-blue-400'}`}
          >
            {t.wellness}
          </button>
          <button 
            onClick={() => onOpenInfo('protocols')} 
            className="hover:text-blue-400 transition-colors py-2"
          >
            Protocols
          </button>
          <button 
            onClick={() => onOpenInfo('precision')} 
            className="text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 transition-all"
          >
            AI Precision
          </button>
          <button 
            onClick={() => onOpenInfo('compliance')} 
            className="hover:text-blue-400 transition-colors py-2"
          >
            Compliance
          </button>
        </nav>

        <div className="flex items-center space-x-4">
          {/* Language Selector Dropdown - Positioned Left of Profile */}
          <div className="relative group">
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as Language)}
              className="appearance-none bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 rounded-xl pl-3 pr-8 py-2 text-slate-300 text-[10px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer"
            >
              {languages.map(lang => (
                <option key={lang} value={lang} className="bg-slate-900 text-white">
                  {lang.substring(0, 3)}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          {isAuthenticated && user && (
            <div 
              className={`hidden md:flex items-center space-x-3 border-l border-slate-800 pl-4 animate-fadeIn cursor-pointer hover:bg-slate-900/50 p-2 rounded-xl transition-all ${currentView === 'profile' ? 'bg-slate-900/50 ring-1 ring-blue-500/30' : ''}`}
              onClick={() => onViewChange('profile')}
            >
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Medical ID</span>
                <span className="text-[11px] font-bold text-slate-200">{user.name}</span>
              </div>
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-lg border border-slate-700 shadow-md" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-500 font-black text-[10px]">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
          )}
          
          {isAuthenticated && (
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => {
                  const shareUrl = window.location.origin;
                  if (navigator.share) {
                    navigator.share({
                      title: 'BioSyn AI',
                      text: 'Check out BioSyn AI - Advanced Health Perception Assistant',
                      url: shareUrl,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(shareUrl);
                    alert('Link copied to clipboard!');
                  }
                }}
                className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 p-2 rounded-xl transition-all border border-blue-500/20 hover:border-blue-500/40"
                title={t.shareApp}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>

              <button 
                onClick={() => onViewChange('settings')}
                className={`p-2 rounded-xl transition-all border ${currentView === 'settings' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-blue-400 hover:border-blue-500/40'}`}
                title={t.settingsTitle}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              <button 
                onClick={onLogout}
                className="bg-slate-900 hover:bg-red-950/20 hover:text-red-400 text-slate-500 p-2 rounded-xl transition-all border border-slate-800 hover:border-red-900/30"
                title={t.logoutBtn}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
