
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SymptomInput, Language } from '../types';
import { translations } from '../translations';

interface SymptomFormProps {
  onSubmit: (data: SymptomInput) => void;
  selectedLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

const AudioVisualizer: React.FC<{ analyzer: AnalyserNode | null }> = ({ analyzer }) => {
  const [levels, setLevels] = useState<number[]>(new Array(8).fill(2));
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!analyzer) return;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const updateLevels = () => {
      if (!analyzer) return;
      analyzer.getByteFrequencyData(dataArray);
      const newLevels = [];
      const step = Math.floor(bufferLength / 8);
      for (let i = 0; i < 8; i++) {
        const val = dataArray[i * step];
        newLevels.push(Math.max(4, (val / 255) * 24));
      }
      setLevels(newLevels);
      animationRef.current = requestAnimationFrame(updateLevels);
    };
    updateLevels();
    return () => cancelAnimationFrame(animationRef.current);
  }, [analyzer]);

  return (
    <div className="flex items-center space-x-0.5 h-6 px-2">
      {levels.map((lvl, i) => (
        <div key={i} className="w-1 bg-blue-400 rounded-full transition-all duration-75" style={{ height: `${lvl}px` }} />
      ))}
    </div>
  );
};

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

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

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
}

const SymptomForm: React.FC<SymptomFormProps> = ({ onSubmit, selectedLanguage }) => {
  const getT = (key: string): string => translations[selectedLanguage]?.[key] || translations['English'][key] || key;
  const [formData, setFormData] = useState<Omit<SymptomInput, 'language'>>({ description: '', duration: '', age: 30, gender: 'Other', medicalHistory: '' });
  const [preview, setPreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isReadingBack, setIsReadingBack] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stopVoiceSession = () => {
    activeSourcesRef.current.forEach(src => { try { src.stop(); } catch {} });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    if (audioContextInRef.current?.state !== 'closed') audioContextInRef.current?.close().catch(() => {});
    if (audioContextOutRef.current?.state !== 'closed') audioContextOutRef.current?.close().catch(() => {});
    if (liveSessionRef.current) try { liveSessionRef.current.close(); } catch {}
    setIsVoiceActive(false);
    setIsReadingBack(false);
    setAnalyser(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; setIsCameraActive(true); }
    } catch (err) { alert("Camera access failed."); }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); setIsCameraActive(false); }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setPreview(dataUrl);
      setFormData(prev => ({ ...prev, image: dataUrl }));
      stopCamera();
    }
  };

  const startVoiceSession = async () => {
    if (isVoiceActive) { stopVoiceSession(); return; }
    try {
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextInRef.current = inCtx;
      audioContextOutRef.current = outCtx;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = inCtx.createMediaStreamSource(stream);
      const nodeAnalyser = inCtx.createAnalyser();
      nodeAnalyser.fftSize = 64;
      source.connect(nodeAnalyser);
      setAnalyser(nodeAnalyser);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            try {
              const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                try {
                  const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
                  sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob })).catch(() => {});
                } catch (err) {}
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(inCtx.destination);
            } catch (err) {}
          },
          onmessage: async (m: LiveServerMessage) => {
            try {
              if (m.serverContent?.inputTranscription) setFormData(p => ({ ...p, description: (p.description + " " + m.serverContent!.inputTranscription!.text).trim() }));
              const audioData = m.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData && outCtx.state !== 'closed') {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                const buffer = await decodeAudioData(decode(audioData), outCtx, 24000, 1);
                const src = outCtx.createBufferSource();
                src.buffer = buffer; src.connect(outCtx.destination);
                src.onended = () => activeSourcesRef.current.delete(src);
                if (outCtx.state === 'suspended') await outCtx.resume().catch(() => {});
                src.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                activeSourcesRef.current.add(src);
              }
            } catch (err) {}
          },
          onerror: () => stopVoiceSession(),
          onclose: () => stopVoiceSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: `Symptom intake mode. Language: ${selectedLanguage}. Be concise.`,
          inputAudioTranscription: {}
        }
      });
      liveSessionRef.current = await sessionPromise;
      setIsVoiceActive(true);
    } catch (err) { stopVoiceSession(); }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit({ ...formData, language: selectedLanguage } as SymptomInput); };

  const inputClasses = "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-all text-sm font-medium";
  const textareaClasses = "w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-white outline-none focus:border-blue-500 transition-all resize-none text-sm font-medium";

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fadeIn">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{getT('patientAge')}</label>
          <input type="number" className={inputClasses} value={formData.age} onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{getT('biologicalGender')}</label>
          <select className={inputClasses} value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
            <option value="Male">{getT('male')}</option>
            <option value="Female">{getT('female')}</option>
            <option value="Other">{getT('other')}</option>
          </select>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{getT('symptomDescription')}</label>
          <div className="flex items-center space-x-2">
            {isVoiceActive && <AudioVisualizer analyzer={analyser} />}
            <button type="button" onClick={startVoiceSession} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isVoiceActive ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {isVoiceActive ? getT('listening') : getT('dictate')}
            </button>
          </div>
        </div>
        <textarea required className={`${textareaClasses} h-32`} placeholder={getT('placeholderSymptoms')} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
      </div>
      <div className="space-y-2">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{getT('duration')}</label>
        <input required type="text" className={inputClasses} placeholder={getT('placeholderDuration')} value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} />
      </div>
      <div className="space-y-6">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{getT('visualAssessment')}</label>
        {isCameraActive ? (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-800">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-3">
              <button type="button" onClick={capturePhoto} className="bg-white text-black p-3 rounded-full shadow-lg"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg></button>
              <button type="button" onClick={stopCamera} className="bg-red-500 text-white p-3 rounded-full shadow-lg"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="relative h-32 rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 transition-all bg-slate-950/50 overflow-hidden">
              {preview ? (
                <img src={preview} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-slate-900 transition-colors">
                  <svg className="w-8 h-8 text-slate-700 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{getT('uploadPhoto')}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
            <button type="button" onClick={startCamera} className="h-32 rounded-2xl border-2 border-slate-800 hover:border-blue-500/50 transition-all bg-slate-950/50 flex flex-col items-center justify-center space-y-1">
              <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{getT('openCamera')}</span>
            </button>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 text-xs uppercase tracking-[0.2em]">{getT('initiateAssessment')}</button>
    </form>
  );
};

export default SymptomForm;
