
import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../translations';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  readTime: string;
  image: string;
}

const wellnessArticles: Article[] = [
  {
    id: '1',
    title: 'Understanding Circadian Rhythms',
    excerpt: 'How your internal clock affects your energy levels and overall health.',
    content: 'Your circadian rhythm is a natural, internal process that regulates the sleep-wake cycle and repeats roughly every 24 hours. It can be influenced by environmental cues like sunlight and temperature...',
    category: 'Sleep',
    readTime: '5 min',
    image: 'https://picsum.photos/seed/sleep/800/400'
  },
  {
    id: '2',
    title: 'The Gut-Brain Connection',
    excerpt: 'Exploring the fascinating link between your digestive system and mental health.',
    content: 'The gut-brain axis is a bidirectional communication system between the central nervous system and the enteric nervous system of the gut. Recent research suggests that gut health can significantly impact mood and cognitive function...',
    category: 'Nutrition',
    readTime: '7 min',
    image: 'https://picsum.photos/seed/nutrition/800/400'
  },
  {
    id: '3',
    title: 'Mindfulness in Modern Medicine',
    excerpt: 'Practical techniques to reduce stress and improve focus in a busy world.',
    content: 'Mindfulness is the practice of purposely bringing ones attention to experiences occurring in the present moment without judgment. In clinical settings, mindfulness-based stress reduction has shown promising results...',
    category: 'Mental Health',
    readTime: '6 min',
    image: 'https://picsum.photos/seed/mind/800/400'
  }
];

interface WellnessArticlesProps {
  language: Language;
}

const WellnessArticles: React.FC<WellnessArticlesProps> = ({ language }) => {
  const t = translations[language] || translations['English'];
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  if (selectedArticle) {
    return (
      <div className="max-w-3xl mx-auto p-6 animate-fadeIn">
        <button 
          onClick={() => setSelectedArticle(null)}
          className="mb-8 flex items-center space-x-2 text-blue-500 hover:text-blue-400 font-black text-[10px] uppercase tracking-widest transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          <span>{t.backToArticles}</span>
        </button>
        
        <img src={selectedArticle.image} alt={selectedArticle.title} className="w-full h-64 object-cover rounded-3xl mb-8 shadow-2xl" referrerPolicy="no-referrer" />
        
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{selectedArticle.category}</span>
            <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">{selectedArticle.readTime} Read</span>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter leading-tight">{selectedArticle.title}</h2>
          <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed">
            <p className="text-xl text-slate-400 italic mb-8 border-l-4 border-blue-600 pl-6">{selectedArticle.excerpt}</p>
            <p>{selectedArticle.content}</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-12 animate-fadeIn">
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-black text-white tracking-tighter uppercase">{t.wellnessArticles}</h2>
        <p className="text-slate-400 max-w-2xl mx-auto font-medium">{t.wellnessDesc}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {wellnessArticles.map((article) => (
          <div 
            key={article.id} 
            className="group bg-slate-900/50 border border-slate-800 rounded-[2.5rem] overflow-hidden hover:border-blue-500/50 transition-all hover:shadow-2xl hover:shadow-blue-900/20"
          >
            <div className="h-48 overflow-hidden">
              <img 
                src={article.image} 
                alt={article.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-8 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{article.category}</span>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{article.readTime}</span>
              </div>
              <h3 className="text-xl font-black text-white leading-tight group-hover:text-blue-400 transition-colors">{article.title}</h3>
              <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">{article.excerpt}</p>
              <button 
                onClick={() => setSelectedArticle(article)}
                className="pt-4 flex items-center space-x-2 text-white font-black text-[10px] uppercase tracking-widest group-hover:translate-x-2 transition-transform"
              >
                <span>{t.readMore}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WellnessArticles;
