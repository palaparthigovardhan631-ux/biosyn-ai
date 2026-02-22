
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Language } from '../types';
import { translations } from '../translations';

interface VoiceLabProps {
  language: Language;
}

// Audio Utilities
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

// WAV Header Helper
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const result = new Int16Array(buffer.length * numChannels);
  for (let channel = 0; channel < numChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) {
      result[i * numChannels + channel] = Math.max(-1, Math.min(1, data[i])) * 32767;
    }
  }

  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + result.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, result.length * 2, true);

  return new Blob([header, result], { type: 'audio/wav' });
}

const VoiceLab: React.FC<VoiceLabProps> = ({ language }) => {
  const t = translations[language] || translations['English'];
  const [text, setText] = useState('');
  const [voiceName, setVoiceName] = useState('Kore');
  const [tone, setTone] = useState<'empathetic' | 'formal' | 'urgent'>('formal');
  const [isMultiSpeaker, setIsMultiSpeaker] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastAudioBuffer, setLastAudioBuffer] = useState<AudioBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopAudio = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleDownload = () => {
    if (!lastAudioBuffer) return;
    const wavBlob = audioBufferToWav(lastAudioBuffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BioSyn_Synthesized_${new Date().getTime()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSynthesize = async () => {
    if (isPlaying) { stopAudio(); return; }
    if (!text.trim()) return;

    setIsGenerating(true);
    setError(null);
    setLastAudioBuffer(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      
      let config: any = {
        responseModalities: [Modality.AUDIO],
      };

      let contents: any = [];

      if (isMultiSpeaker) {
        // Multi-speaker mode expects exactly 2 voice configs and a specific prompt format
        const conversationPrompt = `TTS the following conversation between Specialist and Resident:
          Specialist: ${text.split('\n')[0] || "No input detected."}
          Resident: ${text.split('\n')[1] || "Awaiting clinical instructions."}`;
        
        contents = [{ parts: [{ text: conversationPrompt }] }];
        config.speechConfig = {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: 'Specialist', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
              { speaker: 'Resident', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
            ]
          }
        };
      } else {
        const tonePrefix = tone === 'empathetic' 
          ? "Speak with empathy and care: " 
          : (tone === 'urgent' ? "Speak with urgency and alertness: " : "Speak with clinical formality: ");
        
        contents = [{ parts: [{ text: tonePrefix + text }] }];
        config.speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        };
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents,
        config,
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio returned.");

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      setLastAudioBuffer(audioBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
      sourceRef.current = source;
      setIsPlaying(true);
    } catch (err: any) {
      console.error("Synthesis failed:", err);
      setError("Clinical synthesis at capacity. Please retry in 60s.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-800 p-8 shadow-2xl animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.828-2.828" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">{t.voiceLabTitle}</h2>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{t.voiceLabDesc}</p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsMultiSpeaker(!isMultiSpeaker)}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isMultiSpeaker ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
        >
          {isMultiSpeaker ? t.multiSpeaker : t.singleSpeaker}
        </button>
      </div>

      <div className="space-y-8">
        {!isMultiSpeaker && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.voiceProfile}</label>
              <select 
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                className="w-full bg-slate-950 border-2 border-slate-800 focus:border-indigo-500 rounded-xl px-5 py-4 text-white outline-none transition-all font-bold"
              >
                <option value="Kore">Kore (Balanced Assistant)</option>
                <option value="Zephyr">Zephyr (Authoritative/Deep)</option>
                <option value="Puck">Puck (Energetic/Light)</option>
                <option value="Fenrir">Fenrir (Professional/Mature)</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.clinicalTone}</label>
              <div className="flex p-1 bg-slate-950 border-2 border-slate-800 rounded-xl space-x-1">
                {(['empathetic', 'formal', 'urgent'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setTone(v)}
                    className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tone === v ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {t[`tone${v.charAt(0).toUpperCase() + v.slice(1)}` as keyof typeof t]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isMultiSpeaker && (
          <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-2xl">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Multi-Speaker Configuration</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Speaker A (Specialist)</span>
                <span className="text-white font-bold text-xs">Kore (Balanced)</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Speaker B (Resident)</span>
                <span className="text-white font-bold text-xs">Puck (Light)</span>
              </div>
            </div>
            <p className="text-[9px] text-slate-500 mt-3 font-medium">Tip: Use line breaks to separate speakers in the text area below.</p>
          </div>
        )}

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Input Text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isMultiSpeaker ? "Line 1: Specialist says...\nLine 2: Resident replies..." : t.placeholderVoiceLab}
            className="w-full bg-slate-950 border-2 border-slate-800 focus:border-indigo-500 rounded-2xl p-6 text-white outline-none transition-all resize-none h-48 font-medium placeholder:text-slate-700"
          />
        </div>

        <div className="flex flex-col items-center space-y-4">
          <div className="flex w-full max-w-md gap-3">
            <button
              onClick={handleSynthesize}
              disabled={isGenerating || !text.trim()}
              className={`flex-1 flex items-center justify-center space-x-4 py-6 rounded-2xl font-black text-lg uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 ${
                isPlaying 
                  ? 'bg-red-600 text-white shadow-red-900/40 border border-red-500/30' 
                  : 'bg-indigo-600 text-white shadow-indigo-900/40 border border-indigo-400/30 hover:bg-indigo-500'
              } disabled:opacity-30`}
            >
              {isGenerating ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : isPlaying ? (
                <>
                  <div className="flex items-center space-x-1">
                     <div className="w-1 h-4 bg-white/80 rounded-full animate-[bounce_1s_infinite]"></div>
                     <div className="w-1 h-6 bg-white rounded-full animate-[bounce_1.2s_infinite]"></div>
                     <div className="w-1 h-3 bg-white/80 rounded-full animate-[bounce_0.8s_infinite]"></div>
                  </div>
                  <span>{t.stopReading}</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                  <span>{t.generateAudio}</span>
                </>
              )}
            </button>
            
            {lastAudioBuffer && (
              <button 
                onClick={handleDownload}
                className="w-20 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl flex items-center justify-center shadow-xl border border-slate-700 transition-all active:scale-95"
                title={t.downloadAudio}
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            )}
          </div>
          {error && <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest animate-pulse">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default VoiceLab;
