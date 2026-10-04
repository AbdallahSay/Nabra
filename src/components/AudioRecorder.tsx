import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Pause,
  Play,
  Upload,
  Sparkles,
  Volume2,
  AlertCircle,
  FileAudio,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { blobToBase64, formatDuration, createDemoAudioWav } from '../utils/audioUtils';

interface AudioRecorderProps {
  onTranscriptionComplete: (data: {
    text: string;
    modelUsed: string;
    audioBlob: Blob;
    audioBase64: string;
    mimeType: string;
    duration: number;
    fileName?: string;
  }) => void;
  isTranscribing: boolean;
  setIsTranscribing: (loading: boolean) => void;
  onSendToVoiceStudio?: (script: string) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onTranscriptionComplete,
  isTranscribing,
  setIsTranscribing,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, []);

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const drawVisualizer = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyserRef.current!.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.8;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * (canvas.height * 0.9);

        // Gradient from emerald to amber/gold
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(0.6, '#38bdf8');
        gradient.addColorStop(1, '#f59e0b');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
        if (x > canvas.width) break;
      }
    };

    render();
  };

  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      // Set up Web Audio visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      // Create MediaRecorder
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: finalType });
        setRecordedBlob(blob);
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        setFileName('تسجيل ميكروفون مباشر');
      };

      recorder.start(250); // chunk every 250ms
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      drawVisualizer();
    } catch (err: any) {
      console.error('Mic access error:', err);
      setErrorMessage(
        'تعذر الوصول إلى الميكروفون. يرجى التأكد من السماح بالوصول للميكروفون في المتصفح أو رفع ملف صوتي.'
      );
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopRecordingCleanup();
    setIsRecording(false);
    setIsPaused(false);
  };

  const resetRecording = () => {
    stopRecording();
    setRecordedBlob(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordingTime(0);
    setFileName('');
    setErrorMessage(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setErrorMessage('يرجى اختيار ملف صوتي صالح (MP3, WAV, M4A, OGG, WebM).');
      return;
    }

    setErrorMessage(null);
    setRecordedBlob(file);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    const url = URL.createObjectURL(file);
    setRecordedUrl(url);
    setFileName(file.name);
    setRecordingTime(0);
  };

  // Load a demo Egyptian audio sample
  const loadEgyptianDemoSample = (sampleType: 'pitch' | 'ad' | 'meeting') => {
    resetRecording();
    const demo = createDemoAudioWav(4);
    setRecordedBlob(demo.blob);
    const url = URL.createObjectURL(demo.blob);
    setRecordedUrl(url);

    if (sampleType === 'ad') {
      setFileName('عينة إعلان مصري: مين بيتابع كل ده؟');
    } else if (sampleType === 'pitch') {
      setFileName('عينة بيتش ريادي: شرح منصة التنبيهات الذكية');
    } else {
      setFileName('عينة ملاحظة صوتية: ملخص اجتماع استراتيجية');
    }
  };

  // Trigger Gemini 3.5 Transcribe
  const handleTranscribe = async () => {
    if (!recordedBlob) {
      setErrorMessage('يرجى تسجيل صوت بالميكروفون أو رفع ملف أولاً.');
      return;
    }

    setIsTranscribing(true);
    setErrorMessage(null);

    try {
      const base64Audio = await blobToBase64(recordedBlob);
      const mime = recordedBlob.type || 'audio/webm';

      // Serverless hosts (Vercel) reject request bodies above ~4.5MB
      const MAX_BASE64_CHARS = 4 * 1024 * 1024;
      if (base64Audio.length > MAX_BASE64_CHARS) {
        throw new Error(
          'الملف الصوتي كبير جداً (الحد الأقصى حوالي 3 ميجابايت). يرجى رفع مقطع أقصر أو بصيغة مضغوطة مثل MP3/M4A.'
        );
      }

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64Audio,
          mimeType: mime,
          prompt: customPrompt || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل التفريغ الصوتي');
      }

      onTranscriptionComplete({
        text: data.text,
        modelUsed: data.modelUsed || 'gemini-3.5-transcribe',
        audioBlob: recordedBlob,
        audioBase64: base64Audio,
        mimeType: mime,
        duration: recordingTime || 10,
        fileName: fileName || 'تسجيل صوتي',
      });
    } catch (err: any) {
      console.error('Transcription call error:', err);
      setErrorMessage(
        err?.message ||
          'حدث خطأ أثناء التفريغ عبر gemini-3.5-transcribe. تأكد من إعداد مفتاح API في الإعدادات.'
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <Mic className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              التفريغ الصوتي بالميكروفون والملفات
            </h2>
          </div>
          <p className="text-slate-400 text-sm">
            تفريغ فوري عالي الدقة يدعم اللهجة المصرية العامية والفصحى والإنجليزية باستخدام النموذج المتخصص
          </p>
        </div>

        {/* Model badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-emerald-500/30 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-medium text-emerald-300">
            gemini-3.5-transcribe
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-rose-200 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold mb-0.5">تنبيه:</p>
            <p className="text-rose-300/90">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Visualizer & Recording Canvas Area */}
      <div className="bg-slate-950/60 border border-slate-800/90 rounded-2xl p-5 mb-6 relative flex flex-col items-center justify-center min-h-[170px]">
        {isRecording ? (
          <div className="w-full flex flex-col items-center">
            {/* Live Visualizer Canvas */}
            <canvas
              ref={canvasRef}
              width={600}
              height={90}
              className="w-full h-24 max-w-lg rounded-xl mb-3"
            />
            {/* Recording pulse & timer */}
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
              </span>
              <span className="font-mono text-2xl font-bold text-white tracking-wider">
                {formatDuration(recordingTime)}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {isPaused ? 'متوقف مؤقتاً' : 'جارٍ التسجيل المباشر...'}
              </span>
            </div>
          </div>
        ) : recordedBlob ? (
          <div className="w-full flex flex-col items-center py-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </span>
              <div className="text-right">
                <h4 className="text-white font-medium text-base">{fileName || 'ملف صوتي جاهز'}</h4>
                <p className="text-slate-400 text-xs font-mono">
                  {recordedBlob.size > 1024 * 1024
                    ? `${(recordedBlob.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${Math.round(recordedBlob.size / 1024)} KB`}{' '}
                  • {recordingTime > 0 ? formatDuration(recordingTime) : 'صوت جاهز للتفريغ'}
                </p>
              </div>
            </div>

            {/* Audio player preview */}
            {recordedUrl && (
              <audio
                controls
                src={recordedUrl}
                className="w-full max-w-md h-11 rounded-lg bg-slate-900 border border-slate-700"
              />
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mx-auto mb-3 text-slate-400 group-hover:scale-105 transition-transform">
              <Mic className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-white font-medium text-base mb-1">
              اضغط على زر التسجيل وتحدث بطبيعتك
            </p>
            <p className="text-slate-400 text-xs max-w-md mx-auto">
              سواء كنت تتحدث باللهجة المصرية العامية أو الفصحى، سيتعرف نموذج gemini-3.5-transcribe على كلامك بدقة
            </p>
          </div>
        )}
      </div>

      {/* Main Action Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        {!isRecording ? (
          <>
            <button
              onClick={startRecording}
              disabled={isTranscribing}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Mic className="w-5 h-5" />
              <span>ابدأ تسجيل صوتك الآن</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isTranscribing}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors cursor-pointer font-medium text-sm"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>رفع ملف صوتي</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {recordedBlob && (
              <button
                onClick={resetRecording}
                className="p-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors"
                title="إعادة التعيين"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={resumeRecording}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>استئناف التسجيل</span>
              </button>
            ) : (
              <button
                onClick={pauseRecording}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-all cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                <span>إيقاف مؤقت</span>
              </button>
            )}

            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>إنهاء وحفظ التسجيل</span>
            </button>
          </>
        )}
      </div>

      {/* Primary Transcribe Trigger Button */}
      {recordedBlob && !isRecording && (
        <div className="pt-2 pb-4">
          <button
            onClick={handleTranscribe}
            disabled={isTranscribing}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-teal-400 hover:from-cyan-400 hover:via-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-base sm:text-lg shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isTranscribing ? (
              <>
                <div className="w-5 h-5 border-3 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>جارٍ التفريغ الصوتي الذكي عبر gemini-3.5-transcribe...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>تفريغ الصوت الآن بنموذج gemini-3.5-transcribe</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Quick Demo Egyptian Samples */}
      <div className="mt-5 pt-5 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            أو جرّب فوراً بإحدى العينات الصوتية الجاهزة:
          </span>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
          >
            {showAdvanced ? 'إخفاء الإعدادات المتقدمة' : 'إعدادات متقدمة للتفريغ'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() => loadEgyptianDemoSample('ad')}
            disabled={isRecording || isTranscribing}
            className="text-right p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 hover:border-amber-500/40 transition-all text-xs text-slate-300 hover:text-white flex items-center justify-between group cursor-pointer"
          >
            <div>
              <p className="font-semibold text-amber-300/90 mb-0.5">إعلان مصري سوشيال ميديا</p>
              <p className="text-slate-400 text-[11px] truncate">"مين بيتابع كل ده؟ تعرف..."</p>
            </div>
            <FileAudio className="w-4 h-4 text-amber-400/70 group-hover:text-amber-400 shrink-0" />
          </button>

          <button
            onClick={() => loadEgyptianDemoSample('pitch')}
            disabled={isRecording || isTranscribing}
            className="text-right p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 hover:border-emerald-500/40 transition-all text-xs text-slate-300 hover:text-white flex items-center justify-between group cursor-pointer"
          >
            <div>
              <p className="font-semibold text-emerald-300/90 mb-0.5">بيتش ريادي مصري</p>
              <p className="text-slate-400 text-[11px] truncate">شرح حل تقني وتوفير وقت</p>
            </div>
            <FileAudio className="w-4 h-4 text-emerald-400/70 group-hover:text-emerald-400 shrink-0" />
          </button>

          <button
            onClick={() => loadEgyptianDemoSample('meeting')}
            disabled={isRecording || isTranscribing}
            className="text-right p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 hover:border-cyan-500/40 transition-all text-xs text-slate-300 hover:text-white flex items-center justify-between group cursor-pointer"
          >
            <div>
              <p className="font-semibold text-cyan-300/90 mb-0.5">ملاحظة صوتية سريعة</p>
              <p className="text-slate-400 text-[11px] truncate">تنبيهات فورية ومتابعة العمل</p>
            </div>
            <FileAudio className="w-4 h-4 text-cyan-400/70 group-hover:text-cyan-400 shrink-0" />
          </button>
        </div>

        {/* Advanced Options Accordion */}
        {showAdvanced && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              تعليمات إضافية لنموذج التفريغ (Prompt):
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="مثال: ركّز على المصطلحات التقنية واللهجة المصرية العامية..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              افتراضياً يفرغ نموذج gemini-3.5-transcribe العامية المصرية بدقة كاملة وعلامات ترقيم دقيقة.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
