import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Play,
  Pause,
  Copy,
  Check,
  Edit3,
  Volume2,
  Share2,
  Clock,
  X,
  Send,
  Download,
  Calendar,
} from 'lucide-react';
import { SharedItem, ShareReview } from '../types';
import { base64ToBlob, downloadBlob, formatDuration } from '../utils/audioUtils';

interface TeamReviewModalProps {
  shareId: string | null;
  onClose: () => void;
  onLoadScriptToStudio: (script: string) => void;
  onLoadScriptToGenerator: (script: string, productDesc?: string, targetAudience?: string) => void;
}

export const TeamReviewModal: React.FC<TeamReviewModalProps> = ({
  shareId,
  onClose,
  onLoadScriptToStudio,
  onLoadScriptToGenerator,
}) => {
  const [item, setItem] = useState<SharedItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // New review form
  const [reviewerName, setReviewerName] = useState<string>('');
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'needs_changes' | 'comment'>('approved');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  useEffect(() => {
    if (!shareId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(`/api/share/${shareId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.item) {
          setItem(data.item);
          // Set up audio if present
          if (data.item.audioData) {
            const blob = base64ToBlob(data.item.audioData, data.item.audioMime || 'audio/wav');
            const url = URL.createObjectURL(blob);
            const aud = new Audio(url);
            aud.onloadedmetadata = () => {
              if (isMounted) setDuration(aud.duration);
            };
            aud.ontimeupdate = () => {
              if (isMounted) setCurrentTime(aud.currentTime);
            };
            aud.onended = () => {
              if (isMounted) setIsPlaying(false);
            };
            audioRef.current = aud;
          }
        } else {
          setError(data.error || 'الرابط غير متاح أو منتهي الصلاحية');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching share item:', err);
        setError('تعذر تحميل بيانات رابط المشاركة');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [shareId]);

  if (!shareId) return null;

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownloadAudio = () => {
    if (!item?.audioData) return;
    const blob = base64ToBlob(item.audioData, item.audioMime || 'audio/wav');
    downloadBlob(blob, `${item.title.replace(/\s+/g, '_')}_audio.wav`);
  };

  const handleCopyLink = () => {
    const origin = window.location.origin;
    const path = window.location.pathname;
    const url = `${origin}${path}?share=${shareId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/share/${shareId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: reviewerName.trim() || 'عضو الفريق',
          comment: reviewComment.trim(),
          status: reviewStatus,
        }),
      });

      const data = await res.json();
      if (data.success && data.reviews) {
        setItem((prev) => (prev ? { ...prev, reviews: data.reviews } : null));
        setReviewComment('');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl my-6 p-5 sm:p-7 shadow-2xl relative overflow-hidden space-y-5">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  وضع مراجعة الفريق (Team Collaboration & Review)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  مشاركة فورية
                </span>
              </div>
              <p className="text-xs text-slate-400">
                راجع العمل مع فريقك، استمع للصوت، واترك ملاحظاتك أو اعتمد السكريبت
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

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-300 text-xs font-semibold">جارٍ تحميل بيانات مسودة الفريق والملاحظات...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="p-6 text-center space-y-3 bg-slate-950/60 rounded-2xl border border-slate-800">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">{error}</h4>
            <p className="text-xs text-slate-400">تأكد من صحة الرابط أو اطلب من صاحب السكريبت توليد رابط جديد.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق النافذة
            </button>
          </div>
        )}

        {/* Content View */}
        {!isLoading && item && (
          <div className="space-y-4">
            {/* Meta & Info Box */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>{item.title}</span>
                </h4>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>الكاتب: <strong className="text-slate-200">{item.authorName || 'عضو الفريق'}</strong></span>
                  <span>•</span>
                  <span>{new Date(item.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>

              {/* Audio Player if present */}
              {item.audioData && (
                <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleAudio}
                      className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>
                    <div>
                      <span className="text-xs font-bold text-white block">التسجيل الصوتي المرفق</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {formatDuration(currentTime)} / {formatDuration(duration || 10)} • صوت مصري
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadAudio}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="تحميل الصوت"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Script Text */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-amber-300 block">نص السكريبت المقترح:</span>
                <p className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-850 text-white text-sm leading-relaxed font-medium">
                  {item.script}
                </p>
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 pt-1">
                  <span>{item.script.split(/\s+/).filter(Boolean).length} كلمة</span>
                  <span>•</span>
                  <span>قراءة ~{Math.round(item.script.split(/\s+/).filter(Boolean).length / 2.3)} ثانية</span>
                </div>
              </div>

              {/* Action Buttons to take this script into Studio or Generator */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-850">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLoadScriptToGenerator(item.script, item.title, item.targetAudience);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل في المولد</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLoadScriptToStudio(item.script);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>تسجيل في الاستوديو</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'تم نسخ الرابط!' : 'نسخ الرابط'}</span>
                </button>
              </div>
            </div>

            {/* Team Feedback & Reviews Wall */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <span>ملاحظات واعتمادات الفريق ({item.reviews?.length || 0}):</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">سجل المراجعة والقرارات</span>
              </div>

              {/* Reviews List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(!item.reviews || item.reviews.length === 0) ? (
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-500">
                    لا توجد تعليقات حتى الآن. كن أول من يترك مراجعة أو يعتمد هذا السكريبت!
                  </div>
                ) : (
                  item.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-850 space-y-1.5 text-xs text-right"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-200 font-semibold">{rev.authorName}</strong>
                          {rev.status === 'approved' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                              معتمد للنشر ✅
                            </span>
                          )}
                          {rev.status === 'needs_changes' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                              مطلوب تعديل ⚠️
                            </span>
                          )}
                          {rev.status === 'comment' && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                              ملاحظة 💬
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(rev.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{rev.comment}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Review / Decision Form */}
              <form onSubmit={handleAddReview} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-300 block">إضافة قرار أو ملاحظة للسكريبت:</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="اسمك أو صفتك (مثال: ندى - مدير المحتوى)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />

                  {/* Decision Type Selector */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[10px]">
                    {[
                      { id: 'approved', label: 'اعتماد ✅' },
                      { id: 'needs_changes', label: 'طلب تعديل ⚠️' },
                      { id: 'comment', label: 'ملاحظة 💬' },
                    ].map((dec) => (
                      <button
                        key={dec.id}
                        type="button"
                        onClick={() => setReviewStatus(dec.id as any)}
                        className={`py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          reviewStatus === dec.id
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {dec.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="اكتب ملاحظتك لفريق العمل (مثال: النبرة ممتازة، تم الاعتماد للتسجيل)..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />

                  <button
                    type="submit"
                    disabled={isSubmittingReview || !reviewComment.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>إرسال</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
