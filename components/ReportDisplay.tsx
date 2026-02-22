
import React, { useState, useRef, useEffect } from 'react';
import { HealthPerception, Severity, Language } from '../types';
import { translations } from '../translations';
import { GoogleGenAI, Modality } from "@google/genai";

interface ReportDisplayProps {
  report: HealthPerception;
  onReset: () => void;
  language: Language;
}

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative inline-block ml-3 group align-middle no-print">
      <button 
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center text-slate-500 hover:text-blue-400 hover:border-blue-500 transition-all cursor-help"
      >
        <span className="text-[10px] font-black italic">i</span>
      </button>
      
      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-4 bg-slate-800/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl z-50 animate-scaleIn origin-bottom pointer-events-none">
          <p className="text-xs text-slate-200 font-medium leading-relaxed">
            {text}
          </p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
};

function decode(base64: string) {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  } catch (e) {
    return new Uint8Array(0);
  }
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  try {
    const bufferToUse = data.byteLength % 2 === 0 ? data.buffer : data.buffer.slice(0, data.byteLength - 1);
    const dataInt16 = new Int16Array(bufferToUse);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  } catch (e) {
    return ctx.createBuffer(numChannels, 1, sampleRate);
  }
}

const ReportDisplay: React.FC<ReportDisplayProps> = ({ report, onReset, language }) => {
  const t = translations[language] || translations['English'];
  const [isReading, setIsReading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => { return () => handleStopAudio(); }, []);

  const handleDownloadPdf = () => { window.print(); };

  const handleStopAudio = () => {
    try {
      if (sourceRef.current) { sourceRef.current.stop(); sourceRef.current = null; }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') { audioContextRef.current.close(); audioContextRef.current = null; }
    } catch (e) {}
    setIsReading(false);
    setIsPaused(false);
    setIsGenerating(false);
  };

  const handleStartListening = async () => {
    if (isReading) {
      if (audioContextRef.current) {
        if (isPaused) { await audioContextRef.current.resume(); setIsPaused(false); }
        else { await audioContextRef.current.suspend(); setIsPaused(true); }
      }
      return;
    }

    handleStopAudio();
    setIsReading(true);
    setIsGenerating(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      const script = `Report summary in ${language}. Severity: ${report.severity}. specialist recommended: ${report.recommendedSpecialist}. Key potential causes: ${report.potentialCauses.join(', ')}. Please read the disclaimer carefully.`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: script }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("Voice synthesis yielded no data.");

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = ctx;
      const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer; source.connect(ctx.destination);
      source.onended = () => setIsReading(false);
      source.start();
      sourceRef.current = source;
    } catch (err) {
      handleStopAudio();
    } finally {
      setIsGenerating(false);
    }
  };

  const getSeverityStyles = (severity: Severity) => {
    switch (severity) {
      case Severity.EMERGENCY: return "bg-red-600 text-white ring-4 ring-red-600/30";
      case Severity.HIGH: return "bg-orange-600 text-white ring-4 ring-orange-600/30";
      case Severity.MODERATE: return "bg-yellow-500 text-slate-950 ring-4 ring-yellow-500/30";
      case Severity.LOW: return "bg-emerald-600 text-white ring-4 ring-emerald-600/30";
      default: return "bg-slate-700 text-white";
    }
  };

  return (
    <div className="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-800 flex flex-col ring-1 ring-white/5 animate-slide-up-fade report-container">
      {/* Header */}
      <div className="bg-slate-950 p-8 flex flex-col lg:flex-row justify-between items-center gap-6 border-b border-slate-800 report-header">
        <div className="text-center lg:text-left">
          <h2 className="text-4xl font-black text-white mb-2 tracking-tight">{t.analysisReport}</h2>
          <div className="flex items-center justify-center lg:justify-start space-x-2">
            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse no-print"></span>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t.systemStatus}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 relative no-print">
          <button onClick={handleStartListening} disabled={isGenerating} className={`p-4 rounded-xl transition-all flex items-center space-x-3 ${isReading && !isPaused ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'} border border-slate-700`}>
            {isGenerating ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : (isReading && !isPaused ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>)}
            <span className="text-xs font-black uppercase tracking-widest">{isReading ? (isPaused ? 'Resume' : 'Pause') : t.listenReport}</span>
          </button>
          <button onClick={handleDownloadPdf} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-xl font-black text-sm transition-all shadow-lg flex items-center space-x-2 border border-blue-400/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span>{t.downloadPdf}</span>
          </button>
          <button onClick={onReset} className="bg-slate-800/50 hover:bg-slate-800 text-slate-500 hover:text-white px-4 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-800">{t.reset}</button>
        </div>
      </div>

      <div className="p-8 md:p-12 space-y-12">
        {/* Severity Banner */}
        <div className={`p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 ${getSeverityStyles(report.severity)} shadow-2xl`}>
          <div>
            <p className="text-xs uppercase font-black tracking-[0.2em] opacity-80 mb-2">{t.criticalityLevel}</p>
            <h3 className="text-4xl font-black uppercase tracking-tighter">{report.severity}</h3>
          </div>
          <div className="bg-black/20 p-5 rounded-2xl backdrop-blur-md border border-white/10 text-center md:text-right max-w-sm">
            <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">{t.recommendedAction}</p>
            <p className="text-xl font-bold">{t.consult} <span className="underline decoration-wavy underline-offset-4">{report.recommendedSpecialist}</span></p>
          </div>
        </div>

        {/* Potential Causes */}
        <section>
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Initial Clinical Perceptions</h4>
          <div className="flex flex-wrap gap-3">
            {report.potentialCauses.map((cause, i) => (
              <div key={i} className="px-5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-200 font-bold text-sm shadow-sm hover:border-blue-500/30 transition-all">
                {cause}
              </div>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Digital Twin */}
          <section className="bg-slate-800/20 p-8 rounded-[2rem] border border-slate-700/50">
            <h3 className="text-xl font-black text-white mb-6 flex items-center">
              {t.digitalTwinTitle}
              <InfoTooltip text={t.digitalTwinTooltip} />
            </h3>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-blue-600/20 rounded-xl text-blue-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg></div>
                <div>
                  <p className="text-slate-100 font-bold leading-relaxed mb-4">{report.digitalTwin.status}</p>
                  <div className="flex flex-wrap gap-2">
                    {report.digitalTwin.organSystemsAffected.map((sys, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-900/40 text-blue-300 border border-blue-900/50 rounded-full text-[10px] font-black uppercase tracking-widest">{sys}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Stress</p>
                  <p className="text-xs font-bold text-slate-300">{report.digitalTwin.simulatedVitals.stressLevel}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Inflam.</p>
                  <p className="text-xs font-bold text-slate-300">{report.digitalTwin.simulatedVitals.inflammationMarker}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Circul.</p>
                  <p className="text-xs font-bold text-slate-300">{report.digitalTwin.simulatedVitals.circulatoryImpact}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Disease Evolution */}
          <section className="bg-slate-800/20 p-8 rounded-[2rem] border border-slate-700/50">
            <h3 className="text-xl font-black text-white mb-6 flex items-center">
              {t.evolutionSimulatorTitle}
              <InfoTooltip text={t.evolutionTooltip} />
            </h3>
            <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-700">
              {report.evolutionSimulator.map((stage, i) => (
                <div key={i} className="relative pl-8">
                  <div className="absolute left-0 top-1 w-6 h-6 bg-slate-900 border-2 border-slate-700 rounded-full flex items-center justify-center z-10">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{stage.timeframe}</p>
                  <p className="text-sm text-slate-200 font-bold mb-1">Untreated: <span className="font-normal text-slate-400">{stage.untreatedProgression}</span></p>
                  <p className="text-sm text-slate-200 font-bold">Intervention: <span className="font-normal text-emerald-400">{stage.interventionEffect}</span></p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Recommended Medicines Section with Images */}
        <section className="space-y-8">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg></div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tight">{t.drugIntelligenceTitle}</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {report.recommendedMedicines.map((med, i) => (
              <div key={i} className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 flex items-start space-x-6 hover:border-blue-500/50 transition-all group">
                <div className="w-24 h-24 bg-slate-900 rounded-2xl flex-shrink-0 flex items-center justify-center border border-slate-800 p-2 overflow-hidden shadow-inner">
                  <img 
                    src={med.imageUrl || "https://img.icons8.com/fluency/96/pill.png"} 
                    alt={med.name} 
                    className="w-16 h-16 object-contain group-hover:scale-110 transition-transform" 
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-start">
                    <h5 className="text-xl font-black text-white">{med.name}</h5>
                    <span className="text-[8px] font-black text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded uppercase tracking-widest">OTC Info</span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">{med.reason}</p>
                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Mechanism</p>
                    <p className="text-[10px] text-slate-300">{med.mechanismOfAction}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {med.safetyProfile.map((rule, idx) => (
                      <span key={idx} className="text-[8px] font-bold text-orange-400 bg-orange-950/20 px-2 py-0.5 rounded-md border border-orange-900/30">! {rule}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Explainable Reasoning */}
        <section className="bg-slate-950 border border-slate-800 p-8 rounded-[2.5rem]">
          <h3 className="text-xl font-black text-white mb-8 flex items-center">
            {t.reasoningTitle}
            <InfoTooltip text={t.reasoningTooltip} />
          </h3>
          <div className="space-y-4">
            {report.explainableReasoning.map((step, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                <div className="flex-1">
                  <p className="text-xs font-black text-blue-500 uppercase mb-1">Observation</p>
                  <p className="text-sm text-slate-200 font-bold">{step.observation}</p>
                </div>
                <div className="w-8 flex items-center justify-center text-slate-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7m0 0l-7 7m7-7H3"/></svg></div>
                <div className="flex-1 text-right">
                  <p className="text-xs font-black text-emerald-500 uppercase mb-1">Inference</p>
                  <p className="text-sm text-slate-200 font-bold">{step.inference}</p>
                </div>
                <div className="ml-6 flex flex-col items-center">
                  <div className="text-[10px] font-black text-slate-500 uppercase mb-1">Conf.</div>
                  <div className="text-sm font-black text-white">{Math.round(step.confidence * 100)}%</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Advice Lists */}
        <div className="grid md:grid-cols-2 gap-8">
          <section className="space-y-4">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Lifestyle Adjustments</h4>
             <ul className="space-y-3">
               {report.lifestyleAdvice.map((item, i) => (
                 <li key={i} className="flex items-center space-x-3 text-slate-300 text-sm font-medium">
                   <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                   <span>{item}</span>
                 </li>
               ))}
             </ul>
          </section>
          <section className="space-y-4">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Emergency Alerts</h4>
             <ul className="space-y-3">
               {report.warningSigns.map((item, i) => (
                 <li key={i} className="flex items-center space-x-3 text-red-400 text-sm font-black uppercase tracking-tighter italic">
                   <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                   <span>{item}</span>
                 </li>
               ))}
             </ul>
          </section>
        </div>

        {/* Disclaimer Footer */}
        <p className="text-slate-500 text-[10px] font-medium italic text-center max-w-2xl mx-auto pt-12 border-t border-slate-800 leading-relaxed">
          {report.disclaimer}
        </p>
      </div>
    </div>
  );
};

export default ReportDisplay;
