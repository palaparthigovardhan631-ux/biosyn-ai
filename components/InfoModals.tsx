
import React from 'react';
import { translations } from '../translations';
import { Language } from '../types';

interface InfoModalProps {
  type: 'protocols' | 'precision' | 'compliance';
  onClose: () => void;
  language: Language;
}

const InfoModals: React.FC<InfoModalProps> = ({ type, onClose, language }) => {
  const t = translations[language] || translations['English'];

  const getContent = () => {
    switch (type) {
      case 'protocols':
        return {
          title: t.protocolsTitle,
          description: t.protocolsDesc,
          icon: (
            <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
          details: [
            "SOAP (Subjective, Objective, Assessment, Plan) Analysis Standard",
            "Emergency Triage Color-Coding Protocols",
            "International Classification of Diseases (ICD-11) Mapping",
            "Clinical Workflow Validation Steps"
          ]
        };
      case 'precision':
        return {
          title: t.aiPrecisionTitle,
          description: t.aiPrecisionDesc,
          icon: (
            <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ),
          details: [
            "Gemini 3 Pro Multi-Modal Integration",
            "Zero-Temperature Reasoning for Reproducibility",
            "Continuous Perception Confidence Monitoring",
            "Clinical Literature Cross-Referencing"
          ]
        };
      case 'compliance':
        return {
          title: t.complianceTitle,
          description: t.complianceDesc,
          icon: (
            <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ),
          details: [
            "HIPAA (Health Insurance Portability and Accountability Act) Standards",
            "GDPR (General Data Protection Regulation) Sovereignty",
            "AES-256 Bit Data Encryption for At-Rest Storage",
            "Regular Penetration Testing & Clinical Integrity Audits"
          ]
        };
    }
  };

  const content = getContent();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] max-w-lg w-full p-10 flex flex-col items-center text-center space-y-8 shadow-[0_0_120px_rgba(30,58,138,0.3)] animate-scaleIn">
        <div className="p-4 bg-slate-950 rounded-[2rem] border border-slate-800 shadow-inner">
          {content.icon}
        </div>
        
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-white tracking-tight uppercase">{content.title}</h2>
          <p className="text-slate-400 text-lg leading-relaxed">{content.description}</p>
        </div>

        <div className="w-full bg-slate-950/50 p-6 rounded-3xl border border-slate-800 space-y-3 text-left">
          {content.details.map((detail, i) => (
            <div key={i} className="flex items-center space-x-3 text-slate-300 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <span>{detail}</span>
            </div>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-slate-800 text-white font-black py-5 rounded-2xl text-sm uppercase tracking-widest border border-slate-700 hover:bg-slate-700 transition-all active:scale-95"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
};

export default InfoModals;
