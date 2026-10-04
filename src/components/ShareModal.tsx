import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  X,
  Sparkles,
  Link,
  Users,
  Volume2,
  FileText,
} from 'lucide-react';
import { SharedItem } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  script: string;
  audioBase64?: string;
  audioMime?: string;
  voice?: string;
  platform?: string;
  dialect?: string;
  targetAudience?: string;
  hashtags?: string[];
  callToAction?: string;
  onOpenReviewModal?: (shareId: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  title,
  script,
  audioBase64,
  audioMime,
  voice,
  platform,
  dialect,
  targetAudience,
  hashtags,
  callToAction,
  onOpenReviewModal,
}) => {
  const [authorName, setAuthorName] = useState<string>('فريق الإنتاج الإبداعي');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          script,
          audioData: audioBase64 || undefined,
          audioMime: audioMime || 'audio/wav',
          voice,
          platform,
          dialect,
          targetAudience,
          hashtags,
          callToAction,
          authorName: authorName.trim() || 'فريق العمل',
          type: audioBase64 ? 'audio' : 'script',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل توليد رابط المشاركة');
      }

      setShareId(data.shareId);
      // Build absolute URL with ?share= parameter
      const origin = window.location.origin;
      const path = window.location.pathname;
      const fullUrl = `${origin}${path}?share=${data.shareId}`;
      setShareUrl(fullUrl);
    } catch (err: any) {
      console.error('Error generating share link:', err);
      setErrorMessage(err?.message || 'حدث خطأ أثناء توليد الرابط الفريد');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!shareUrl) return;
    const text = encodeURIComponent(
      `مرحباً، أشارككم مسودة إعلان "${title}" للمراجعة والاعتماد قبل التسجيل النهائي:\n${shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative overflow-hidden space-y-5">
        {/* Glow accent */}
        <div className="absolute top-0 right-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Share2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                توليد رابط مشاركة فريد للمراجعة
              </h3>
              <p className="text-xs text-slate-400">
                شارك هذا العمل مع فريقك للمراجعة والاعتماد وترك الملاحظات
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Summary Card */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-bold text-slate-200 truncate max-w-xs">{title}</span>
            <span className="flex items-center gap-1 font-mono text-[11px] text-amber-400">
              {audioBase64 ? (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>سكريبت + تسجيل صوتي</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>سكريبت إعلاني</span>
                </>
              )}
            </span>
          </div>
          <p className="text-slate-300 line-clamp-2 leading-relaxed">
            "{script}"
          </p>
        </div>

        {/* Author / Team identity field */}
        {!shareUrl && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              اسمك أو صفتك في الفريق (ليظهر لزملائك):
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="مثال: أحمد (كاتب المحتوى)، سارة (فريق الإعلانات)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Action: Generate or Display Share Link */}
        {!shareUrl ? (
          <button
            type="button"
            onClick={handleGenerateLink}
            disabled={isGenerating}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>جارٍ إنشاء الرابط الفريد وحفظ المسودة...</span>
              </>
            ) : (
              <>
                <Link className="w-4 h-4" />
                <span>إنشاء رابط المراجعة الفريد (Generate Link)</span>
              </>
            )}
          </button>
        ) : (
          <div className="space-y-3.5 animate-fadeIn">
            {/* Generated Link Input & Copy */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>تم إنشاء الرابط بنجاح! يمكن لأي شخص لديه الرابط مراجعة العمل والتعليق:</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none select-all"
                />

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>نسخ الرابط</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>مشاركة عبر واتساب</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (shareId && onOpenReviewModal) {
                    onClose();
                    onOpenReviewModal(shareId);
                  } else {
                    window.open(shareUrl, '_blank');
                  }
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-amber-400" />
                <span>معاينة صفحة المراجعة</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
