
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { HealthPerception, ChatMessage, Language, GroundingSource } from '../types';
import { chatWithHealthAssistant } from '../services/geminiService';
import { translations } from '../translations';
import { GoogleGenAI, Modality } from "@google/genai";

interface ChatBotProps {
  context: HealthPerception;
  isOnline: boolean;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
}

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

const ChatBot: React.FC<ChatBotProps> = ({ context, isOnline, messages, onMessagesChange }) => {
  const language: Language = context.language || 'English';
  const t = translations[language];
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => handleStopAudio();
  }, []);

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
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        throw new Error("AUTH_ERROR: Gemini API key is missing. Please select a key.");
      }
      const ai = new GoogleGenAI({ apiKey });
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
    } catch (err: any) {
      console.error("handleSpeak error:", err);
      setSpeakingIdx(null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isTyping || !isOnline) return;

    const userMessageText = input.trim();
    const newUserMessage: ChatMessage = { 
      role: 'user', 
      text: userMessageText || (selectedImage ? "[Image Attached]" : ""),
      image: selectedImage || undefined
    };
    
    setInput('');
    setSelectedImage(null);
    onMessagesChange([...messages, newUserMessage]);
    setIsTyping(true);

    try {
      const apiHistory = messages.map(m => ({
        role: m.role,
        parts: m.image ? [
          { text: m.text },
          { inlineData: { data: m.image.split(',')[1], mimeType: "image/png" } }
        ] : [{ text: m.text }]
      }));

      const { text, sources } = await chatWithHealthAssistant(
        apiHistory, 
        `Context: ${JSON.stringify(context)}. User: ${userMessageText}`,
        newUserMessage.image || undefined,
        language
      );

      const assistantMessage: ChatMessage = { role: 'model', text, sources };
      onMessagesChange([...messages, newUserMessage, assistantMessage]);
    } catch (err: any) {
      console.error("handleSend failed:", err);
      let errorMsg = 'Perception link interrupted. Please verify connection.';
      if (err.message?.includes("API key")) {
        errorMsg = 'AUTH_ERROR: Gemini API key is missing or invalid. Please re-authenticate.';
      } else if (err.message?.includes("safety")) {
        errorMsg = 'SAFETY_ERROR: Query flagged by safety protocols.';
      }
      onMessagesChange([...messages, newUserMessage, { role: 'model', text: errorMsg }]);
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
              {m.image && (
                <img src={m.image} alt="User attachment" className="max-w-full rounded-lg mb-3 border border-white/10" />
              )}
              <div className="markdown-body prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{m.text}</ReactMarkdown>
              </div>
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

      <div className="p-4 border-t-2 border-slate-800 bg-slate-900">
        {selectedImage && (
          <div className="mb-3 relative inline-block">
            <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded-lg border-2 border-blue-500" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex space-x-3">
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-slate-800 text-slate-400 p-4 rounded-xl hover:text-white transition-colors border-2 border-slate-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageSelect} 
            accept="image/*" 
            className="hidden" 
          />
          <input 
            type="text" 
            placeholder={t.enterQuery} 
            className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
          />
          <button 
            type="submit" 
            disabled={(!input.trim() && !selectedImage) || isTyping} 
            className="bg-blue-600 text-white p-4 rounded-xl shadow-xl active:scale-90 transition-all disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatBot;
