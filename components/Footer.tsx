
import React from 'react';
import { Language } from '../types.ts';
import { translations } from '../translations.ts';

interface FooterProps {
  language: Language;
}

const Footer: React.FC<FooterProps> = ({ language }) => {
  const t = translations[language] || translations['English'];
  
  return (
    <footer className="mt-24 border-t border-slate-800/50 bg-slate-950/50 backdrop-blur-xl pt-16 pb-12 no-print">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20 border border-blue-400/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path>
                </svg>
              </div>
              <span className="text-2xl font-black text-white tracking-tighter">BIOSYN</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Advanced Clinical Intelligence for high-precision health perception and physiological mapping.
            </p>
          </div>

          {/* About Us */}
          <div>
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-6">About Developer</h4>
            <p className="text-slate-300 text-sm font-medium mb-2">Palaparthi Govardhan</p>
            <p className="text-slate-500 text-xs leading-relaxed">
              Lead Engineer & Product Designer focused on bridging the gap between AI and clinical diagnostics.
            </p>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-6">Contact Details</h4>
            <ul className="space-y-4">
              <li>
                <a 
                  href="mailto:palaparthigovardhan631@gmail.com" 
                  className="group flex items-center text-slate-400 hover:text-white transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mr-3 group-hover:border-blue-500/50 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium truncate">palaparthigovardhan631@gmail.com</span>
                </a>
              </li>
              <li>
                <div className="flex items-center text-slate-400">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium">Global Clinical Network</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-6">Legal & Policies</h4>
            <ul className="space-y-3">
              <li>
                <button className="text-slate-400 hover:text-white text-xs font-medium transition-colors">Privacy Protocol</button>
              </li>
              <li>
                <button className="text-slate-400 hover:text-white text-xs font-medium transition-colors">Terms of Engagement</button>
              </li>
              <li>
                <button className="text-slate-400 hover:text-white text-xs font-medium transition-colors">Data Sovereignty</button>
              </li>
              <li>
                <button className="text-slate-400 hover:text-white text-xs font-medium transition-colors">Clinical Disclaimer</button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">
            © 2026 BIOSYN AI • ALL RIGHTS RESERVED
          </p>
          <div className="flex items-center space-x-6">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">HIPAA COMPLIANT</span>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">GDPR READY</span>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">ISO 27001</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
