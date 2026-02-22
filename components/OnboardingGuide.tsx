
import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../types';
import { translations } from '../translations';
import { GoogleGenAI, Modality } from "@google/genai";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  audioKey: string;
}

interface OnboardingGuideProps {
  onComplete: () => void;
  language: Language;
}

// Audio Decoding Utilities
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onComplete, language }) => {
  const t = translations[language] || translations['English'];
  const [currentStep, setCurrentStep] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const steps: OnboardingStep[] = [
    {
      title: t.onboardingWelcomeTitle,
      description: t.onboardingWelcomeDesc,
      audioKey: 'voiceScript1',
      icon: (
        <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-900/40 border border-white/20">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path>
          </svg>
        </div>
      )
    },
    {
      title: t.onboardingSymptomTitle,
      description: t.onboardingSymptomDesc,
      audioKey: 'voiceScript2',
      icon: (
        <div className="w-20 h-20 bg-purple-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-purple-900/40 border border-white/20">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 00-3 3v8a3 3 0 006 0V5a3 3 0 00-3-3z"></path>
          </svg>
        </div>
      )
    },
    {
      title: t.onboardingVisualTitle,
      description: t.onboardingVisualDesc,
      audioKey: 'voiceScript3',
      icon: (
        <div className="w-20 h-20 bg-emerald-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-emerald-900/40 border border-white/20">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </div>
      )
    },
    {
      title: t.onboardingReportTitle,
      description: t.onboardingReportDesc,
      audioKey: 'voiceScript4',
      icon: (
        <div className="w-20 h-20 bg-blue-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-900/40 border border-white/20">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
      )
    },
    {
      title: t.onboardingChatTitle,
      description: t.onboardingChatDesc,
      audioKey: 'voiceScript5',
      icon: (
        <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-900/40 border border-white/20">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
          </svg>
        </div>
      )
    }
  ];

  const stopAudio = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
    }
    setIsAudioPlaying(false);
  };

  const playStepAudio = async () => {
    if (isAudioPlaying) {
      stopAudio();
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    const step = steps[currentStep];
    const textToSpeak = t[step.audioKey] || `${step.title}. ${step.description}`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: textToSpeak }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("Voice synthesis yielded no data.");

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      
      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsAudioPlaying(false);
      
      source.start();
      sourceRef.current = source;
      setIsAudioPlaying(true);
    } catch (err: any) {
      console.error("Onboarding TTS failed:", err);
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        setError("Clinical Voice Synthesis is currently at capacity. Please try again in 1 minute.");
      } else {
        setError("Voice Guide unavailable. Proceeding with visual instruction.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Clean up on step change
  useEffect(() => {
    stopAudio();
    setError(null);
    return () => stopAudio();
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] max-w-lg w-full p-10 flex flex-col items-center text-center space-y-10 shadow-[0_0_120px_rgba(30,58,138,0.3)] animate-scaleIn relative overflow-hidden">
        
        {/* Progress Indicator */}
        <div className="flex space-x-2">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-blue-500' : 'w-2 bg-slate-800'}`} 
            />
          ))}
        </div>

        {step.icon}

        <div className="space-y-4">
          <h2 className="text-3xl font-black text-white tracking-tight uppercase leading-tight">{step.title}</h2>
          <p className="text-slate-400 text-lg leading-relaxed font-medium px-4">{step.description}</p>
        </div>

        {/* Audio Control Bar */}
        <div className="w-full">
          <button 
            onClick={playStepAudio}
            disabled={isGenerating}
            className={`w-full flex items-center justify-center space-x-3 px-6 py-4 rounded-2xl border transition-all ${
              isAudioPlaying 
                ? 'bg-red-900/20 border-red-500/50 text-red-400' 
                : 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20'
            } ${isGenerating ? 'opacity-50 cursor-wait' : ''}`}
          >
            {isGenerating ? (
              <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
            ) : isAudioPlaying ? (
              <>
                <div className="flex items-center space-x-1">
                   <div className="w-0.5 h-3 bg-red-400 rounded-full animate-[bounce_1s_infinite]"></div>
                   <div className="w-0.5 h-4 bg-red-400 rounded-full animate-[bounce_1.2s_infinite]"></div>
                   <div className="w-0.5 h-2 bg-red-400 rounded-full animate-[bounce_0.8s_infinite]"></div>
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Stop Guide</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
                <span className="text-xs font-black uppercase tracking-widest">Listen to Guide</span>
              </>
            )}
          </button>
          {error && (
            <p className="text-[10px] text-orange-500 font-bold mt-2 animate-pulse">{error}</p>
          )}
        </div>

        <div className="w-full space-y-4 pt-4 border-t border-slate-800">
          <div className="flex space-x-4">
            {currentStep > 0 && (
              <button 
                onClick={handleBack} 
                className="flex-1 bg-slate-800 text-slate-300 font-black py-5 rounded-2xl text-sm uppercase tracking-widest border border-slate-700 hover:bg-slate-750 transition-all active:scale-95"
              >
                {t.back}
              </button>
            )}
            <button 
              onClick={handleNext} 
              className="flex-[2] bg-blue-600 text-white font-black py-5 rounded-2xl text-sm uppercase tracking-widest shadow-xl shadow-blue-900/40 hover:bg-blue-500 transition-all active:scale-95"
            >
              {currentStep === steps.length - 1 ? t.getStarted : t.next}
            </button>
          </div>
          
          <button 
            onClick={onComplete} 
            className="text-slate-500 hover:text-slate-300 text-xs font-black uppercase tracking-widest transition-colors py-2"
          >
            {t.skip}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingGuide;
