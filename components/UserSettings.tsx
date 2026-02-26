
import React, { useState } from 'react';
import { Language, UserSettings as UserSettingsType } from '../types.ts';
import { translations } from '../translations.ts';

interface UserSettingsProps {
  settings: UserSettingsType;
  onUpdateSettings: (settings: UserSettingsType) => void;
  language: Language;
}

const UserSettings: React.FC<UserSettingsProps> = ({ settings, onUpdateSettings, language }) => {
  const t = translations[language] || translations['English'];
  const [localSettings, setLocalSettings] = useState<UserSettingsType>(settings);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const languages: Language[] = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Arabic', 'Hindi', 'Portuguese', 'Japanese', 'Telugu'];

  return (
    <div className="animate-fadeIn space-y-8 pb-12">
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
        <div className="flex items-center space-x-6 mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/40 border border-blue-400/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight">{t.settingsTitle}</h2>
            <p className="text-slate-400 font-medium">{t.settingsDesc}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Notifications Section */}
          <div className="space-y-8">
            <div>
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-6">{t.notifications}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-slate-200">{t.emailNotifications}</span>
                  </div>
                  <button 
                    onClick={() => setLocalSettings({...localSettings, emailNotifications: !localSettings.emailNotifications})}
                    className={`w-12 h-6 rounded-full transition-all relative ${localSettings.emailNotifications ? 'bg-blue-600' : 'bg-slate-800'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.emailNotifications ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-slate-200">{t.pushNotifications}</span>
                  </div>
                  <button 
                    onClick={() => setLocalSettings({...localSettings, pushNotifications: !localSettings.pushNotifications})}
                    className={`w-12 h-6 rounded-full transition-all relative ${localSettings.pushNotifications ? 'bg-blue-600' : 'bg-slate-800'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localSettings.pushNotifications ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>

            {/* Theme Section */}
            <div>
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-6">{t.theme}</h3>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setLocalSettings({...localSettings, theme: 'light'})}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center space-y-3 ${localSettings.theme === 'light' ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="text-xs font-black uppercase tracking-widest">{t.lightMode}</span>
                </button>
                <button 
                  onClick={() => setLocalSettings({...localSettings, theme: 'dark'})}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center space-y-3 ${localSettings.theme === 'dark' ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span className="text-xs font-black uppercase tracking-widest">{t.darkMode}</span>
                </button>
              </div>
              <p className="mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">
                * Note: System currently optimized for Dark Mode.
              </p>
            </div>
          </div>

          {/* Language Section */}
          <div className="space-y-8">
            <div>
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-6">{t.defaultLanguage}</h3>
              <div className="grid grid-cols-2 gap-3">
                {languages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLocalSettings({...localSettings, defaultLanguage: lang})}
                    className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all ${localSettings.defaultLanguage === lang ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-10 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3 text-slate-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest">Changes are applied immediately to the local session.</span>
          </div>
          
          <button 
            onClick={handleSave}
            className={`px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center space-x-3 ${isSaved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-900/40 active:scale-95'}`}
          >
            {isSaved ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
                <span>{t.settingsSaved}</span>
              </>
            ) : (
              <span>{t.saveSettings}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
