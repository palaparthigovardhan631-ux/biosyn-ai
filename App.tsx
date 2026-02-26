
import React, { useState, useEffect } from 'react';
import Header from './components/Header.tsx';
import SymptomForm from './components/SymptomForm.tsx';
import ReportDisplay from './components/ReportDisplay.tsx';
import ChatBot from './components/ChatBot.tsx';
import DisclaimerModal from './components/DisclaimerModal.tsx';
import OnboardingGuide from './components/OnboardingGuide.tsx';
import Login from './components/Login.tsx';
import FeedbackSection from './components/FeedbackSection.tsx';
import BackgroundAnimations from './components/BackgroundAnimations.tsx';
import InfoModals from './components/InfoModals.tsx';
import VoiceLab from './components/VoiceLab.tsx';
import UserProfile from './components/UserProfile.tsx';
import WellnessArticles from './components/WellnessArticles.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import Footer from './components/Footer.tsx';
import UserSettings from './components/UserSettings.tsx';
import { SymptomInput, HealthPerception, Language, User, ChatMessage, UserSettings as UserSettingsType } from './types.ts';
import { analyzeSymptoms } from './services/geminiService.ts';
import { translations } from './translations.ts';
import { logoutUser } from './services/firebase.ts';

const LAST_REPORT_KEY = 'biosyn_last_report';
const AUTH_USER_KEY = 'biosyn_auth_user';
const CHAT_HISTORY_KEY = 'biosyn_chat_history';
const SETTINGS_KEY = 'biosyn_settings';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [hasConsented, setHasConsented] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<HealthPerception | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'report' | 'voice'>('report');
  const [currentView, setCurrentView] = useState<'home' | 'profile' | 'wellness' | 'settings'>('home');
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('English');
  const [userSettings, setUserSettings] = useState<UserSettingsType>({
    emailNotifications: true,
    pushNotifications: false,
    theme: 'dark',
    defaultLanguage: 'English'
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeInfoModal, setActiveInfoModal] = useState<'protocols' | 'precision' | 'compliance' | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem(AUTH_USER_KEY);
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.email) {
          // Sync with backend
          fetch(`/api/user/${parsedUser.email}`)
            .then(res => res.json())
            .then(backendUser => {
              if (backendUser) {
                setUser(backendUser);
                localStorage.setItem(AUTH_USER_KEY, JSON.stringify(backendUser));
              } else {
                setUser(parsedUser);
              }
              setIsAuthenticated(true);
            })
            .catch(() => {
              setUser(parsedUser);
              setIsAuthenticated(true);
            });
        }
      } catch (e) {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    }

    const cachedReport = localStorage.getItem(LAST_REPORT_KEY);
    if (cachedReport) {
      try {
        const parsed = JSON.parse(cachedReport);
        setReport(parsed);
        if (parsed.language) setSelectedLanguage(parsed.language);
      } catch (e) {}
    }

    const cachedChat = localStorage.getItem(CHAT_HISTORY_KEY);
    if (cachedChat) {
      try {
        const parsedChat = JSON.parse(cachedChat);
        if (Array.isArray(parsedChat)) {
          setChatHistory(parsedChat);
        }
      } catch (e) {
        console.error("Failed to load chat history from cache:", e);
        localStorage.removeItem(CHAT_HISTORY_KEY);
      }
    }

    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.language) setSelectedLanguage(settings.language);
        if (settings.consented) setHasConsented(true);
        if (settings.onboarded) setHasOnboarded(true);
        if (settings.userSettings) setUserSettings(settings.userSettings);
      } catch (e) {}
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Debounced Sync Mechanism
  useEffect(() => {
    if (!isAuthenticated) return;

    setIsSyncing(true);
    const handler = setTimeout(async () => {
      try {
        // Atomic Local Storage Sync
        const settingsData = { 
          language: selectedLanguage,
          consented: hasConsented,
          onboarded: hasOnboarded,
          userSettings
        };

        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsData));
        
        if (report) {
          localStorage.setItem(LAST_REPORT_KEY, JSON.stringify(report));
        } else {
          localStorage.removeItem(LAST_REPORT_KEY);
        }

        if (chatHistory.length > 0) {
          localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
        } else {
          localStorage.removeItem(CHAT_HISTORY_KEY);
        }

        // Backend Sync if user is authenticated
        if (user && user.email) {
          const updatedUser = {
            ...user,
            chatHistory: chatHistory
          };
          
          // Only sync to backend if history has changed to avoid unnecessary traffic
          await fetch('/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedUser)
          });
        }
      } catch (e) {
        console.error("Synchronization failed:", e);
      } finally {
        setIsSyncing(false);
      }
    }, 2000); // Increased debounce to 2 seconds for stability

    return () => clearTimeout(handler);
  }, [report, chatHistory, isAuthenticated, selectedLanguage, hasConsented, hasOnboarded, userSettings, user]);

  const handleLogin = async (userData: User) => {
    setIsAuthenticated(true);
    try {
      // Fetch existing user data from backend
      const response = await fetch(`/api/user/${userData.email}`);
      const existingUser = await response.json();
      
      const finalUser = existingUser || {
        ...userData,
        healthHistory: [],
        chatHistory: []
      };
      
      setUser(finalUser);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(finalUser));
      
      // Merge local chat history with backend if needed
      if (existingUser && existingUser.chatHistory && existingUser.chatHistory.length > 0) {
        setChatHistory(existingUser.chatHistory);
      }
      
      // If user didn't exist, save the initial data
      if (!existingUser) {
        await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalUser)
        });
      }
    } catch (error) {
      console.error("Failed to sync user with backend:", error);
      setUser(userData);
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
    try {
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      });
    } catch (error) {
      console.error("Failed to save user to backend:", error);
    }
  };

  const handleUpdateSettings = (newSettings: UserSettingsType) => {
    setUserSettings(newSettings);
    setSelectedLanguage(newSettings.defaultLanguage);
  };

  useEffect(() => {
    if (userSettings.theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [userSettings.theme]);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error("Firebase logout error:", e);
    }
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(LAST_REPORT_KEY);
    localStorage.removeItem(CHAT_HISTORY_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    setReport(null);
    setChatHistory([]);
  };

  const handleAcceptDisclaimer = () => {
    setHasConsented(true);
    if (!hasOnboarded) setShowOnboarding(true);
  };

  const handleFinishOnboarding = () => {
    setShowOnboarding(false);
    setHasOnboarded(true);
  };

  const handleSubmitSymptoms = async (input: SymptomInput) => {
    if (!isOnline) {
      setError("OFFLINE_ERROR: Cannot perform analysis while offline. Please check your network connection.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeSymptoms(input);
      setReport(result);
      setActiveTab('report');
      setCurrentView('home');

      // Add to health history
      if (user) {
        const historyItem = {
          id: Date.now().toString(),
          date: new Date().toLocaleDateString(),
          symptoms: input.description,
          perception: result.potentialCauses[0] || "General Assessment",
          severity: result.severity,
          fullReport: result
        };
        const updatedUser = {
          ...user,
          healthHistory: [historyItem, ...(user.healthHistory || [])]
        };
        handleUpdateUser(updatedUser);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Submission error:", err);
      if (err.message?.includes("API key")) {
        setError("AUTH_ERROR: Gemini API key is missing or invalid. Please ensure you have selected a valid key in the login screen.");
      } else if (err.message?.includes("parse")) {
        setError("DATA_ERROR: Failed to synthesize clinical data. The model response was malformed. Please try re-describing your symptoms with more clarity.");
      } else if (err.message?.includes("safety")) {
        setError("SAFETY_ERROR: The request was flagged by safety filters. BioSyn cannot process queries that violate medical safety protocols.");
      } else {
        setError("SYSTEM_ERROR: An unexpected interruption occurred during perception analysis. Please try again in a few moments.");
      }
    } finally { setIsLoading(false); }
  };

  const handleReset = () => {
    setReport(null);
    setChatHistory([]);
    setError(null);
    setActiveTab('report');
  };

  const handleViewHistoryReport = (reportData: HealthPerception) => {
    setReport(reportData);
    setCurrentView('home');
    setActiveTab('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const t = translations[selectedLanguage] || translations['English'];

  return (
    <ErrorBoundary>
      <div className={`min-h-screen gradient-bg pb-12 text-slate-50 ${selectedLanguage === 'Arabic' ? 'rtl' : 'ltr'}`} dir={selectedLanguage === 'Arabic' ? 'rtl' : 'ltr'}>
        <BackgroundAnimations />

        <div className="relative z-10">
          <Header 
            language={selectedLanguage} 
            onLanguageChange={setSelectedLanguage}
            isAuthenticated={isAuthenticated} 
            user={user} 
            onLogout={handleLogout}
            isOnline={isOnline}
            onOpenInfo={(type) => setActiveInfoModal(type)}
            currentView={currentView}
            onViewChange={setCurrentView}
          />
          
          {!isOnline && (
            <div className="bg-orange-600/20 border-b border-orange-500/30 text-orange-400 py-2 px-4 text-center text-[10px] font-black uppercase tracking-widest animate-pulse">
              {t.offlineNotice}
            </div>
          )}

          {activeInfoModal && <InfoModals type={activeInfoModal} language={selectedLanguage} onClose={() => setActiveInfoModal(null)} />}

          {!isAuthenticated ? (
            <Login onLogin={handleLogin} language={selectedLanguage} />
          ) : (
            <>
              {!hasConsented && <DisclaimerModal onAccept={handleAcceptDisclaimer} language={selectedLanguage} />}
              {showOnboarding && hasConsented && <OnboardingGuide onComplete={handleFinishOnboarding} language={selectedLanguage} />}

              <main className="container mx-auto px-4 mt-8 max-w-4xl">
                {currentView === 'profile' && user ? (
                  <UserProfile 
                    user={user} 
                    onUpdateUser={handleUpdateUser} 
                    language={selectedLanguage} 
                    onViewReport={handleViewHistoryReport}
                  />
                ) : currentView === 'wellness' ? (
                  <WellnessArticles language={selectedLanguage} />
                ) : currentView === 'settings' ? (
                  <UserSettings settings={userSettings} onUpdateSettings={handleUpdateSettings} language={selectedLanguage} />
                ) : (
                  <>
                    {error && (
                  <div className="bg-red-950/40 border-2 border-red-500/50 p-6 mb-8 rounded-3xl flex items-start space-x-5 animate-scaleIn backdrop-blur-md">
                    <div className="bg-red-500 p-3 rounded-2xl shadow-lg shadow-red-900/40 shrink-0 mt-1">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-red-400 font-black text-xs uppercase tracking-widest mb-1">Clinical Exception Detected</h3>
                      <p className="text-red-100 font-bold leading-relaxed">{error}</p>
                      <div className="mt-4 flex space-x-4">
                        <button 
                          onClick={() => setError(null)}
                          className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 underline underline-offset-4"
                        >
                          Dismiss
                        </button>
                        <button 
                          onClick={() => window.location.reload()}
                          className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 underline underline-offset-4"
                        >
                          Reload System
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              {isLoading ? (
                <div className="flex flex-col items-center justify-center space-y-6 py-32 bg-slate-900/40 rounded-3xl border border-slate-800 backdrop-blur-sm">
                  <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-blue-500"></div>
                  <div className="text-center">
                    <p className="text-white font-bold text-2xl tracking-tight">BioSyn Reasoning...</p>
                    <p className="text-slate-400 mt-2 text-lg">Synthesizing clinical perceptions</p>
                  </div>
                </div>
              ) : report ? (
                <div className="space-y-8 animate-fadeIn">
                  <div className="flex p-1.5 bg-slate-950/80 backdrop-blur-md rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden mb-4">
                    <button 
                      onClick={() => setActiveTab('report')}
                      className={`flex-1 flex items-center justify-center space-x-3 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'report' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span>Clinical Report</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('voice')}
                      className={`flex-1 flex items-center justify-center space-x-3 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'voice' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.828-2.828" /></svg>
                      <span>Voice Lab</span>
                    </button>
                  </div>

                  {activeTab === 'report' ? (
                    <ReportDisplay 
                      report={report} 
                      onReset={handleReset} 
                      language={selectedLanguage} 
                      user={user}
                      onUpdateReport={(updated) => setReport(updated)}
                    />
                  ) : (
                    <VoiceLab language={selectedLanguage} />
                  )}

                    <div id="chatbot-section" className="bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-800 p-8 shadow-2xl">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-white flex items-center">
                          <span className="bg-blue-600 p-2.5 rounded-xl mr-4 shadow-lg shadow-blue-900/50"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg></span>
                          {t.aiAssistant}
                        </h2>
                        {isSyncing && (
                          <div className="flex items-center space-x-2 text-[10px] font-black text-blue-400 uppercase tracking-widest animate-pulse">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                            <span>Syncing...</span>
                          </div>
                        )}
                      </div>
                      <ChatBot 
                        context={report} 
                        isOnline={isOnline} 
                        messages={chatHistory} 
                        onMessagesChange={setChatHistory} 
                      />
                    </div>
                  <FeedbackSection language={selectedLanguage} />
                </div>
              ) : (
                <div className="bg-slate-900/80 backdrop-blur-sm rounded-3xl border border-slate-800 shadow-2xl">
                  <div className="p-8 md:p-12">
                    <div className="mb-10 text-center">
                      <h2 className="text-4xl font-black text-white mb-4 tracking-tight">{t.healthAnalysis}</h2>
                      <p className="text-slate-300 text-lg max-w-xl mx-auto leading-relaxed">{t.provideSymptoms}</p>
                    </div>
                    <SymptomForm onSubmit={handleSubmitSymptoms} selectedLanguage={selectedLanguage} onLanguageChange={setSelectedLanguage} />
                  </div>
                </div>
              )}
            </>
          )}
        </main>
        </>
      )}

        <Footer language={selectedLanguage} />
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default App;
