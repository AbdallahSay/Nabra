import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Repeat,
  Download,
  ArrowRightLeft,
  Sparkles,
  Music,
  Mic,
  FastForward,
  Rewind,
  CheckCircle2,
  Sliders,
  Radio,
  Layers,
  Clock,
  Target,
  Flame,
  MapPin,
  Share2,
  Send,
  MessageCircle,
  Check,
} from 'lucide-react';
import { formatDuration, downloadBlob, wavToMp3Blob } from '../utils/audioUtils';

export function formatPrecisionTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
}

interface KeywordMarker {
  phrase: string;
  label: string;
  color: string;
  glowColor: string;
  badgeBg: string;
  textColor: string;
  startTime: number;
  endTime: number;
  startPercent: number;
  widthPercent: number;
  isActive: boolean;
}

const KEYWORD_CONFIGS = [
  {
    phrase: 'مين بيتابع كل ده؟',
    label: 'السؤال الافتتاحي (Hook)',
    color: 'from-amber-400 to-amber-500',
    glowColor: 'shadow-amber-500/50',
    badgeBg: 'bg-amber-500/20 border-amber-500/50',
    textColor: 'text-amber-300',
  },
  {
    phrase: 'تعرف.',
    label: 'وقفة التأكيد (Anchor)',
    color: 'from-emerald-400 to-teal-500',
    glowColor: 'shadow-emerald-500/50',
    badgeBg: 'bg-emerald-500/20 border-emerald-500/50',
    textColor: 'text-emerald-300',
  },
  {
    phrase: 'التنبيه بيوصلك على طول.',
    label: 'الحل المباشر (Direct Benefit)',
    color: 'from-cyan-400 to-blue-500',
    glowColor: 'shadow-cyan-500/50',
    badgeBg: 'bg-cyan-500/20 border-cyan-500/50',
    textColor: 'text-cyan-300',
  },
  {
    phrase: 'خلّي المعلومة هي اللي توصلك.',
    label: 'القيمة الجوهرية (Value Proposition)',
    color: 'from-purple-400 to-indigo-500',
    glowColor: 'shadow-purple-500/50',
    badgeBg: 'bg-purple-500/20 border-purple-500/50',
    textColor: 'text-purple-300',
  },
  {
    phrase: 'يعني ببساطة خليك دايماً في الصورة من غير أي مجهود إضافي.',
    label: 'الخاتمة وثقة البيزنس (Closing Outro)',
    color: 'from-rose-400 to-amber-500',
    glowColor: 'shadow-rose-500/50',
    badgeBg: 'bg-rose-500/20 border-rose-500/50',
    textColor: 'text-rose-300',
  },
];

interface AdvancedStudioPlayerProps {
  voiceText: string;
  voiceName: string;
  rawVoiceBlob: Blob | null;
  activeMixedBlob: Blob | null;
  selectedBgTrackName: string;
  bgVolume: number;
  isMixing: boolean;
  onDownloadMp3: (useMixed: boolean) => void;
  onDownloadWav: (useMixed: boolean) => void;
  isConvertingMp3: boolean;
  onSendToTranscriber?: (blob: Blob, text: string) => void;
}

