
import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../translations';

interface FeedbackSectionProps {
  language: Language;
}

const FeedbackSection: React.FC<FeedbackSectionProps> = ({ language }) => {
  const t = translations[language] || translations['English'];
  const [feedbackRating, setFeedbackRating] = useState<'up' | 'down' | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackRating) return;
    setFeedbackSubmitted(true);
  };

  return (
    <section className="bg-slate-900/80 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-800 p-8 md:p-12 no-print mt-8 animate-slide-up-fade">
      <div className="flex items-center space-x-4 mb-8">
        <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center border border-emerald-500/20">
          <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-black text-white uppercase tracking-tight">{t.feedbackTitle}</h3>
      </div>
      
      {feedbackSubmitted ? (
        <div className="bg-emerald-900/20 border border-emerald-500/30 p-10 rounded-2xl text-center animate-scaleIn">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-900/30">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-emerald-400 font-black text-2xl mb-2">{t.feedbackSuccess}</p>
          <p className="text-slate-400">BioSyn AI is constantly evolving with your contributions.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmitFeedback} className="space-y-8">
          <div className="bg-slate-950/50 p-8 rounded-2xl border border-slate-800 shadow-inner flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <p className="text-slate-100 font-bold text-xl leading-snug">{t.feedbackPrompt}</p>
              <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-black">Quality Verification Process</p>
            </div>
            <div className="flex items-center space-x-6">
              <button
                type="button"
                onClick={() => setFeedbackRating('up')}
                className={`w-20 h-20 rounded-2xl border-2 transition-all flex items-center justify-center ${
                  feedbackRating === 'up' 
                    ? 'bg-blue-600 border-blue-400 text-white scale-110 shadow-2xl shadow-blue-900/50' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                }`}
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setFeedbackRating('down')}
                className={`w-20 h-20 rounded-2xl border-2 transition-all flex items-center justify-center ${
                  feedbackRating === 'down' 
                    ? 'bg-red-600 border-red-400 text-white scale-110 shadow-2xl shadow-red-900/50' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                }`}
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" style={{ transform: 'rotate(180deg)' }}>
                   <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73z" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t.feedbackPlaceholder}</label>
            <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Your insights help us provide better clinical perceptions..."
              className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-6 text-white outline-none focus:border-blue-500 transition-all resize-none h-40 shadow-inner font-medium"
            />
          </div>
          
          <button
            type="submit"
            disabled={!feedbackRating}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-6 rounded-2xl shadow-2xl shadow-blue-900/40 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100 flex items-center justify-center space-x-3 text-lg uppercase tracking-widest"
          >
            <span>{t.feedbackSubmit}</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      )}
    </section>
  );
};

export default FeedbackSection;
