
import React from 'react';
import { Language } from '../types';
import { translations } from '../translations';

interface DisclaimerModalProps {
  onAccept: () => void;
  language: Language;
}

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onAccept, language }) => {
  const t = translations[language];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md">
      <div className="bg-slate-900 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] max-w-xl w-full overflow-hidden border border-slate-800 animate-scaleIn">
        <div className="bg-orange-600 p-8 text-white flex flex-col items-center text-center">
          <h2 className="text-3xl font-black uppercase tracking-tighter">{t.safetyProtocol}</h2>
        </div>
        
        <div className="p-10 space-y-6">
          <p className="text-white text-xl font-bold leading-tight text-center">
            MediSense AI is a digital perception tool.
          </p>
          
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-inner">
            <p className="text-slate-300 font-medium">1. Results are based on pattern analysis and are not clinical proof.</p>
            <p className="text-slate-300 font-medium">2. Do not modify existing medications based on these perceptions.</p>
            <p className="text-slate-300 font-medium">3. Emergencies require immediate hospital intervention.</p>
          </div>

          <button
            onClick={onAccept}
            className="w-full bg-blue-600 text-white font-black py-6 rounded-2xl hover:bg-blue-500 transition-all text-xl uppercase tracking-widest mt-4 active:scale-95"
          >
            {t.disclaimerAcknowledge}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerModal;
