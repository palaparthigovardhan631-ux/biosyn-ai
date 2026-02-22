
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
import { SymptomInput, HealthPerception, Language, User } from './types.ts';
import { analyzeSymptoms } from './services/geminiService.ts';
import { translations } from './translations.ts';

const LAST_REPORT_KEY = 'biosyn_last_report';
const AUTH_USER_KEY = 'biosyn_auth_user';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [hasConsented, setHasConsented] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<HealthPerception | null>(null);
  const [activeTab, setActiveTab] = useState<'report' | 'voice'>('report');
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('English');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeInfoModal, setActiveInfoModal] = useState<'protocols' | 'precision' | 'compliance' | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem(AUTH_USER_KEY);
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
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

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = (userData: User) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
    const consented = localStorage.getItem('biosyn_consented');
    if (consented) setHasConsented(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(LAST_REPORT_KEY);
    setReport(null);
  };

  const handleAcceptDisclaimer = () => {
    setHasConsented(true);
    localStorage.setItem('biosyn_consented', 'true');
    const onboarded = localStorage.getItem('medisense_onboarded');
    if (!onboarded) setShowOnboarding(true);
  };

  const handleFinishOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('medisense_onboarded', 'true');
  };

  const handleSubmitSymptoms = async (input: SymptomInput) => {
    if (!isOnline) {
      setError("Cannot perform analysis while offline.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeSymptoms(input);
      setReport(result);
      setActiveTab('report');
      localStorage.setItem(LAST_REPORT_KEY, JSON.stringify(result));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError("Analysis failed. Please try again with more details.");
    } finally { setIsLoading(false); }
  };

  const handleReset = () => {
    setReport(null);
    setError(null);
    setActiveTab('report');
    localStorage.removeItem(LAST_REPORT_KEY);
  };

  const t = translations[selectedLanguage] || translations['English'];

  return (
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
              {error && (
                <div className="bg-red-950/50 border-2 border-red-500 p-6 mb-8 rounded-2xl flex items-center space-x-4 animate-scaleIn">
                  <div className="bg-red-500 p-2 rounded-full"><svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></div>
                  <p className="text-red-100 font-bold">{error}</p>
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
                    <ReportDisplay report={report} onReset={handleReset} language={selectedLanguage} />
                  ) : (
                    <VoiceLab language={selectedLanguage} />
                  )}

                  <div id="chatbot-section" className="bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-800 p-8 shadow-2xl">
                    <h2 className="text-2xl font-black text-white mb-6 flex items-center">
                      <span className="bg-blue-600 p-2.5 rounded-xl mr-4 shadow-lg shadow-blue-900/50"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg></span>
                      {t.aiAssistant}
                    </h2>
                    <ChatBot context={report} isOnline={isOnline} />
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
            </main>
          </>
        )}

        <footer className="mt-24 text-center text-slate-500 text-sm pb-12 pt-8 max-w-4xl mx-auto no-print">
          <p className="font-semibold text-slate-400">© 2026 BioSyn AI • Clinical Intelligence Portal</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
