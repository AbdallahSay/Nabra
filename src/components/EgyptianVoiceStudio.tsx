import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Download,
  Share2,
  Check,
  Radio,
  Sliders,
  Flame,
  ArrowRightLeft,
  Info,
  Music,
  Zap,
  Coffee,
  TrendingUp,
  Upload,
  VolumeX,
  Bookmark,
  Trash2,
  CheckCircle2,
  Layers,
  FileText,
  Share2,
} from 'lucide-react';
import { GeneratedVoice } from '../types';
import { base64ToBlob, downloadBlob, formatDuration, wavToMp3Blob } from '../utils/audioUtils';
import {
  BACKGROUND_TRACKS,
  generateProceduralBackgroundTrack,
  mixVoiceWithBackground,
} from '../utils/backgroundAudio';
import { AdvancedStudioPlayer } from './AdvancedStudioPlayer';
import { ShareModal } from './ShareModal';

interface EgyptianVoiceStudioProps {
  initialScript?: string;
  onSendToTranscriber?: (audioBlob: Blob, text: string) => void;
  onOpenShareReviewModal?: (shareId: string) => void;
}

export type DialectType = 'egyptian' | 'msa';

export interface VoiceComparisonDraft {
  id: string;
  title: string;
  audioBlob: Blob;
  audioUrl: string;
  duration: number;
  voice: 'Fenrir' | 'Puck' | 'Charon';
  pitchLevel: 'deep' | 'balanced' | 'bright';
  speed: number;
  vocalEnergy: 'calm' | 'energetic' | 'friendly';
  dialect: DialectType;
  bgTrack: string;
  bgVolume: number;
  scriptSnippet: string;
  createdAt: number;
}

export const DIALECT_CONFIGS: Record<
  DialectType,
  {
    name: string;
    shortName: string;
    badge: string;
    subTitle: string;
    description: string;
    defaultScript: string;
    signaturePhrases: string[];
    presets: { title: string; script: string; tone: string }[];
  }
> = {
  egyptian: {
    name: 'اللهجة المصرية (العامية الريادية)',
    shortName: 'العامية المصرية',
    badge: 'عامية مصرية 🇪🇬',
    subTitle: 'نبرة رائد أعمال مصري هادئ، واثق، وعصري بدون تكلف',
    description: 'العامية المصرية البيزنس الحديثة المستخدمة في الشركات الناشئة ورواد الأعمال بالقاهرة.',
    defaultScript:
      'مين بيتابع كل ده؟ تعرف، التنبيه بيوصلك على طول. خلّي المعلومة هي اللي توصلك. يعني ببساطة خليك دايماً في الصورة من غير أي مجهود إضافي.',
    signaturePhrases: [
      'مين بيتابع كل ده؟',
      'تعرف.',
      'التنبيه بيوصلك على طول.',
      'خلّي المعلومة هي اللي توصلك.',
      'يعني ببساطة خليك دايماً في الصورة من غير أي مجهود إضافي.',
    ],
    presets: [
      {
        title: 'الإعلان الريادي الأساسي (الأصلي)',
        script:
          'مين بيتابع كل ده؟ تعرف، التنبيه بيوصلك على طول. خلّي المعلومة هي اللي توصلك. يعني ببساطة خليك دايماً في الصورة من غير أي مجهود إضافي.',
        tone: 'Confident, calm, modern Egyptian business tone',
      },
      {
        title: 'إعلان تطبيق ومتابعة أعمال لحظية',
        script:
          'كل يوم بنفتح عشرين تاب وعشر برامج عشان نتابع شغلنا. بس السؤال الحقيقي: مين بيتابع كل ده؟ تعرف، لما التنبيه بيوصلك على طول أول بأول، شغلك بيمشي أسرع بكتير. خلّي المعلومة هي اللي توصلك لحد عندك، يعني ببساطة خليك دايماً في الصورة من غير أي مجهود إضافي.',
        tone: 'Energetic social media ad for startups',
      },
      {
        title: 'عرض استثماري وفكرة سريعة (Pitch)',
        script:
          'في السوق الحالي السرعة هي كل شيء. أي صاحب بيزنس عنده نفس الصداع: مين بيتابع كل ده؟ الحل بتاعنا بسيط، التنبيه بيوصلك على طول في اللحظة المناسبة. خلّي المعلومة هي اللي توصلك، وكبّر شغلك براحتك.',
        tone: 'Calm, authoritative investor pitch',
      },
    ],
  },
  msa: {
    name: 'اللغة العربية الفصحى المعاصرة (MSA)',
    shortName: 'العربية الفصحى',
    badge: 'عربية فصحى 🌐',
    subTitle: 'نبرة ريادية فصحى معاصرة ومقنعة لأسواق الخليج والشرق الأوسط',
    description:
      'عربية فصحى راقية وعصرية، تلائم رواد الأعمال وأصحاب المشاريع عبر الخليج والمنطقة، دون تكلف إذاعي عتيق.',
    defaultScript:
      'من يتابع كل هذا؟ هل تعلم، التنبيه يصلك على الفور في اللحظة المناسبة. دع المعلومة تصل إليك مباشرة. ببساطة، ابقَ دائماً في الصورة دون أي جهد إضافي.',
    signaturePhrases: [
      'من يتابع كل هذا؟',
      'هل تعلم.',
      'التنبيه يصلك على الفور.',
      'دع المعلومة تصل إليك مباشرة.',
      'ببساطة، ابقَ دائماً في الصورة دون أي جهد إضافي.',
    ],
    presets: [
      {
        title: 'الإعلان الريادي بالفصحى المعاصرة',
        script:
          'من يتابع كل هذا؟ هل تعلم، التنبيه يصلك على الفور في اللحظة المناسبة. دع المعلومة تصل إليك مباشرة. ببساطة، ابقَ دائماً في الصورة دون أي جهد إضافي.',
        tone: 'Visionary Arab tech founder, calm and persuasive',
      },
      {
        title: 'إعلان تقني للشركات والحلول السحابية (B2B)',
        script:
          'في عالم الأعمال المعاصر، الوقت هو أثمن ما تملك. كل يوم تتشتت جهود الفريق بين عشرات المنصات. لكن السؤال الجوهري: من يتابع كل هذا؟ هل تعلم، عندما يصلك التنبيه الذكي في التوقيت المثالي، تنجز أعمالك بكفاءة مضاعفة. دع المعلومة تصل إليك، وركّز على نمو مشروعك.',
        tone: 'High-impact B2B SaaS advertisement',
      },
      {
        title: 'عرض استثماري وفكرة مبتكرة (MENA Pitch)',
        script:
          'السرعة والوضوح هما مفتاح النجاح لأي مشروع ناشئ. كل قائد أعمال يواجه ذات التحدي: من يتابع كل هذا؟ ابتكارنا يقدم الإجابة بذكاء. التنبيه يصلك على الفور، لتتخذ القرار الصائب قبل فوات الأوان. دع المعلومة تصل إليك وابقَ دوماً في المقدمة.',
        tone: 'Executive leadership & investor appeal',
      },
    ],
  },
};

