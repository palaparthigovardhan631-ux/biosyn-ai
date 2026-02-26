
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SymptomInput, Language } from '../types';
import { translations } from '../translations';
import { getRealTimeFeedback } from '../services/geminiService';

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
    // Ensure the buffer is aligned for Int16Array and has even length
    const length = data.byteLength - (data.byteLength % 2);
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + length);
    const dataInt16 = new Int16Array(arrayBuffer);
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isReadingBack, setIsReadingBack] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [realTimeFeedback, setRealTimeFeedback] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    let isMounted = true;

    const initCamera = async () => {
      if (!isCameraActive) return;

      // Wait for the video element to be available in the DOM
      let attempts = 0;
      while (!videoRef.current && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
        if (!isMounted) return;
      }

      if (isMounted && videoRef.current) {
        try {
          setIsCameraLoading(true);
          
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Camera API not supported in this browser or context (requires HTTPS).");
          }

          const constraints = {
            video: { 
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          };

          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          
          if (!isMounted || !isCameraActive) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }

          streamRef.current = stream;
          videoRef.current.srcObject = stream;
          
          // Some browsers require a small delay before playing
          await new Promise(resolve => setTimeout(resolve, 100));
          if (videoRef.current && isMounted) {
            await videoRef.current.play();
          }
        } catch (err: any) {
          if (isMounted) {
            console.error("Camera access failed:", err);
            const errorMsg = err.name === 'NotAllowedError' 
              ? "Camera access denied. Please enable permissions in your browser settings."
              : `Camera error: ${err.message || "Unknown error"}`;
            alert(errorMsg);
            setIsCameraActive(false);
          }
        } finally {
          if (isMounted) setIsCameraLoading(false);
        }
      }
    };

    if (isCameraActive) {
      initCamera();
    }

    return () => {
      isMounted = false;
    };
  }, [isCameraActive]);

  useEffect(() => {
    return () => {
      stopVoiceSession();
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      // Cleanup camera on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

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

  const handleRemovePhoto = () => {
    setPreview(null);
    setFormData(prev => ({ ...prev, image: undefined }));
    // Reset the file input if it exists
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const startCamera = () => {
    setIsCameraActive(true);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
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

  const validateField = useCallback((name: string, value: any) => {
    let error = '';
    switch (name) {
      case 'description':
        if (!value || value.trim().length < 1) error = getT('validationErrorDescription');
        break;
      case 'duration':
        if (!value || value.trim().length < 2) error = getT('validationErrorDuration');
        break;
      case 'age':
        if (value < 0 || value > 120) error = getT('validationErrorAge');
        break;
      default:
        break;
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return error;
  }, [selectedLanguage]);

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, (formData as any)[name]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors: Record<string, string> = {};
    const fields = ['description', 'duration', 'age'];
    let hasErrors = false;

    fields.forEach(field => {
      const error = validateField(field, (formData as any)[field]);
      if (error) {
        newErrors[field] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    setTouched({ description: true, duration: true, age: true, gender: true, medicalHistory: true });

    if (!hasErrors) {
      onSubmit({ ...formData, language: selectedLanguage } as SymptomInput);
    } else {
      // Scroll to first error
      const firstErrorField = document.querySelector('[aria-invalid="true"]');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, description: value }));

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);

    if (value.trim().length > 15) {
      feedbackTimeoutRef.current = setTimeout(async () => {
        setIsAnalyzing(true);
        try {
          const feedback = await getRealTimeFeedback(value, selectedLanguage);
          setRealTimeFeedback(feedback);
        } catch (err) {
          console.error("Real-time feedback error:", err);
        } finally {
          setIsAnalyzing(false);
        }
      }, 1500);
    } else {
      setRealTimeFeedback('');
    }
  };

  const inputClasses = (name: string) => `
    w-full bg-slate-950 border rounded-xl px-4 py-3 text-white outline-none transition-all text-sm font-medium
    ${touched[name] && errors[name] ? 'border-red-500 ring-1 ring-red-500/20' : 'border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'}
    hover:border-slate-700
  `;
  const textareaClasses = (name: string) => `
    w-full bg-slate-950 border rounded-2xl p-5 text-white outline-none transition-all resize-none text-sm font-medium
    ${touched[name] && errors[name] ? 'border-red-500 ring-1 ring-red-500/20' : 'border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'}
    hover:border-slate-700
  `;

  const ErrorLabel = ({ name }: { name: string }) => (
    touched[name] && errors[name] ? (
      <p id={`${name}-error`} className="text-[10px] font-bold text-red-400 mt-1 animate-fadeIn flex items-center">
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
        {errors[name]}
      </p>
    ) : null
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fadeIn" noValidate>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <label htmlFor="patient-age" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{getT('patientAge')}</label>
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{getT('fieldRequired')}</span>
          </div>
          <input 
            id="patient-age" 
            type="number" 
            className={inputClasses('age')} 
            value={formData.age} 
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              setFormData({ ...formData, age: val });
              if (touched.age) validateField('age', val);
            }} 
            onBlur={() => handleBlur('age')}
            aria-invalid={touched.age && !!errors.age}
            aria-describedby={errors.age ? 'age-error' : undefined}
          />
          <ErrorLabel name="age" />
        </div>
        <div className="space-y-2">
          <label htmlFor="biological-gender" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{getT('biologicalGender')}</label>
          <select 
            id="biological-gender" 
            className={inputClasses('gender')} 
            value={formData.gender} 
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
          >
            <option value="Male">{getT('male')}</option>
            <option value="Female">{getT('female')}</option>
            <option value="Other">{getT('other')}</option>
          </select>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <label htmlFor="symptom-description" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{getT('symptomDescription')}</label>
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{getT('fieldRequired')}</span>
          </div>
          <div className="flex items-center space-x-2">
            {isVoiceActive && <AudioVisualizer analyzer={analyser} />}
            <button type="button" onClick={startVoiceSession} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isVoiceActive ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {isVoiceActive ? getT('listening') : getT('dictate')}
            </button>
          </div>
        </div>
        <textarea 
          id="symptom-description" 
          className={`${textareaClasses('description')} h-32`} 
          placeholder={getT('placeholderSymptoms')} 
          value={formData.description} 
          onChange={(e) => {
            handleDescriptionChange(e);
            if (touched.description) validateField('description', e.target.value);
          }} 
          onBlur={() => handleBlur('description')}
          aria-invalid={touched.description && !!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />
        <ErrorLabel name="description" />
        
        { (isAnalyzing || realTimeFeedback) && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 animate-slide-up-fade">
            <div className="flex items-start space-x-3">
              <div className="mt-1">
                {isAnalyzing ? (
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 1118 0z" /></svg>
                )}
              </div>
              <p className="text-[11px] font-medium text-blue-200 leading-relaxed italic">
                {isAnalyzing ? "BioSyn AI is perceiving patterns..." : realTimeFeedback}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <label htmlFor="symptom-duration" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{getT('duration')}</label>
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{getT('fieldRequired')}</span>
          </div>
          <input 
            id="symptom-duration" 
            type="text" 
            className={inputClasses('duration')} 
            placeholder={getT('placeholderDuration')} 
            value={formData.duration} 
            onChange={(e) => {
              setFormData({ ...formData, duration: e.target.value });
              if (touched.duration) validateField('duration', e.target.value);
            }} 
            onBlur={() => handleBlur('duration')}
            aria-invalid={touched.duration && !!errors.duration}
            aria-describedby={errors.duration ? 'duration-error' : undefined}
          />
          <ErrorLabel name="duration" />
        </div>
        <div className="space-y-2">
          <label htmlFor="medical-history" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{getT('medicalHistory')}</label>
          <input 
            id="medical-history" 
            type="text" 
            className={inputClasses('medicalHistory')} 
            placeholder={getT('placeholderHistory')} 
            value={formData.medicalHistory} 
            onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })} 
          />
        </div>
      </div>
      <div className="space-y-6">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{getT('visualAssessment')}</label>
        {isCameraActive ? (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-800">
            {isCameraLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-3 z-20">
              <button type="button" onClick={capturePhoto} disabled={isCameraLoading} className="bg-white text-black p-3 rounded-full shadow-lg disabled:opacity-50"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg></button>
              <button type="button" onClick={stopCamera} className="bg-red-500 text-white p-3 rounded-full shadow-lg"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="relative h-32 rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-500/50 transition-all bg-slate-950/50 overflow-hidden group">
              {preview ? (
                <div className="relative w-full h-full">
                  <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      type="button" 
                      onClick={handleRemovePhoto}
                      className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all"
                    >
                      {getT('removePhoto')}
                    </button>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg md:hidden"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              ) : (
                <label htmlFor="photo-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-slate-900 transition-colors">
                  <svg className="w-8 h-8 text-slate-700 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{getT('uploadPhoto')}</span>
                  <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
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
