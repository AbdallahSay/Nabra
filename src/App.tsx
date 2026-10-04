/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  Sparkles,
  Flame,
  Radio,
  Layers,
  HelpCircle,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Zap,
  Sun,
  Moon,
  Users,
} from 'lucide-react';
import { AudioRecorder } from './components/AudioRecorder';
import { EgyptianVoiceStudio } from './components/EgyptianVoiceStudio';
import { TranscriptionViewer } from './components/TranscriptionViewer';
import { AdScriptGenerator } from './components/AdScriptGenerator';
import { TeamReviewModal } from './components/TeamReviewModal';
import { TranscriptionResult } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'transcribe' | 'voice_studio' | 'ad_generator'>('transcribe');
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [scriptForStudio, setScriptForStudio] = useState<string>('');
  const [activeReviewShareId, setActiveReviewShareId] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<{
    hasKey: boolean;
    transcribeModel: string;
    ttsModel: string;
  } | null>(null);

  // Check URL query params for ?share= on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const shareParam = params.get('share');
      if (shareParam) {
        setActiveReviewShareId(shareParam);
      }
    } catch (e) {}
  }, []);

  // Dark / Light Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('nabra_studio_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch (e) {}
    return 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
    try {
      localStorage.setItem('nabra_studio_theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Check health and model configuration on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealthStatus(data))
      .catch((err) => console.log('Health check note:', err));
  }, []);

  const handleTranscriptionComplete = (data: {
    text: string;
    modelUsed: string;
    audioBlob: Blob;
    audioBase64: string;
    mimeType: string;
    duration: number;
    fileName?: string;
  }) => {
    const url = URL.createObjectURL(data.audioBlob);
    setTranscriptionResult({
      text: data.text,
      modelUsed: data.modelUsed,
      timestamp: Date.now(),
      duration: data.duration,
      audioBlobUrl: url,
      audioBase64: data.audioBase64,
      mimeType: data.mimeType,
      fileName: data.fileName,
    });
  };

  const handleSendToVoiceStudio = (script: string) => {
    setScriptForStudio(script);
    setActiveTab('voice_studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`min-h-screen ${theme} bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif] selection:bg-amber-500 selection:text-slate-950 transition-colors duration-200`} dir="rtl">
      {/* Top Ambient Glow Effects */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-emerald-500/10 via-amber-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-emerald-400 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Radio className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">
                  نَبْرة | Nabra Studio
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  AI Masry
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                تفريغ صوتي بـ gemini-3.5-transcribe • صوت مصري ريادي واثق وهادئ
              </p>
            </div>
          </div>

          {/* Right Controls: Model Badges + Theme Switcher */}
          <div className="flex items-center gap-2.5">
            {/* Model & System Status Pills */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-mono">gemini-3.5-transcribe</span>
            </div>
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-slate-300 font-mono">gemini-3.8-flash-lite-tts</span>
            </div>

            {/* Team Review Quick Access Button */}
            <button
              type="button"
              onClick={() => setActiveReviewShareId('demo-team-review')}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5 group shadow-sm text-xs font-bold"
              title="مراجعة ومشاركة الأعمال مع الفريق"
            >
              <Users className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline text-slate-300 group-hover:text-amber-300">
                مراجعة الفريق
              </span>
            </button>

            {/* Dark / Light Mode Switcher Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-slate-700 transition-all cursor-pointer flex items-center gap-2 group shadow-sm"
              title={theme === 'dark' ? 'التبديل إلى الوضع الفاتح (Light Mode)' : 'التبديل إلى الوضع الداكن (Dark Mode)'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
                  <span className="text-xs font-bold hidden sm:inline text-slate-300 group-hover:text-amber-300">
                    الوضع الفاتح
                  </span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-sky-500 group-hover:-rotate-12 transition-transform duration-300" />
                  <span className="text-xs font-bold hidden sm:inline text-slate-700 group-hover:text-sky-600">
                    الوضع الداكن
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Studio Mode Selector Tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-slate-900/90 border border-slate-800/90 rounded-2xl">
            <button
              onClick={() => setActiveTab('transcribe')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'transcribe'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>التفريغ الصوتي (gemini-3.5-transcribe)</span>
            </button>

            <button
              onClick={() => setActiveTab('voice_studio')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'voice_studio'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>استوديو الصوت المصري الريادي</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-950/40 text-amber-300">
                ذكر 28–38 سنة
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ad_generator')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'ad_generator'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>مُولّد سكريبتات السوشيال ميديا</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Highlight Persona Banner */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                نبرة الصوت المعتمدة: رائد أعمال مصري (Male Voice 28–38)
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                نبرة بيزنس هادئة، واثقة، وعصرية، بدون تكلف أو مبالغة إعلانية، مع التركيز على عبارات:
                <span className="text-amber-300 font-semibold"> "مين بيتابع كل ده؟"</span>،
                <span className="text-amber-300 font-semibold"> "تعرف."</span>، و
                <span className="text-amber-300 font-semibold"> "التنبيه بيوصلك على طول."</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium">
              تفريغ فوري • عامية وفصحى
            </span>
          </div>
        </div>

        {/* Tab 1: Audio Transcription */}
        {activeTab === 'transcribe' && (
          <div className="space-y-8">
            <AudioRecorder
              onTranscriptionComplete={handleTranscriptionComplete}
              isTranscribing={isTranscribing}
              setIsTranscribing={setIsTranscribing}
              onSendToVoiceStudio={handleSendToVoiceStudio}
            />

            {/* Display Results */}
            {transcriptionResult && (
              <TranscriptionViewer
                result={transcriptionResult}
                onSendToVoiceStudio={handleSendToVoiceStudio}
              />
            )}
          </div>
        )}

        {/* Tab 2: Egyptian Voice Studio */}
        {activeTab === 'voice_studio' && (
          <div className="space-y-8">
            <EgyptianVoiceStudio
              initialScript={scriptForStudio}
              onSendToTranscriber={(blob, text) => {
                handleTranscriptionComplete({
                  text: text,
                  modelUsed: 'gemini-3.5-transcribe',
                  audioBlob: blob,
                  audioBase64: '',
                  mimeType: 'audio/wav',
                  duration: 8,
                  fileName: 'مقطع مولد من استوديو الصوت المصري',
                });
                setActiveTab('transcribe');
              }}
            />
          </div>
        )}

        {/* Tab 3: Ad Script Generator */}
        {activeTab === 'ad_generator' && (
          <div className="space-y-8">
            <AdScriptGenerator
              onLoadScriptToStudio={handleSendToVoiceStudio}
              onOpenShareReviewModal={(shareId) => setActiveReviewShareId(shareId)}
            />
          </div>
        )}
      </main>

      {/* Team Review & Feedback Modal */}
      {activeReviewShareId && (
        <TeamReviewModal
          shareId={activeReviewShareId}
          onClose={() => {
            setActiveReviewShareId(null);
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('share');
              window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
            } catch (e) {}
          }}
          onLoadScriptToStudio={handleSendToVoiceStudio}
          onLoadScriptToGenerator={(script) => {
            setActiveReviewShareId(null);
            setActiveTab('ad_generator');
          }}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            استوديو نبرة © 2026 — مدعوم بنموذج <span className="font-mono text-emerald-400">gemini-3.5-transcribe</span> للتفريغ الصوتي ونماذج Gemini الصوتية
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>اللهجة المصرية الريادية</span>
            <span>•</span>
            <span>واثق • هادئ • بيزنس عصري</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
