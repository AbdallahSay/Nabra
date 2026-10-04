import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  Sparkles,
  Flame,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Volume2,
} from 'lucide-react';
import { TranscriptionResult, ScriptAnalysis } from '../types';
import { downloadFile, formatDuration } from '../utils/audioUtils';

interface TranscriptionViewerProps {
  result: TranscriptionResult;
  onSendToVoiceStudio: (script: string) => void;
}

export const TranscriptionViewer: React.FC<TranscriptionViewerProps> = ({
  result,
  onSendToVoiceStudio,
}) => {
  const [text, setText] = useState<string>(result.text);
  const [copied, setCopied] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'transcription' | 'ad_script' | 'insights'>('transcription');

  const wordsCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const readingTimeSec = Math.ceil(wordsCount / 2.5);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    downloadFile(text, `transcription-${Date.now()}.txt`);
  };

  const handleDownloadSrt = () => {
    const srt = `1\n00:00:00,000 --> 00:00:${formatDuration(result.duration || 10).replace(':', ',000')}\n${text}\n`;
    downloadFile(srt, `subtitles-${Date.now()}.srt`);
  };

  const handleGenerateAdScript = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-transcription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        setActiveTab('ad_script');
      }
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
              <FileText className="w-5 h-5" />
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              نتائج التفريغ الصوتي الذكي
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>النموذج: <span className="font-mono text-emerald-400 font-semibold">{result.modelUsed}</span></span>
            <span>•</span>
            <span>{wordsCount} كلمة</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              قراءة ~{readingTimeSec} ثانية
            </span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/70 border border-slate-800 rounded-xl text-xs">
          <button
            onClick={() => setActiveTab('transcription')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'transcription'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            النص الأصلي المفرغ
          </button>
          <button
            onClick={() => {
              if (!analysis) handleGenerateAdScript();
              else setActiveTab('ad_script');
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'ad_script'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>سكريبت إعلان مصري ريادي</span>
          </button>
          {analysis && (
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'insights'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              النقاط التنفيذية
            </button>
          )}
        </div>
      </div>

      {/* Main Tab 1: Raw Transcription */}
      {activeTab === 'transcription' && (
        <div>
          <div className="relative mb-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              dir="rtl"
              className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-white text-base leading-relaxed focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 resize-none font-medium"
            />
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ النص</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadTxt}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>تحميل TXT</span>
              </button>

              <button
                onClick={handleDownloadSrt}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>ترجمة SRT</span>
              </button>
            </div>

            {/* Smart transformation to Egyptian Ad Script */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateAdScript}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>جارٍ صياغة السكريبت الإعلاني...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>تحويل هذا الكلام إلى سكريبت إعلاني مصري ريادي</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onSendToVoiceStudio(text)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
                title="إرسال هذا النص المفرغ مباشرة إلى استوديو الصوت لتوليده بصوت رائد الأعمال المصري"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>قراءة النص في استوديو الصوت</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab 2: Egyptian Entrepreneur Ad Script */}
      {activeTab === 'ad_script' && (
        <div>
          {isAnalyzing ? (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-300 font-semibold text-sm">
                جارٍ إعادة هندسة النص المفرغ ليكون سكريبت إعلاني مصري ريادي عالي التحويل...
              </p>
              <p className="text-slate-400 text-xs mt-1">
                نضيف النبرة الهادئة والواثقة، ونؤكد على عبارات: "مين بيتابع كل ده؟" و"التنبيه بيوصلك على طول"
              </p>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    السكريبت الإعلاني المصاغ بالعامية المصرية الريادية:
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    مدة الإلقاء التقريبية: ~{analysis.estimatedDurationSec} ثانية
                  </span>
                </div>
                <p className="text-white text-base leading-relaxed font-medium bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                  {analysis.adScript}
                </p>
              </div>

              {/* Direct Send To Voice Studio CTA */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-400">
                  هل يعجبك هذا السكريبت؟ يمكنك توليد الصوت الريادي المصري له فوراً بنقرة واحدة.
                </p>
                <button
                  onClick={() => onSendToVoiceStudio(analysis.adScript)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>توليد التعليق الصوتي الريادي في الاستوديو الآن</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <button
                onClick={handleGenerateAdScript}
                className="px-6 py-3 rounded-2xl bg-amber-500 text-slate-950 font-bold text-sm cursor-pointer"
              >
                توليد السكريبت الإعلاني الآن
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Tab 3: Insights & Action Points */}
      {activeTab === 'insights' && analysis && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h4 className="text-xs font-bold text-cyan-300 mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              خلاصة المقطع الصوتي المفرغ:
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed">{analysis.summary}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h4 className="text-xs font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              النقاط التنفيذية وخلاصة العمل:
            </h4>
            <ul className="space-y-2">
              {analysis.actionPoints.map((point, i) => (
                <li key={i} className="text-slate-300 text-xs sm:text-sm flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