export const EgyptianVoiceStudio: React.FC<EgyptianVoiceStudioProps> = ({
  initialScript,
  onSendToTranscriber,
  onOpenShareReviewModal,
}) => {
  const [dialect, setDialect] = useState<DialectType>('egyptian');
  const [script, setScript] = useState<string>(
    initialScript || DIALECT_CONFIGS.egyptian.defaultScript
  );
  const [selectedVoice, setSelectedVoice] = useState<'Fenrir' | 'Puck' | 'Charon'>('Fenrir');
  const [deliveryTone, setDeliveryTone] = useState<string>('social_ad');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentVoice, setCurrentVoice] = useState<GeneratedVoice | null>(null);
  const [shareModalData, setShareModalData] = useState<{
    title: string;
    script: string;
    audioBase64?: string;
    audioMime?: string;
    voice?: string;
    dialect?: string;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isConvertingMp3, setIsConvertingMp3] = useState<boolean>(false);
  const [selectedBgTrack, setSelectedBgTrack] = useState<string>('tech_upbeat');
  const [bgVolume, setBgVolume] = useState<number>(0.18);
  const [customBgBlob, setCustomBgBlob] = useState<Blob | null>(null);
  const [customBgName, setCustomBgName] = useState<string>('');
  const [rawVoiceBlob, setRawVoiceBlob] = useState<Blob | null>(null);
  const [activeAudioBlob, setActiveAudioBlob] = useState<Blob | null>(null);
  const [isMixing, setIsMixing] = useState<boolean>(false);
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const [exportWithMusic, setExportWithMusic] = useState<boolean>(true);
  const [isAiGeneratingScript, setIsAiGeneratingScript] = useState<boolean>(false);
  const [pitchLevel, setPitchLevel] = useState<'deep' | 'balanced' | 'bright'>('balanced');
  const [vocalEnergy, setVocalEnergy] = useState<'calm' | 'energetic' | 'friendly'>('energetic');
  const [equalizerProfile, setEqualizerProfile] = useState<'broadcast' | 'warm' | 'flat'>('broadcast');

  // Comparison Drafts / Takes State
  const [comparisonDrafts, setComparisonDrafts] = useState<VoiceComparisonDraft[]>([]);
  const [activeDraftPlayId, setActiveDraftPlayId] = useState<string | null>(null);
  const [draftSuccessNotice, setDraftSuccessNotice] = useState<string | null>(null);
  const draftAudioRef = useRef<HTMLAudioElement | null>(null);

  const currentDialectConfig = DIALECT_CONFIGS[dialect];

  const handleDialectChange = (newDialect: DialectType) => {
    const prevDefault = DIALECT_CONFIGS[dialect].defaultScript;
    setDialect(newDialect);
    if (!script.trim() || script.trim() === prevDefault.trim()) {
      setScript(DIALECT_CONFIGS[newDialect].defaultScript);
    }
  };

  const handleSaveAsDraft = () => {
    if (!currentVoice || (!activeAudioBlob && !rawVoiceBlob)) {
      setErrorMessage('لا يوجد مقطع صوتي متاح حالياً لحفظه كمسودة.');
      return;
    }

    const blobToSave = activeAudioBlob || rawVoiceBlob!;
    const takeNum = comparisonDrafts.length + 1;
    const pitchLabel =
      pitchLevel === 'deep' ? 'جهير ورخيم' : pitchLevel === 'bright' ? 'حاد وحيوي' : 'متوازن';
    const dialectLabel = dialect === 'msa' ? 'فصحى' : 'عامية';

    const newDraft: VoiceComparisonDraft = {
      id: Date.now().toString(),
      title: `مسودة مقارنة #${takeNum} (${selectedVoice} • ${playbackSpeed}x • ${pitchLabel} • ${dialectLabel})`,
      audioBlob: blobToSave,
      audioUrl: URL.createObjectURL(blobToSave),
      duration: duration || Math.round(script.split(/\s+/).length / 2.3),
      voice: selectedVoice,
      pitchLevel,
      speed: playbackSpeed,
      vocalEnergy,
      dialect,
      bgTrack: selectedBgTrack,
      bgVolume,
      scriptSnippet: script.length > 55 ? script.slice(0, 55) + '...' : script,
      createdAt: Date.now(),
    };

    setComparisonDrafts((prev) => [newDraft, ...prev]);
    setDraftSuccessNotice(
      `تم حفظ المقطع الحالي كـ "مسودة مقارنة #${takeNum}" بنجاح! يمكنك الآن تجربة إعدادات مختلفة ومقارنتها 🎙️`
    );
    setTimeout(() => setDraftSuccessNotice(null), 4000);
  };

  const handleTogglePlayDraft = (draft: VoiceComparisonDraft) => {
    if (!draftAudioRef.current) return;

    if (activeDraftPlayId === draft.id) {
      draftAudioRef.current.pause();
      setActiveDraftPlayId(null);
    } else {
      draftAudioRef.current.src = draft.audioUrl;
      draftAudioRef.current.playbackRate = draft.speed;
      draftAudioRef.current.play().then(() => setActiveDraftPlayId(draft.id)).catch(() => {});
    }
  };

  const handleApplyDraftAsActive = (draft: VoiceComparisonDraft) => {
    if (draftAudioRef.current) {
      draftAudioRef.current.pause();
      setActiveDraftPlayId(null);
    }

    setSelectedVoice(draft.voice);
    setPitchLevel(draft.pitchLevel);
    setPlaybackSpeed(draft.speed);
    setVocalEnergy(draft.vocalEnergy);
    setDialect(draft.dialect);
    setSelectedBgTrack(draft.bgTrack);
    setBgVolume(draft.bgVolume);

    setActiveAudioBlob(draft.audioBlob);
    setRawVoiceBlob(draft.audioBlob);

    const activeVoice: GeneratedVoice = {
      id: draft.id,
      text: script,
      audioBlobUrl: draft.audioUrl,
      audioBase64: '',
      mimeType: 'audio/wav',
      voiceName: draft.voice,
      timestamp: draft.createdAt,
    };
    setCurrentVoice(activeVoice);

    if (audioRef.current) {
      audioRef.current.src = draft.audioUrl;
      audioRef.current.playbackRate = draft.speed;
    }

    setDraftSuccessNotice(`تم اعتماد "${draft.title}" كنسخة رئيسية مفعلة في الاستوديو! ⭐`);
    setTimeout(() => setDraftSuccessNotice(null), 3500);
  };

  const handleDeleteDraft = (draftId: string) => {
    if (activeDraftPlayId === draftId && draftAudioRef.current) {
      draftAudioRef.current.pause();
      setActiveDraftPlayId(null);
    }
    setComparisonDrafts((prev) => prev.filter((d) => d.id !== draftId));
  };

  const handleShareDraft = (draft: VoiceComparisonDraft, platform: 'whatsapp' | 'telegram') => {
    const text = `🎙️ مسودة إعلانية (${draft.title}):\n\n"${draft.scriptSnippet}"\n\n✨ تم إعدادها بنبرة رائد الأعمال عبر استوديو نبرة الصوتي`;
    if (platform === 'whatsapp') {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      const link = document.createElement('a');
      link.href = waUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    } else {
      const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`;
      const link = document.createElement('a');
      link.href = tgUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    }
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const previewCtxRef = useRef<AudioContext | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up preview audio on unmount
  useEffect(() => {
    return () => {
      if (previewSourceRef.current) {
        try { previewSourceRef.current.stop(); } catch (e) {}
      }
      if (previewCtxRef.current && previewCtxRef.current.state !== 'closed') {
        previewCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Sync when initialScript changes
  useEffect(() => {
    if (initialScript && initialScript.trim()) {
      setScript(initialScript);
    }
  }, [initialScript]);

  // Audio element listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentVoice]);

  // Simulated live audio spectrum wave when playing
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let step = 0;
    const render = () => {
      step += 0.08;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bars = 48;
      const barWidth = canvas.width / bars;

      for (let i = 0; i < bars; i++) {
        let height = 4;
        if (isPlaying) {
          const wave =
            Math.sin(step + i * 0.3) * 0.5 +
            Math.sin(step * 1.5 + i * 0.2) * 0.3 +
            0.5;
          height = Math.max(6, wave * (canvas.height * 0.85));
        }

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#f59e0b');
        gradient.addColorStop(0.7, '#fbbf24');
        gradient.addColorStop(1, '#10b981');

        ctx.fillStyle = gradient;
        ctx.fillRect(
          i * barWidth + 1.5,
          (canvas.height - height) / 2,
          barWidth - 3,
          height
        );
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  // Insert signature emphasis phrase
  const insertPhrase = (phrase: string) => {
    if (script.includes(phrase)) {
      setScript((prev) => prev); // already in script
    } else {
      setScript((prev) => `${prev.trim()} ${phrase}`);
    }
  };

  const handleGenerateVoice = async () => {
    if (!script.trim()) {
      setErrorMessage('يرجى كتابة أو اختيار نص أولاً.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    // Build the specific persona prompt with custom pitch, pace, and energy
    const pitchDesc =
      pitchLevel === 'deep'
        ? 'Vocal pitch: Deep, resonant baritone warmth with low chest frequencies, authoritative and commanding founder voice.'
        : pitchLevel === 'bright'
        ? 'Vocal pitch: Bright, agile, clear higher pitch, crisp and youthful energy.'
        : 'Vocal pitch: Natural balanced conversational pitch, well-rounded and authentic.';

    const paceDesc =
      playbackSpeed < 1.0
        ? 'Pacing: Deliberate, calm, relaxed storytelling tempo with natural thoughtful pauses.'
        : playbackSpeed > 1.15
        ? 'Pacing: Fast, energetic, high-tempo social media ad delivery without stumbling or rushing.'
        : 'Pacing: Natural conversational rhythm, confident business tempo.';

    const energyDesc =
      vocalEnergy === 'energetic'
        ? 'Energy: High excitement, persuasive marketing hook delivery with dynamic inflections.'
        : vocalEnergy === 'friendly'
        ? 'Energy: Warm, friendly, approachable peer-to-peer founder sharing a smart solution.'
        : 'Energy: Calm, steady, quiet confidence without hype.';

    const isMsa = dialect === 'msa';

    const dialectBasePrompt = isMsa
      ? `Speak in clear, professional Modern Standard Arabic (اللغة العربية الفصحى المعاصرة). Male voice. Age around 28–38. Confident, modern visionary business entrepreneur tone. Sound like a visionary Arab tech founder explaining a cutting-edge business solution to peers and investors across the Gulf and MENA region. Do not sound like an ancient historical drama or stiff news anchor. Maintain natural conversational rhythm, eloquence, and authentic modern business charisma.`
      : `Speak in natural Egyptian Arabic. Male voice. Age around 28–38. Confident, modern business tone. Sound like a real Egyptian entrepreneur explaining a useful solution. Do not sound like a news presenter. Do not use formal Modern Standard Arabic pronunciation. Do not sound overly dramatic or like a traditional TV commercial. Use natural Egyptian rhythm.`;

    const emphasisLine = isMsa
      ? `Slightly emphasize: 'من يتابع كل هذا؟', 'هل تعلم.', 'التنبيه يصلك على الفور.', 'دع المعلومة تصل إليك مباشرة.', 'ببساطة، ابقَ دائماً في الصورة دون أي جهد إضافي.'`
      : `Slightly emphasize: 'مين بيتابع كل ده؟', 'تعرف.', 'التنبيه بيوصلك على طول.', 'خلّي المعلومة هي اللي توصلك.', 'يعني ببساطة خليك دايماً في الصورة من غير أي مجهود إضافي.'`;

    const personaInstruction = `${dialectBasePrompt}
${pitchDesc}
${paceDesc}
${energyDesc}
${emphasisLine}`;

    try {
      const res = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: script.trim(),
          voice: selectedVoice,
          style: personaInstruction,
          dialect: dialect,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل توليد الصوت الريادي');
      }

      const rawBlob = base64ToBlob(data.audioData, data.mimeType || 'audio/wav');
      setRawVoiceBlob(rawBlob);

      // Perform mix with selected background track if any
      let finalAudioBlob = rawBlob;
      if (selectedBgTrack !== 'none' || customBgBlob) {
        setIsMixing(true);
        try {
          const { mixedBlob } = await mixVoiceWithBackground(
            rawBlob,
            selectedBgTrack,
            bgVolume,
            customBgBlob || undefined
          );
          finalAudioBlob = mixedBlob;
        } catch (mixErr) {
          console.warn('Mix error, using raw audio:', mixErr);
        } finally {
          setIsMixing(false);
        }
      }

      setActiveAudioBlob(finalAudioBlob);
      const url = URL.createObjectURL(finalAudioBlob);

      const newVoice: GeneratedVoice = {
        id: Date.now().toString(),
        text: script.trim(),
        audioBlobUrl: url,
        audioBase64: data.audioData,
        mimeType: data.mimeType || 'audio/wav',
        voiceName: selectedVoice,
        timestamp: Date.now(),
      };

      setCurrentVoice(newVoice);
      setIsPlaying(false);
      setCurrentTime(0);

      // Autoplay preview
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.playbackRate = playbackSpeed;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }, 200);
    } catch (err: any) {
      console.error('Error generating voice:', err);
      setErrorMessage(
        err?.message || 'حدث خطأ في توليد الصوت. يرجى مراجعة إعدادات الخادم ومفتاح API.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Re-mix background with currently generated voice when track or volume changes
  const applyBackgroundMix = async (trackId: string, volume: number, customBlob?: Blob | null) => {
    if (!rawVoiceBlob) return;
    setIsMixing(true);
    try {
      if (trackId === 'none' && !customBlob) {
        setActiveAudioBlob(rawVoiceBlob);
        const url = URL.createObjectURL(rawVoiceBlob);
        if (audioRef.current) {
          const wasPlaying = isPlaying;
          audioRef.current.src = url;
          if (wasPlaying) {
            audioRef.current.play().catch(() => {});
          }
        }
        return;
      }

      const { mixedBlob } = await mixVoiceWithBackground(
        rawVoiceBlob,
        trackId,
        volume,
        customBlob || undefined
      );
      setActiveAudioBlob(mixedBlob);
      const url = URL.createObjectURL(mixedBlob);
      if (audioRef.current) {
        const wasPlaying = isPlaying;
        audioRef.current.src = url;
        if (wasPlaying) {
          audioRef.current.play().catch(() => {});
        }
      }
    } catch (err) {
      console.error('Mix update error:', err);
    } finally {
      setIsMixing(false);
    }
  };

  const stopBgPreview = () => {
    if (previewSourceRef.current) {
      try {
        previewSourceRef.current.stop();
      } catch (e) {}
      previewSourceRef.current = null;
    }
    setPreviewingTrackId(null);
  };

  const togglePreviewBgTrack = async (trackId: string) => {
    if (previewingTrackId === trackId) {
      stopBgPreview();
      return;
    }
    stopBgPreview();
    if (trackId === 'none') return;

    setPreviewingTrackId(trackId);
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      previewCtxRef.current = audioCtx;

      let buffer: AudioBuffer;
      if (trackId === 'custom' && customBgBlob) {
        const ab = await customBgBlob.arrayBuffer();
        buffer = await audioCtx.decodeAudioData(ab);
      } else {
        buffer = await generateProceduralBackgroundTrack(trackId, 8, audioCtx.sampleRate);
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(bgVolume * 1.5, 0);
      source.connect(gain);
      gain.connect(audioCtx.destination);
      source.start(0);
      previewSourceRef.current = source;
      source.onended = () => {
        setPreviewingTrackId(null);
      };
    } catch (err) {
      console.error('Preview error:', err);
      setPreviewingTrackId(null);
    }
  };

  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomBgBlob(file);
    setCustomBgName(file.name);
    setSelectedBgTrack('custom');
    if (rawVoiceBlob) {
      applyBackgroundMix('custom', bgVolume, file);
    }
  };

  const handleSelectTrack = (trackId: string) => {
    setSelectedBgTrack(trackId);
    stopBgPreview();
    if (rawVoiceBlob) {
      applyBackgroundMix(trackId, bgVolume, customBgBlob);
    }
  };

  const handleVolumeChange = (vol: number) => {
    setBgVolume(vol);
    if (rawVoiceBlob && (selectedBgTrack !== 'none' || customBgBlob)) {
      applyBackgroundMix(selectedBgTrack, vol, customBgBlob);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackSpeed;
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

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const getTargetExportBlob = (): Blob | null => {
    if (exportWithMusic && activeAudioBlob) {
      return activeAudioBlob;
    }
    return rawVoiceBlob || (currentVoice ? base64ToBlob(currentVoice.audioBase64, currentVoice.mimeType) : null);
  };

  const handleDownloadWav = () => {
    const targetBlob = getTargetExportBlob();
    if (!targetBlob) return;
    const suffix = exportWithMusic && selectedBgTrack !== 'none' ? 'master-mix' : 'vocals-only';
    downloadBlob(targetBlob, `nabra-egyptian-entrepreneur-${suffix}-${Date.now()}.wav`);
  };

  const handleDownloadMp3 = async () => {
    const targetBlob = getTargetExportBlob();
    if (!targetBlob) return;
    setIsConvertingMp3(true);
    try {
      const mp3Blob = await wavToMp3Blob(targetBlob);
      const suffix = exportWithMusic && selectedBgTrack !== 'none' ? 'master-mix' : 'vocals-only';
      downloadBlob(mp3Blob, `nabra-egyptian-entrepreneur-${suffix}-${Date.now()}.mp3`);
    } catch (err: any) {
      console.error('Failed to convert to MP3, downloading original WAV:', err);
      handleDownloadWav();
    } finally {
      setIsConvertingMp3(false);
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateAiScript = async () => {
    setIsAiGeneratingScript(true);
    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productDescription:
            dialect === 'msa'
              ? 'تطبيق ذكي وتنبيهات فورية لرواد الأعمال وأصحاب المشاريع والشركات لمتابعة الأداء والمبيعات'
              : 'تطبيق ذكي وتنبيهات فورية لرواد الأعمال وأصحاب المشاريع لمتابعة المبيعات وخدمة العملاء',
          targetAudience:
            dialect === 'msa'
              ? 'رواد الأعمال والمديرون التنفيذيون في الخليج والشرق الأوسط'
              : 'رواد الأعمال وأصحاب الشركات الناشئة في مصر',
          tone: 'confident',
          targetDuration: '30s',
          dialect: dialect,
        }),
      });
      const data = await res.json();
      if (data.success && data.script) {
        setScript(data.script);
      }
    } catch (e) {
      console.error('Error generating AI script:', e);
    } finally {
      setIsAiGeneratingScript(false);
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Dialect Switcher */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Flame className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              استوديو صوت رائد الأعمال (Entrepreneur Voice Studio)
            </h2>
          </div>
          <p className="text-slate-400 text-sm">
            {currentDialectConfig.subTitle}
          </p>
        </div>

        {/* Dialect Switcher Tabs: Egyptian vs MSA */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="p-1 bg-slate-950/90 border border-slate-800 rounded-2xl flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleDialectChange('egyptian')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dialect === 'egyptian'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇪🇬 العامية المصرية</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  dialect === 'egyptian' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-amber-400'
                }`}
              >
                ريادي مصري
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleDialectChange('msa')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dialect === 'msa'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🌐 العربية الفصحى (MSA)</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  dialect === 'msa' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-emerald-400'
                }`}
              >
                الخليج والعرب
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Persona Guidelines Box */}
      <div className="mb-6 p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 flex items-start gap-3 text-xs sm:text-sm text-slate-300">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-amber-300">مواصفات النبرة المطبقة:</p>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-amber-500/30 text-amber-300">
              {currentDialectConfig.badge}
            </span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            {currentDialectConfig.description} مع تركيز النبرة على العبارات المفتاحية الأساسية:
            {currentDialectConfig.signaturePhrases.slice(0, 3).map((ph, idx) => (
              <span key={idx} className="text-amber-300 font-semibold mx-1">
                "{ph}"
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* Script Input & Highlighting */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
            <span>نص الإعلان والسكريبت ({currentDialectConfig.shortName}):</span>
            <span className="text-xs text-slate-400">({script.length} حرف)</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAiScript}
              disabled={isAiGeneratingScript}
              className="text-xs text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="توليد سكريبت إعلاني تلقائياً بنموذج Google Gemini 3.8 Flash باللغة المختارة"
            >
              {isAiGeneratingScript ? (
                <>
                  <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span>Gemini يصيغ السكريبت...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>توليد سكريبت جديد بـ Gemini ({currentDialectConfig.shortName})</span>
                </>
              )}
            </button>

            <button
              onClick={copyScript}
              className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors px-2 py-1"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">تم النسخ</span>
                </>
              ) : (
                <span>نسخ النص</span>
              )}
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={4}
            dir="rtl"
            placeholder={
              dialect === 'msa'
                ? 'اكتب السكريبت الإعلاني هنا باللغة العربية الفصحى المعاصرة...'
                : 'اكتب السكريبت الإعلاني هنا بالعامية المصرية...'
            }
            className="w-full bg-slate-950/70 border border-slate-700/80 rounded-2xl p-4 text-white text-base leading-relaxed focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/40 resize-none font-medium"
          />
        </div>

        {/* Signature Emphasis Chips */}
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-400 mb-2">
            عبارات التأكيد الرئيسية ({currentDialectConfig.shortName}) - اضغط للإضافة أو التركيز:
          </p>
          <div className="flex flex-wrap gap-2">
            {currentDialectConfig.signaturePhrases.map((phrase, idx) => {
              const isIncluded = script.includes(phrase);
              return (
                <button
                  key={idx}
                  onClick={() => insertPhrase(phrase)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isIncluded
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:border-amber-500/40'
                  }`}
                >
                  <span>"{phrase}"</span>
                  {isIncluded && <Check className="w-3 h-3 text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preset Script Templates */}
      <div className="mb-6">
        <label className="text-xs font-semibold text-slate-400 mb-2 block">
          قوالب سكريبت جاهزة ({currentDialectConfig.name}):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {currentDialectConfig.presets.map((tmpl, index) => (
            <button
              key={index}
              onClick={() => setScript(tmpl.script)}
              className={`text-right p-3 rounded-xl border transition-all text-xs cursor-pointer ${
                script === tmpl.script
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:border-slate-600'
              }`}
            >
              <p className="font-bold mb-1">{tmpl.title}</p>
              <p className="text-slate-400 text-[11px] line-clamp-2">{tmpl.script}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Controls: Voice Properties & Advanced Customization */}
      <div className="mb-6 p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Sliders className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-white">خصائص الصوت والأداء الإعلاني (Voice Properties & Performance)</h4>
              <p className="text-[11px] text-slate-400">تخصيص دقيق لطبقة الصوت وسرعة الإلقاء ومستوى الحماس لتناسب أهداف إعلانك</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-amber-300">
            AI Voice Synthesis Controls
          </span>
        </div>

        {/* Row 1: Voice Persona & Pitch Level */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Male Voice Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              نبرة الصوت الرجالي الأساسية (Voice Persona):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Fenrir', name: 'فينرير (Fenrir)', desc: 'واثق وهادئ (32 سنة)' },
                { id: 'Puck', name: 'باك (Puck)', desc: 'إيقاع نشيط (28 سنة)' },
                { id: 'Charon', name: 'شارون (Charon)', desc: 'عميق ورزين (38 سنة)' },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVoice(v.id as any)}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    selectedVoice === v.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-500/10'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold">{v.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{v.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Pitch Level */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                مستوى حدة وطبقة الصوت (Voice Pitch & Resonance):
              </label>
              <span className="text-[10px] text-amber-300 font-mono">
                {pitchLevel === 'deep' ? 'جهير ورخيم' : pitchLevel === 'bright' ? 'حاد وحيوي' : 'متوازن طبيعي'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'deep', label: 'عميق ورخيم', desc: 'وقار وهيبة بودكاست' },
                { id: 'balanced', label: 'متوازن طبيعي', desc: 'ريادي مصري واقعي' },
                { id: 'bright', label: 'حاد وساطع', desc: 'شبابي وإعلاني سريع' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPitchLevel(p.id as any)}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    pitchLevel === p.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-500/10'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold">{p.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Speech Rate / Speed & Vocal Energy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
          {/* Speed & Delivery Style with Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                سرعة وتدفق الإلقاء (Speech Rate & Pacing):
              </label>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                {playbackSpeed.toFixed(2)}x
              </span>
            </div>

            <div className="flex items-center gap-1.5 mb-2">
              {[
                { val: 0.85, label: '0.85x هادئ' },
                { val: 1.0, label: '1.0x طبيعي' },
                { val: 1.15, label: '1.15x إعلاني' },
                { val: 1.3, label: '1.30x خاطف' },
              ].map((sp) => (
                <button
                  key={sp.val}
                  type="button"
                  onClick={() => handleSpeedChange(sp.val)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer ${
                    Math.abs(playbackSpeed - sp.val) < 0.04
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>

            <input
              type="range"
              min="0.75"
              max="1.45"
              step="0.05"
              value={playbackSpeed}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Vocal Energy & Intensity */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              طاقة وحماس النبرة (Vocal Energy & Mood):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'energetic', label: 'حماسي ومؤثر', desc: 'ريلز وتيك توك Hooks' },
                { id: 'calm', label: 'واثق وهادئ', desc: 'شرح بيزنس رزين' },
                { id: 'friendly', label: 'عفوي وودي', desc: 'نصيحة من صديق' },
              ].map((en) => (
                <button
                  key={en.id}
                  type="button"
                  onClick={() => setVocalEnergy(en.id as any)}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    vocalEnergy === en.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-500/10'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold">{en.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{en.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Audio Equalizer Profile (Quick Master Touch) */}
        <div className="pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-white">معالجة الصوت (EQ Profile):</span>
            <span className="text-[11px] text-slate-400">تحسين جودة المايكروفون الإذاعي</span>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {[
              { id: 'broadcast', label: 'إذاعي Broadcast (صوت ممتلئ)' },
              { id: 'warm', label: 'دافئ Warm (بيز ناعم)' },
              { id: 'flat', label: 'نقي Studio Flat' },
            ].map((eq) => (
              <button
                key={eq.id}
                type="button"
                onClick={() => setEqualizerProfile(eq.id as any)}
                className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  equalizerProfile === eq.id
                    ? 'bg-amber-500/25 border-amber-500 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {eq.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Background Audio & Commercial Music Bed */}
      <div className="mb-6 p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Music className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-white">الخلفية الصوتية والموسيقى الإعلانية (Commercial Audio Bed)</h4>
              <p className="text-[11px] text-slate-400">تندمج تلقائياً مع الصوت المولد لمنحه طابع إعلانات تيك توك وريلز الاحترافية</p>
            </div>
          </div>

          {/* Volume slider */}
          {selectedBgTrack !== 'none' && (
            <div className="flex items-center gap-2.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-300 font-medium">مستوى الموسيقى:</span>
              <input
                type="range"
                min="0.05"
                max="0.38"
                step="0.01"
                value={bgVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="text-[11px] font-mono text-amber-300 w-8">{Math.round(bgVolume * 100)}%</span>
            </div>
          )}
        </div>

        {/* Tracks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mb-3">
          {BACKGROUND_TRACKS.map((t) => {
            const isSelected = selectedBgTrack === t.id;
            const isPreviewing = previewingTrackId === t.id;
            return (
              <div
                key={t.id}
                onClick={() => handleSelectTrack(t.id)}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg ${isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                      {t.id === 'tech_upbeat' && <Zap className="w-3.5 h-3.5" />}
                      {t.id === 'calm_lofi' && <Music className="w-3.5 h-3.5" />}
                      {t.id === 'energetic_pitch' && <TrendingUp className="w-3.5 h-3.5" />}
                      {t.id === 'ambient_workspace' && <Coffee className="w-3.5 h-3.5" />}
                      {t.id === 'none' && <VolumeX className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-xs font-bold">{t.name}</span>
                  </div>

                  {t.id !== 'none' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePreviewBgTrack(t.id);
                      }}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isPreviewing
                          ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                      title={isPreviewing ? 'إيقاف المعاينة' : 'استماع تجريبي للموسيقى'}
                    >
                      {isPreviewing ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{t.desc}</p>
              </div>
            );
          })}

          {/* Custom File Upload Card */}
          <div
            onClick={() => bgFileInputRef.current?.click()}
            className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between group ${
              selectedBgTrack === 'custom'
                ? 'bg-amber-500/15 border-amber-500/60 text-white'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg ${selectedBgTrack === 'custom' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                  <Upload className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold">رفع ملف موسيقى خاص</span>
              </div>
              {customBgBlob && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePreviewBgTrack('custom');
                  }}
                  className={`p-1.5 rounded-lg border transition-all ${
                    previewingTrackId === 'custom'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {previewingTrackId === 'custom' ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {customBgName || 'اختر ملف MP3 أو WAV من جهازك'}
            </p>
            <input
              ref={bgFileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleCustomBgUpload}
            />
          </div>
        </div>

        {isMixing && (
          <div className="mt-2 text-center text-xs text-amber-300 flex items-center justify-center gap-2">
            <div className="w-3 h-3 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
            <span>جارٍ دمج الموسيقى الخلفية مع الصوت المولد في الاستوديو...</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-200 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Generate Voice Button */}
      <div className="mb-6">
        <button
          onClick={handleGenerateVoice}
          disabled={isGenerating}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 text-slate-950 font-black text-base sm:text-lg shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-3 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>جارٍ هندسة وتوليد الصوت المصري الريادي...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>توليد التعليق الصوتي الريادي الآن (Generate Egyptian Voiceover)</span>
            </>
          )}
        </button>
      </div>

      {/* Hidden audio element for draft preview playback */}
      <audio
        ref={draftAudioRef}
        onEnded={() => setActiveDraftPlayId(null)}
        className="hidden"
      />

      {/* Advanced Studio Audio Player with Live Background Monitor */}
      {currentVoice && (
        <div className="space-y-4">
          {/* Quick Action Bar: Save as Comparison Draft */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-emerald-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Bookmark className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-white">
                  هل تريد حفظ هذا الأداء الصوتي كمسودة لمقارنته بنسخ أخرى؟
                </h4>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                احفظ هذا المقطع الآن، ثم قم بتعديل السرعة أو حدة الصوت لتوليد نسخة أخرى ومقارنتها جنباً إلى جنب قبل الاعتماد.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const firstLine = currentVoice.text.split('\n')[0].replace(/[".]/g, '').trim();
                  const title = firstLine.length > 40 ? firstLine.slice(0, 40) + '...' : firstLine || 'تسجيل صوتي مصري';
                  setShareModalData({
                    title,
                    script: currentVoice.text,
                    audioBase64: currentVoice.audioBase64,
                    audioMime: currentVoice.mimeType,
                    voice: currentVoice.voiceName,
                    dialect,
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer shadow-md"
                title="توليد رابط مشاركة فريد لهذا التسجيل للمراجعة مع الفريق"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>مشاركة مع الفريق 🔗</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAsDraft}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
              >
                <Bookmark className="w-4 h-4" />
                <span>حفظ كمسودة مقارنة (Save Take)</span>
                {comparisonDrafts.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-950 text-amber-300 text-[10px] font-mono font-bold">
                    {comparisonDrafts.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {draftSuccessNotice && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{draftSuccessNotice}</span>
            </div>
          )}

          <AdvancedStudioPlayer
            voiceText={currentVoice.text}
            voiceName={currentVoice.voiceName}
            rawVoiceBlob={rawVoiceBlob}
            activeMixedBlob={activeAudioBlob}
            selectedBgTrackName={
              BACKGROUND_TRACKS.find((t) => t.id === selectedBgTrack)?.name ||
              (selectedBgTrack === 'custom' ? customBgName || 'ملف مخصص' : 'بدون خلفية')
            }
            bgVolume={bgVolume}
            isMixing={isMixing}
            onDownloadMp3={async (useMixed) => {
              const targetBlob =
                useMixed && activeAudioBlob
                  ? activeAudioBlob
                  : rawVoiceBlob || base64ToBlob(currentVoice.audioBase64, currentVoice.mimeType);
              if (!targetBlob) return;
              setIsConvertingMp3(true);
              try {
                const mp3Blob = await wavToMp3Blob(targetBlob);
                const suffix = useMixed && selectedBgTrack !== 'none' ? 'master-mix' : 'vocals';
                downloadBlob(mp3Blob, `nabra-egyptian-entrepreneur-${suffix}-${Date.now()}.mp3`);
              } catch (err) {
                console.error('MP3 error, falling back to WAV:', err);
                downloadBlob(targetBlob, `nabra-egyptian-entrepreneur-${Date.now()}.wav`);
              } finally {
                setIsConvertingMp3(false);
              }
            }}
            onDownloadWav={(useMixed) => {
              const targetBlob =
                useMixed && activeAudioBlob
                  ? activeAudioBlob
                  : rawVoiceBlob || base64ToBlob(currentVoice.audioBase64, currentVoice.mimeType);
              if (!targetBlob) return;
              const suffix = useMixed && selectedBgTrack !== 'none' ? 'master-mix' : 'vocals';
              downloadBlob(targetBlob, `nabra-egyptian-entrepreneur-${suffix}-${Date.now()}.wav`);
            }}
            isConvertingMp3={isConvertingMp3}
            onSendToTranscriber={onSendToTranscriber}
          />
        </div>
      )}

      {/* Voice Comparison Drafts Panel (Takes & A/B Testing) */}
      {comparisonDrafts.length > 0 && (
        <div className="mt-8 p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-amber-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  <Layers className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>مسودات المقارنة الصوتية (Voice Takes / Comparison Drafts)</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-bold">
                    {comparisonDrafts.length} مسودات
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                قارن بين خيارات الإلقاء المختلفة (سرعات متفاوتة، طبقات صوت مختلفة، أو لهجات بديلة) ثم اعتمد النسخة المفضلة بنقرة واحدة!
              </p>
            </div>

            {/* Quick Clear Button */}
            <button
              type="button"
              onClick={() => {
                if (confirm('هل أنت متأكد من مسح جميع مسودات المقارنة؟')) {
                  setComparisonDrafts([]);
                }
              }}
              className="text-xs text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
            >
              مسح جميع المسودات
            </button>
          </div>

          {/* Quick A/B Switcher when 2 or more drafts exist */}
          {comparisonDrafts.length >= 2 && (
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                <span>مقارنة سريعة A/B بين آخر نسختين:</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTogglePlayDraft(comparisonDrafts[0])}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeDraftPlayId === comparisonDrafts[0].id
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {activeDraftPlayId === comparisonDrafts[0].id ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                  <span>النسخة أ ({comparisonDrafts[0].speed}x • {comparisonDrafts[0].pitchLevel})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTogglePlayDraft(comparisonDrafts[1])}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeDraftPlayId === comparisonDrafts[1].id
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {activeDraftPlayId === comparisonDrafts[1].id ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                  <span>النسخة ب ({comparisonDrafts[1].speed}x • {comparisonDrafts[1].pitchLevel})</span>
                </button>
              </div>
            </div>
          )}

          {/* Drafts Cards List */}
          <div className="grid grid-cols-1 gap-3">
            {comparisonDrafts.map((draft, idx) => {
              const isPlayingThisDraft = activeDraftPlayId === draft.id;
              return (
                <div
                  key={draft.id}
                  className={`p-4 rounded-2xl border transition-all text-right ${
                    isPlayingThisDraft
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/5'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 text-xs font-mono font-bold flex items-center justify-center">
                          #{comparisonDrafts.length - idx}
                        </span>
                        <h4 className="text-sm font-bold text-white">
                          {draft.title}
                        </h4>
                      </div>

                      {/* Tag Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-amber-300 font-medium">
                          الصوت: {draft.voice}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-amber-300 font-mono">
                          {draft.speed}x
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                          الطبقة: {draft.pitchLevel === 'deep' ? 'جهير ورخيم' : draft.pitchLevel === 'bright' ? 'حاد وحيوي' : 'متوازن'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                          {draft.dialect === 'msa' ? 'عربية فصحى 🌐' : 'عامية مصرية 🇪🇬'}
                        </span>
                        {draft.bgTrack !== 'none' && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-emerald-400">
                            موسيقى: {draft.bgTrack}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions: Play/Pause, Set as Active, Delete */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      {/* Play / Pause Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleTogglePlayDraft(draft)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isPlayingThisDraft
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                            : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                        }`}
                        title="استماع سريع لهذه المسودة"
                      >
                        {isPlayingThisDraft ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            <span>إيقاف</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>استماع للمسودة</span>
                          </>
                        )}
                      </button>

                      {/* Set as Active Take Button */}
                      <button
                        type="button"
                        onClick={() => handleApplyDraftAsActive(draft)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all hover:scale-[1.02] cursor-pointer"
                        title="اعتماد هذه النسخة كنسخة نهائية للتحميل والتصدير"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>اعتماد كنسخة نهائية</span>
                      </button>

                      {/* Share to WhatsApp */}
                      <button
                        type="button"
                        onClick={() => handleShareDraft(draft, 'whatsapp')}
                        className="p-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 transition-colors cursor-pointer"
                        title="مشاركة هذه المسودة عبر واتساب"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.053-1.688-.387-.936-.391-1.62-1.222-2.029-1.782-.047-.064-.326-.435-.326-.828 0-.393.205-.586.279-.661.074-.075.162-.093.216-.093.054 0 .108.001.155.003.05.002.115-.019.18.136.068.163.232.568.252.609.02.041.034.089.007.143-.027.054-.041.088-.082.135-.041.048-.086.107-.123.144-.041.041-.084.086-.036.168.048.082.213.351.458.569.315.281.58.368.662.409.082.041.13.035.178-.02.048-.054.205-.239.26-.321.055-.082.109-.068.184-.041.075.027.478.225.56.266.082.041.137.062.157.096.02.034.02.198-.124.603zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.177L2 22l4.98-1.306A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.697 0-3.277-.488-4.609-1.332l-.33-.21-2.732.717.729-2.663-.223-.355A8.13 8.13 0 0 1 3.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z" />
                        </svg>
                      </button>

                      {/* Share to Telegram */}
                      <button
                        type="button"
                        onClick={() => handleShareDraft(draft, 'telegram')}
                        className="p-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 transition-colors cursor-pointer"
                        title="مشاركة هذه المسودة عبر تلجرام"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                        </svg>
                      </button>

                      {/* Delete Take Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="p-1.5 rounded-xl hover:bg-rose-500/15 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="حذف هذه المسودة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
