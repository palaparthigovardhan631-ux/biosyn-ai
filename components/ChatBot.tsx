
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { HealthPerception, ChatMessage, Language, GroundingSource } from '../types';
import { chatWithHealthAssistant } from '../services/geminiService';
import { translations } from '../translations';
import { GoogleGenAI, Modality } from "@google/genai";

interface ChatBotProps {
  context: HealthPerception;
  isOnline: boolean;
}

const STORAGE_KEY = 'biosyn_chat_history';

// Audio Utilities
function decode(base64: string) {
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.warn("Base64 decode in ChatBot failed:", e);
    return new Uint8Array(0);
  }
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  try {
    const bufferToUse = data.byteLength % 2 === 0 ? data.buffer : data.buffer.slice(0, data.byteLength - 1);
    const dataInt16 = new Int16Array(bufferToUse);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  } catch (e) {
    console.error("ChatBot decodeAudioData failed:", e);
    return ctx.createBuffer(numChannels, 1, sampleRate);
  }
}

const ChatBot: React.FC<ChatBotProps> = ({ context, isOnline }) => {
  const language: Language = context.language || 'English';
  const t = translations[language];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch (e) {}
    }
    return () => handleStopAudio();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleStopAudio = () => {
    try {
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch {}
        sourceRef.current = null;
      }
    } catch (e) {}
    setSpeakingIdx(null);
  };

  const handleSpeak = async (msg: string, idx: number) => {
    if (speakingIdx === idx) { handleStopAudio(); return; }
    handleStopAudio();
    setSpeakingIdx(idx);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: msg }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("TTS yielded no audio.");

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
      
      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setSpeakingIdx(null);
      source.start();
      sourceRef.current = source;
    } catch (err) {
      console.error("handleSpeak error:", err);
      setSpeakingIdx(null);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping || !isOnline) return;

    const userMessageText = input.trim();
    const newUserMessage: ChatMessage = { role: 'user', text: userMessageText };
    
    setInput('');
    setMessages(prev => [...prev, newUserMessage]);
    setIsTyping(true);

    try {
      const apiHistory = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const { text, sources } = await chatWithHealthAssistant(
        apiHistory, 
        `Context: ${JSON.stringify(context)}. User: ${userMessageText}`,
        language
      );

      const assistantMessage: ChatMessage = { role: 'model', text, sources };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error("handleSend failed:", err);
      setMessages(prev => [...prev, { role: 'model', text: 'Perception link interrupted. Please verify connection.' }]);
    } finally { setIsTyping(false); }
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-950 rounded-2xl border-2 border-slate-800 shadow-inner relative overflow-hidden">
      <div className="bg-slate-900/80 p-4 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`}></div>
          <span className={`text-xs font-black uppercase tracking-[0.2em] ${isOnline ? 'text-slate-400' : 'text-orange-400'}`}>
            {isOnline ? t.assistantActive : t.offlineMode}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-scaleIn`}>
            <div className={`relative max-w-[90%] px-5 py-4 rounded-2xl text-lg font-medium shadow-lg ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none'}`}>
              {m.text}
              {m.role === 'model' && (
                <button 
                  onClick={() => handleSpeak(m.text, i)}
                  className={`absolute -bottom-8 left-0 p-2 transition-all flex items-center space-x-2 ${speakingIdx === i ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                  <span className="text-[9px] font-black uppercase tracking-widest">{speakingIdx === i ? 'Playing' : 'Listen'}</span>
                </button>
              )}
            </div>
            {m.sources && m.sources.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {m.sources.map((source, sIdx) => (
                  <a 
                    key={sIdx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[9px] font-bold text-blue-400 bg-blue-900/20 px-2 py-1 rounded-md hover:bg-blue-800/40 transition-colors"
                  >
                    {source.title.length > 30 ? source.title.substring(0, 30) + '...' : source.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
        {isTyping && <div className="flex justify-start"><div className="bg-slate-800 border border-slate-700 px-5 py-4 rounded-2xl flex space-x-2"><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75"></div></div></div>}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t-2 border-slate-800 flex space-x-3 bg-slate-900">
        <input type="text" placeholder={t.enterQuery} className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all" value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" disabled={!input.trim() || isTyping} className="bg-blue-600 text-white p-4 rounded-xl shadow-xl active:scale-90 transition-all disabled:opacity-50"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg></button>
      </form>
    </div>
  );
};

export default ChatBot;
