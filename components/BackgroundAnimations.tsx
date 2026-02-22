
import React from 'react';

const BackgroundAnimations: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden bg-animations no-print" style={{ zIndex: 0 }}>
      {/* Structural Tech Grid */}
      <div className="absolute inset-0 opacity-[0.05]" 
           style={{ 
             backgroundImage: `linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)`,
             backgroundSize: '100px 100px'
           }}>
      </div>

      {/* Bioluminescent Technical Glows */}
      <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full animate-[pulse-glow_15s_infinite]"></div>
      <div className="absolute bottom-[0%] right-[5%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full animate-[pulse-glow_18s_infinite_reverse]"></div>
      <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] bg-emerald-600/5 rounded-full animate-[pulse-glow_12s_infinite]"></div>

      {/* STETHOSCOPE - Technical Line Art */}
      <div className="absolute top-[10%] left-[5%] bg-medical-icon" style={{ animationDelay: '0s' }}>
        <svg className="w-48 h-48 text-blue-400/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
          <path d="M11 5.5a4.5 4.5 0 10-4.5 4.5M11 5.5a4.5 4.5 0 114.5 4.5M11 5.5v11m0 0a3.5 3.5 0 107 0m-7 0a3.5 3.5 0 11-7 0m7 0v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2" strokeLinecap="round" />
          <circle cx="11" cy="5.5" r="0.5" fill="currentColor" />
        </svg>
      </div>

      {/* PATIENT SCALES - Abstract Minimalist */}
      <div className="absolute top-[15%] right-[10%] bg-medical-icon" style={{ animationDelay: '-5s' }}>
        <svg className="w-40 h-40 text-slate-400/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
          <rect x="4" y="18" width="16" height="2" rx="0.5" />
          <path d="M12 18V6M8 6h8M12 4v2" strokeLinecap="round" />
          <path d="M10 10h4" strokeDasharray="1 1" />
          <circle cx="12" cy="14" r="3" strokeDasharray="2 1" />
        </svg>
      </div>

      {/* DOPPLER / ULTRASOUND WAVE - Data Visualization Style */}
      <div className="absolute top-[45%] left-[15%] bg-medical-icon" style={{ animationDelay: '-8s' }}>
        <svg className="w-56 h-56 text-indigo-400/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.3">
          <circle cx="12" cy="12" r="10" strokeDasharray="4 2" />
          <circle cx="12" cy="12" r="7" strokeDasharray="2 4" />
          <path d="M12 12L19 5M12 12L5 19" strokeOpacity="0.5" />
          <path d="M2 12h20M12 2v20" strokeOpacity="0.2" />
          <path d="M12 12m-2 0a2 2 0 104 0 2 2 0 10-4 0" fill="currentColor" fillOpacity="0.1" />
        </svg>
      </div>

      {/* ECG MACHINE - Digital Waveform Monitor */}
      <div className="absolute bottom-[20%] left-[8%] bg-medical-icon" style={{ animationDelay: '-12s' }}>
        <svg className="w-64 h-64 text-emerald-400/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
          <rect x="2" y="5" width="20" height="14" rx="2" strokeOpacity="0.5" />
          <path d="M2 12h4l1-3 2 6 2-10 2 12 1-5h4l1-2 1 2h2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="18" y="7" width="2" height="1" fill="currentColor" />
          <rect x="18" y="9" width="2" height="1" fill="currentColor" opacity="0.5" />
        </svg>
      </div>

      {/* PULSE OXIMETER - Minimalist Tech Icon */}
      <div className="absolute bottom-[15%] right-[20%] bg-medical-icon" style={{ animationDelay: '-16s' }}>
        <svg className="w-32 h-32 text-red-400/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
          <path d="M7 10h10a2 2 0 012 2v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4a2 2 0 012-2z" strokeLinecap="round" />
          <rect x="13" y="12" width="3" height="4" rx="0.5" fill="currentColor" fillOpacity="0.2" />
          <path d="M9 14h2" strokeLinecap="round" />
          <path d="M5 14h1M18 14h1" strokeOpacity="0.5" />
        </svg>
      </div>

      {/* ULTRASOUND MACHINE - Stylized Console */}
      <div className="absolute top-[60%] right-[5%] bg-medical-icon" style={{ animationDelay: '-20s' }}>
        <svg className="w-48 h-48 text-blue-300/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.4">
          <rect x="6" y="4" width="12" height="10" rx="1" />
          <rect x="5" y="15" width="14" height="5" rx="1" />
          <circle cx="12" cy="9" r="3" strokeDasharray="1 1" />
          <path d="M9 17h6M12 15v5" strokeOpacity="0.5" />
        </svg>
      </div>

      {/* Floating Synapse Connections (AI Connectivity Symbols) */}
      <div className="absolute top-[30%] left-[30%] opacity-[0.05] animate-[orbit_25s_linear_infinite]">
        <div className="w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_10px_#3b82f6]"></div>
        <div className="absolute top-20 left-10 w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_15px_#6366f1]"></div>
      </div>
      <div className="absolute bottom-[30%] right-[30%] opacity-[0.05] animate-[orbit_35s_linear_infinite_reverse]">
        <div className="w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_10px_#10b981]"></div>
      </div>

      {/* Scanning Line Effect (Modern Trend) */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent h-[10vh] w-full animate-[scan-line_12s_linear_infinite] pointer-events-none"></div>
      
      {/* Decorative Hex Grid */}
      <div className="absolute inset-0 opacity-[0.02]" 
           style={{ 
             backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cpath d='M14 0.5L27.5 8.25V23.75L14 31.5L0.5 23.75V8.25L14 0.5Z' fill='none' stroke='%233b82f6' stroke-width='0.5'/%3E%3C/svg%3E")`,
             backgroundSize: '28px 49px'
           }}>
      </div>
    </div>
  );
};

export default BackgroundAnimations;