export const AdvancedStudioPlayer: React.FC<AdvancedStudioPlayerProps> = ({
  voiceText,
  voiceName,
  rawVoiceBlob,
  activeMixedBlob,
  selectedBgTrackName,
  bgVolume,
  isMixing,
  onDownloadMp3,
  onDownloadWav,
  isConvertingMp3,
  onSendToTranscriber,
}) => {
  // Listen Mode: 'mixed' (voice + background bed) or 'solo' (voice only)
  const [listenMode, setListenMode] = useState<'mixed' | 'solo'>('mixed');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [masterVolume, setMasterVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // Simulated VU Meter levels
  const [leftMeter, setLeftMeter] = useState<number>(0);
  const [rightMeter, setRightMeter] = useState<number>(0);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [isPreparingShare, setIsPreparingShare] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const activeUrlRef = useRef<string | null>(null);

  // Determine active audio blob based on listenMode
  const currentBlob =
    listenMode === 'mixed' && activeMixedBlob
      ? activeMixedBlob
      : rawVoiceBlob || activeMixedBlob;

  const getMarketingShareText = () => {
    return `🎙️ *تعليق صوتي إعلاني جاهز للحملة التسويقية* (نبرة رائد أعمال):\n\n"${voiceText}"\n\n✨ تم التصميم والهندسة عبر استوديو نبرة الصوتي الذكي`;
  };

  const handleShareWhatsApp = async () => {
    if (!currentBlob) return;
    setIsPreparingShare(true);

    const shareText = getMarketingShareText();
    const fileName = `nabra-entrepreneur-voiceover-${Date.now()}.mp3`;

    try {
      const mp3Blob = await wavToMp3Blob(currentBlob);
      const audioFile = new File([mp3Blob], fileName, { type: 'audio/mp3' });

      // If browser can natively share audio file directly (e.g. mobile Safari/Chrome)
      if (navigator.canShare && navigator.canShare({ files: [audioFile] })) {
        await navigator.share({
          title: 'تعليق صوتي إعلاني - نبرة',
          text: shareText,
          files: [audioFile],
        });
        setShareNotice('تمت مشاركة الملف الصوتي بنجاح عبر واتساب!');
        setTimeout(() => setShareNotice(null), 3500);
        return;
      }
    } catch (err) {
      console.warn('Native file share skipped, using direct link + download:', err);
    } finally {
      setIsPreparingShare(false);
    }

    // Fallback: Download audio so user has it immediately, and open WhatsApp Web/App
    try {
      downloadBlob(currentBlob, fileName);
    } catch (e) {}

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    const link = document.createElement('a');
    link.href = waUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();

    setShareNotice('تم تنزيل الملف الصوتي وفتح واتساب لمشاركته في حملتك التسويقية!');
    setTimeout(() => setShareNotice(null), 4500);
  };

  const handleShareTelegram = async () => {
    if (!currentBlob) return;
    setIsPreparingShare(true);

    const shareText = getMarketingShareText();
    const fileName = `nabra-entrepreneur-voiceover-${Date.now()}.mp3`;

    try {
      const mp3Blob = await wavToMp3Blob(currentBlob);
      const audioFile = new File([mp3Blob], fileName, { type: 'audio/mp3' });

      if (navigator.canShare && navigator.canShare({ files: [audioFile] })) {
        await navigator.share({
          title: 'تعليق صوتي إعلاني - نبرة',
          text: shareText,
          files: [audioFile],
        });
        setShareNotice('تمت مشاركة الملف الصوتي بنجاح عبر تلجرام!');
        setTimeout(() => setShareNotice(null), 3500);
        return;
      }
    } catch (err) {
      console.warn('Native file share skipped, using direct link + download:', err);
    } finally {
      setIsPreparingShare(false);
    }

    try {
      downloadBlob(currentBlob, fileName);
    } catch (e) {}

    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(shareText)}`;
    const link = document.createElement('a');
    link.href = tgUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();

    setShareNotice('تم تنزيل الملف الصوتي وفتح تلجرام لمشاركته في حملتك التسويقية!');
    setTimeout(() => setShareNotice(null), 4500);
  };

  const handleShareNative = async () => {
    if (!currentBlob) return;
    setIsPreparingShare(true);
    const shareText = getMarketingShareText();
    const fileName = `nabra-entrepreneur-voiceover-${Date.now()}.mp3`;

    try {
      const mp3Blob = await wavToMp3Blob(currentBlob);
      const audioFile = new File([mp3Blob], fileName, { type: 'audio/mp3' });

      if (navigator.canShare && navigator.canShare({ files: [audioFile] })) {
        await navigator.share({
          title: 'تعليق صوتي إعلاني - نبرة',
          text: shareText,
          files: [audioFile],
        });
        setShareNotice('تمت مشاركة الملف الصوتي بنجاح!');
        setTimeout(() => setShareNotice(null), 3000);
      } else if (navigator.share) {
        await navigator.share({
          title: 'تعليق صوتي إعلاني - نبرة',
          text: shareText,
        });
      }
    } catch (e) {
      console.warn('Native share cancelled:', e);
    } finally {
      setIsPreparingShare(false);
    }
  };

  // Update audio source when blob or listenMode changes
  useEffect(() => {
    if (!currentBlob) return;

    const newUrl = URL.createObjectURL(currentBlob);
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
    }
    activeUrlRef.current = newUrl;

    if (audioRef.current) {
      const prevTime = audioRef.current.currentTime || 0;
      const wasPlaying = isPlaying;

      audioRef.current.src = newUrl;
      audioRef.current.currentTime = prevTime;
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.volume = isMuted ? 0 : masterVolume;
      audioRef.current.loop = isLooping;

      if (wasPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }

    return () => {
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
      }
    };
  }, [currentBlob, listenMode]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [isLooping]);

  // Visualizer & VU Meter animation loop
  useEffect(() => {
    let step = 0;
    const render = () => {
      step += 0.12;

      // Draw Waveform canvas
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const bars = 56;
          const barWidth = canvas.width / bars;

          for (let i = 0; i < bars; i++) {
            let height = 6;
            if (isPlaying) {
              const frequencyVariance =
                Math.sin(step + i * 0.25) * 0.45 +
                Math.sin(step * 1.8 + i * 0.18) * 0.35 +
                0.5;
              height = Math.max(6, frequencyVariance * (canvas.height * 0.9));
            }

            const progress = (i / bars) * (duration || 1);
            const isPlayed = progress <= currentTime;

            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            if (isPlayed) {
              gradient.addColorStop(0, '#f59e0b');
              gradient.addColorStop(0.6, '#fbbf24');
              gradient.addColorStop(1, '#10b981');
            } else {
              gradient.addColorStop(0, '#334155');
              gradient.addColorStop(1, '#475569');
            }

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(
              i * barWidth + 1.5,
              (canvas.height - height) / 2,
              barWidth - 2.5,
              height,
              [2]
            );
            ctx.fill();
          }
        }
      }

      // VU Meters simulation
      if (isPlaying) {
        const l = Math.min(100, Math.max(15, (Math.sin(step * 2.2) * 0.4 + 0.6) * 90));
        const r = Math.min(100, Math.max(15, (Math.cos(step * 1.9) * 0.4 + 0.6) * 88));
        setLeftMeter(l);
        setRightMeter(r);
      } else {
        setLeftMeter((prev) => Math.max(0, prev * 0.8));
        setRightMeter((prev) => Math.max(0, prev * 0.8));
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, currentTime, duration]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.volume = isMuted ? 0 : masterVolume;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const skipSeconds = (sec: number) => {
    if (!audioRef.current) return;
    const target = Math.max(0, Math.min(duration, audioRef.current.currentTime + sec));
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handleSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleVolume = (vol: number) => {
    setMasterVolume(vol);
    setIsMuted(false);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const toggleMute = () => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    if (audioRef.current) {
      audioRef.current.volume = newMute ? 0 : masterVolume;
    }
  };

  const toggleLoop = () => {
    const newLoop = !isLooping;
    setIsLooping(newLoop);
    if (audioRef.current) {
      audioRef.current.loop = newLoop;
    }
  };

  const remainingTime = Math.max(0, duration - currentTime);

  // Calculate proportional timeline positions for keyphrase markers in the audio
  const markers = useMemo<KeywordMarker[]>(() => {
    if (!voiceText || !duration || duration <= 0) return [];
    const text = voiceText.trim();
    const textLength = text.length;
    if (textLength === 0) return [];

    const found: KeywordMarker[] = [];

    KEYWORD_CONFIGS.forEach((cfg) => {
      let idx = text.indexOf(cfg.phrase);
      if (idx === -1) {
        // Try normalized punctuation match
        const normText = text.replace(/[؟?.,!]/g, '');
        const normPhrase = cfg.phrase.replace(/[؟?.,!]/g, '');
        idx = normText.indexOf(normPhrase);
      }

      if (idx !== -1) {
        const phraseLen = cfg.phrase.length;
        const startRatio = idx / textLength;
        const endRatio = Math.min(1, (idx + phraseLen) / textLength);

        const startTime = startRatio * duration;
        const endTime = endRatio * duration;
        const startPercent = Math.max(0, Math.min(94, startRatio * 100));
        const widthPercent = Math.max(5, Math.min(100 - startPercent, (endRatio - startRatio) * 100));

        const isActive = currentTime >= startTime - 0.25 && currentTime <= endTime + 0.35;

        found.push({
          phrase: cfg.phrase,
          label: cfg.label,
          color: cfg.color,
          glowColor: cfg.glowColor,
          badgeBg: cfg.badgeBg,
          textColor: cfg.textColor,
          startTime,
          endTime,
          startPercent,
          widthPercent,
          isActive,
        });
      }
    });

    return found.sort((a, b) => a.startTime - b.startTime);
  }, [voiceText, duration, currentTime]);

  const activeMarker = markers.find((m) => m.isActive);

  const jumpToMarker = (marker: KeywordMarker) => {
    if (!audioRef.current) return;
    const target = Math.max(0, marker.startTime);
    audioRef.current.currentTime = target;
    setCurrentTime(target);
    if (!isPlaying) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  return (
    <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
      {/* Decorative background aura */}
      <div className="absolute top-0 right-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hidden audio element */}
      <audio ref={audioRef} preload="auto" />

      {/* Top Bar: Monitor Status & A/B Comparison Switch */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                مشغل الاستوديو الاحترافي (Master Monitor & Player)
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-mono">
                  LIVE
                </span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                معاينة متزامنة ومباشرة للصوت مع الخلفية الموسيقية قبل الاعتماد والتحميل النهائي
              </p>
            </div>
          </div>
        </div>

        {/* Instant A/B Comparison Buttons */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            onClick={() => setListenMode('mixed')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              listenMode === 'mixed'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>الميكس الكامل (مع الموسيقى)</span>
          </button>

          <button
            onClick={() => setListenMode('solo')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              listenMode === 'solo'
                ? 'bg-slate-800 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>الصوت فقط (بدون موسيقى)</span>
          </button>
        </div>
      </div>

      {/* Active Track Info Card */}
      <div className="mb-5 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <div>
            <span className="text-slate-400 block text-[11px]">المقطع الجاهز:</span>
            <span className="text-white font-bold text-sm">
              تعليق رائد أعمال مصري ({voiceName})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            {listenMode === 'mixed' ? (
              <span>الخلفية المدمجة: <strong className="text-amber-300">{selectedBgTrackName}</strong> ({Math.round(bgVolume * 100)}%)</span>
            ) : (
              <span className="text-slate-400">وضع المعاينة: <strong className="text-slate-200">صوت خام Solo</strong></span>
            )}
          </span>
          <span className="text-slate-600">•</span>
          <span className="font-mono text-emerald-400">WAV 24kHz / 16-Bit Master</span>
        </div>
      </div>

      {/* Precision Audio Timeline & Signature Keyword Markers */}
      <div className="mb-5 p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 relative overflow-hidden">
        {/* Timeline Header: Duration & Active Focus Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
              <Clock className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-white">
              الشريط الزمني الدقيق (Audio Timeline):
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              {duration > 0 ? `${duration.toFixed(1)} ثانية (${formatPrecisionTime(duration)})` : '00:00.0'}
            </span>
          </div>

          {/* Active Keyphrase Indicator */}
          {activeMarker ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>تركيز نبرة نشط الآن: "{activeMarker.phrase}"</span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-400/80" />
              <span>أماكن العبارات المفتاحية المؤكدة على الشريط:</span>
            </div>
          )}
        </div>

        {/* Timeline Track with Visual Keyword Pins & Playhead */}
        <div
          className="relative h-14 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center px-2 cursor-pointer select-none overflow-hidden group shadow-inner"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            if (duration && audioRef.current) {
              const target = ratio * duration;
              audioRef.current.currentTime = target;
              setCurrentTime(target);
            }
          }}
        >
          {/* Background graduated time ticks */}
          <div className="absolute inset-0 flex justify-between items-end px-3 pb-1 pointer-events-none opacity-35">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((p, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <span className="h-2 w-0.5 bg-slate-400" />
                <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                  {formatDuration((duration || 10) * p)}
                </span>
              </div>
            ))}
          </div>

          {/* Audio Played Progress Fill */}
          <div
            className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-amber-500/20 via-amber-500/10 to-transparent pointer-events-none"
            style={{ width: `${Math.min(100, (currentTime / (duration || 1)) * 100)}%` }}
          />

          {/* Visual Keyword Marker Blocks on Timeline */}
          {markers.map((marker, idx) => (
            <div
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                jumpToMarker(marker);
              }}
              style={{
                right: `${marker.startPercent}%`,
                width: `${marker.widthPercent}%`,
              }}
              className={`absolute top-1.5 bottom-1.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer z-10 ${
                marker.isActive
                  ? `bg-gradient-to-r ${marker.color} text-slate-950 font-black shadow-lg ${marker.glowColor} scale-105 border-white`
                  : `${marker.badgeBg} ${marker.textColor} hover:scale-105`
              }`}
              title={`${marker.label}: "${marker.phrase}" [${formatPrecisionTime(marker.startTime)}] - اضغط للقفز المباشر`}
            >
              <div className="flex items-center gap-1 px-1.5 overflow-hidden text-[10px] font-bold truncate">
                <Target className={`w-3 h-3 shrink-0 ${marker.isActive ? 'text-slate-950 animate-spin' : ''}`} />
                <span className="truncate hidden sm:inline">{marker.phrase}</span>
                <span className="text-[9px] font-mono opacity-80 shrink-0">
                  {formatDuration(marker.startTime)}
                </span>
              </div>
            </div>
          ))}

          {/* Synchronized Playhead Needle Line */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-md shadow-amber-400/80 z-20 pointer-events-none transition-all duration-75"
            style={{ right: `${Math.min(100, (currentTime / (duration || 1)) * 100)}%` }}
          >
            <div className="w-3.5 h-3.5 bg-amber-400 rounded-full -mr-1.5 -mt-1 shadow-md shadow-amber-400/90 flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
            </div>
          </div>
        </div>

        {/* Quick Jump Keyword Chips Below Timeline */}
        {markers.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              القفز للعبارات المؤكدة:
            </span>
            {markers.map((marker, idx) => (
              <button
                key={idx}
                onClick={() => jumpToMarker(marker)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  marker.isActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/30 scale-105'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:border-amber-500/50'
                }`}
                title={`القفز إلى ${formatPrecisionTime(marker.startTime)}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>"{marker.phrase}"</span>
                <span className="font-mono text-[10px] text-slate-400">
                  {formatDuration(marker.startTime)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dual Waveform & VU Meter Area */}
      <div className="mb-5 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center gap-4 relative">
        {/* Stereo Peak VU Meters (Left / Right) */}
        <div className="flex items-center gap-1.5 shrink-0 bg-slate-900 p-2 rounded-xl border border-slate-800">
          <div className="flex flex-col items-center gap-1">
            <div className="w-2.5 h-16 bg-slate-800 rounded-sm relative overflow-hidden flex flex-col justify-end">
              <div
                className="w-full bg-gradient-to-t from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75 rounded-sm"
                style={{ height: `${leftMeter}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-slate-400">L</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-2.5 h-16 bg-slate-800 rounded-sm relative overflow-hidden flex flex-col justify-end">
              <div
                className="w-full bg-gradient-to-t from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75 rounded-sm"
                style={{ height: `${rightMeter}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-slate-400">R</span>
          </div>
        </div>

        {/* Dynamic Canvas Waveform */}
        <div className="flex-1 flex flex-col justify-center relative">
          <canvas
            ref={canvasRef}
            width={600}
            height={70}
            className="w-full h-16 rounded-xl cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              if (duration && audioRef.current) {
                const target = ratio * duration;
                audioRef.current.currentTime = target;
                setCurrentTime(target);
              }
            }}
          />

          {/* Scrubber slider directly synced */}
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 mt-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />

          {/* Timecode Readouts */}
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 mt-1.5">
            <span className="text-amber-300 font-bold">{formatDuration(currentTime)}</span>
            <span className="text-slate-500">
              متبقي: <span className="text-slate-300 font-semibold">-{formatDuration(remainingTime)}</span>
            </span>
            <span className="text-slate-400">{formatDuration(duration)}</span>
          </div>
        </div>
      </div>

      {/* Main Transport & Master Audio Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 mb-5">
        {/* Playback Transport Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => skipSeconds(-5)}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors cursor-pointer"
            title="رجوع 5 ثوانٍ"
          >
            <Rewind className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل المقطع'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => skipSeconds(5)}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors cursor-pointer"
            title="تقديم 5 ثوانٍ"
          >
            <FastForward className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().then(() => setIsPlaying(true));
              }
            }}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors cursor-pointer"
            title="إعادة التشغيل من البداية"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleLoop}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              isLooping
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700/80'
            }`}
            title={isLooping ? 'إيقاف التكرار التلقائي' : 'تفعيل التكرار التلقائي (Loop)'}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Speed presets */}
        <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 ml-1">السرعة:</span>
          {[0.85, 1.0, 1.15, 1.3].map((spd) => (
            <button
              key={spd}
              onClick={() => handleSpeed(spd)}
              className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                playbackSpeed === spd
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* Master Volume Slider */}
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
          <button
            onClick={toggleMute}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            {isMuted || masterVolume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-400" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : masterVolume}
            onChange={(e) => handleVolume(parseFloat(e.target.value))}
            className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>

      {/* Pre-Download Quality & Social Media Verification Box */}
      <div className="mb-5 p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>مخارج ألفاظ مصرية عامية طبيعية</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>مستوى صوت متوازن ومضبوط تلقائياً</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>جاهز للنشر على Reels وTikTok وLinkedIn</span>
        </div>
      </div>

      {/* Share Status Notice */}
      {shareNotice && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{shareNotice}</span>
          </div>
          <button
            onClick={() => setShareNotice(null)}
            className="text-emerald-400/70 hover:text-emerald-300 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Final Download, Quick Share & Round-trip Transcribe Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* MP3 Download Button */}
          <button
            onClick={() => onDownloadMp3(listenMode === 'mixed')}
            disabled={isConvertingMp3 || isMixing}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
            title="تحميل بصيغة MP3 المعالجة والجاهزة مباشرة للنشر"
          >
            {isConvertingMp3 ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>جارٍ تجهيز ملف MP3...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>تحميل MP3 النهائي</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-950/20 text-[10px] font-mono">
                  {listenMode === 'mixed' ? 'الميكس الكامل' : 'صوت فقط'}
                </span>
              </>
            )}
          </button>

          {/* WAV Download Button */}
          <button
            onClick={() => onDownloadWav(listenMode === 'mixed')}
            disabled={isMixing}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 font-bold text-sm transition-all hover:scale-[1.01] cursor-pointer"
            title="تحميل بصيغة WAV استوديو غير مضغوطة"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>تحميل WAV استوديو</span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-700 text-[10px] font-mono text-slate-300">
              {listenMode === 'mixed' ? 'ميكس' : 'خام'}
            </span>
          </button>

          {/* Quick Share to WhatsApp Button */}
          <button
            onClick={handleShareWhatsApp}
            disabled={isPreparingShare}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
            title="مشاركة المقطع الصوتي والنص الإعلاني مباشرة عبر واتساب لحملاتك التسويقية"
          >
            {/* WhatsApp Logo SVG */}
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.053-1.688-.387-.936-.391-1.62-1.222-2.029-1.782-.047-.064-.326-.435-.326-.828 0-.393.205-.586.279-.661.074-.075.162-.093.216-.093.054 0 .108.001.155.003.05.002.115-.019.18.136.068.163.232.568.252.609.02.041.034.089.007.143-.027.054-.041.088-.082.135-.041.048-.086.107-.123.144-.041.041-.084.086-.036.168.048.082.213.351.458.569.315.281.58.368.662.409.082.041.13.035.178-.02.048-.054.205-.239.26-.321.055-.082.109-.068.184-.041.075.027.478.225.56.266.082.041.137.062.157.096.02.034.02.198-.124.603zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.177L2 22l4.98-1.306A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.697 0-3.277-.488-4.609-1.332l-.33-.21-2.732.717.729-2.663-.223-.355A8.13 8.13 0 0 1 3.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z" />
            </svg>
            <span>واتساب</span>
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-950/40 text-[10px] font-medium text-emerald-200">
              مشاركة سريعة
            </span>
          </button>

          {/* Quick Share to Telegram Button */}
          <button
            onClick={handleShareTelegram}
            disabled={isPreparingShare}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
            title="مشاركة المقطع الصوتي والنص الإعلاني مباشرة عبر تلجرام"
          >
            {/* Telegram Logo SVG */}
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
            <span>تلجرام</span>
            <span className="px-1.5 py-0.5 rounded-md bg-sky-950/40 text-[10px] font-medium text-sky-200">
              مشاركة سريعة
            </span>
          </button>

          {/* Native File Share Sheet */}
          <button
            onClick={handleShareNative}
            disabled={isPreparingShare}
            className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold text-xs transition-all hover:scale-[1.01] cursor-pointer"
            title="مشاركة الملف الصوتي عبر أي تطبيق آخر مثبت بجهازك"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">مشاركة عامة</span>
          </button>
        </div>

        {/* Round-trip transcribe button */}
        {onSendToTranscriber && (
          <button
            onClick={() => {
              if (currentBlob) {
                onSendToTranscriber(currentBlob, voiceText);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
            title="أرسل هذا المقطع المعاين إلى نموذج gemini-3.5-transcribe للتفريغ واختبار الدقة"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>تفريغ بـ Gemini Transcribe</span>
          </button>
        )}
      </div>
    </div>
  );
};
