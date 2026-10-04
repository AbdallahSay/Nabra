/**
 * Background Audio & Music Synthesizer for Egyptian Voice Studio
 * Provides royalty-free, high-quality ambient and commercial music beds
 */

export interface BackgroundTrack {
  id: string;
  name: string;
  nameEn: string;
  desc: string;
  category: 'upbeat' | 'lofi' | 'inspirational' | 'ambient' | 'custom';
  icon: string;
}

export const BACKGROUND_TRACKS: BackgroundTrack[] = [
  {
    id: 'none',
    name: 'بدون خلفية (صوت خام فقط)',
    nameEn: 'Voice Only',
    desc: 'تسجيل صوتي نقي بدون أي موسيقى أو مؤثرات',
    category: 'ambient',
    icon: 'Mic',
  },
  {
    id: 'tech_upbeat',
    name: 'إيقاع تيك وريلز عصري (Tech Reels)',
    nameEn: 'Modern Tech Upbeat',
    desc: 'موسيقى ريادية خفيفة وحيوية مع إيقاع عصري مناسب لمقاطع إنستغرام وتيك توك',
    category: 'upbeat',
    icon: 'Zap',
  },
  {
    id: 'calm_lofi',
    name: 'بيانو هادئ ولو-فاي (Calm Piano)',
    nameEn: 'Calm Lo-Fi & Piano',
    desc: 'نغمات بيانو دافئة وهادئة تمنح الكلام مصداقية وثقة عالية',
    category: 'lofi',
    icon: 'Music',
  },
  {
    id: 'energetic_pitch',
    name: 'طاقة ومصداقية استثمارية (Investor Pitch)',
    nameEn: 'Inspiring Energy',
    desc: 'خلفية تصاعدية ملهمة تعطي إحساساً بالحلول والنمو السريع',
    category: 'inspirational',
    icon: 'TrendingUp',
  },
  {
    id: 'ambient_workspace',
    name: 'أجواء مساحة عمل وكافيه (Coworking Hub)',
    nameEn: 'Workspace Ambience',
    desc: 'أصوات محيطة هادئة تعكس أجواء بيئة العمل والشركات الناشئة',
    category: 'ambient',
    icon: 'Coffee',
  },
];

/**
 * Synthesizes procedural background music of exact duration using Web Audio API
 */
export async function generateProceduralBackgroundTrack(
  trackId: string,
  durationSeconds: number,
  sampleRate: number = 44100
): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * (durationSeconds + 1)), sampleRate);

  if (trackId === 'tech_upbeat') {
    renderTechUpbeat(offlineCtx, durationSeconds);
  } else if (trackId === 'calm_lofi') {
    renderCalmLofi(offlineCtx, durationSeconds);
  } else if (trackId === 'energetic_pitch') {
    renderInspiringEnergy(offlineCtx, durationSeconds);
  } else if (trackId === 'ambient_workspace') {
    renderWorkspaceAmbience(offlineCtx, durationSeconds);
  } else {
    // Return empty silent buffer
    return offlineCtx.startRendering();
  }

  return await offlineCtx.startRendering();
}

/**
 * 1. Tech Upbeat track: 116 BPM, upbeat bass and gentle synth chords
 */
function renderTechUpbeat(ctx: OfflineAudioContext, duration: number) {
  const bpm = 116;
  const beatSec = 60 / bpm;
  const chords = [
    [220, 261.63, 329.63, 392], // Am7
    [174.61, 220, 261.63, 329.63], // Fmaj7
    [261.63, 329.63, 392, 523.25], // C
    [196, 246.94, 293.66, 392], // G
  ];

  let time = 0;
  let chordIdx = 0;

  // Master bus
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.35, 0);
  masterGain.connect(ctx.destination);

  while (time < duration) {
    const currentChord = chords[chordIdx % chords.length];
    const chordDuration = beatSec * 4;

    // Soft warm pad
    currentChord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.04, time + 0.3);
      gain.gain.setValueAtTime(0.04, time + chordDuration - 0.4);
      gain.gain.linearRampToValueAtTime(0, time + chordDuration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(time);
      osc.stop(time + chordDuration);
    });

    // Light rhythmic pluck arpeggio (every 1/2 beat)
    for (let b = 0; b < 8; b++) {
      const noteTime = time + b * (beatSec / 2);
      if (noteTime >= duration) break;

      const pluckFreq = currentChord[b % currentChord.length] * 2;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pluckFreq, noteTime);

      gain.gain.setValueAtTime(0.06, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.2);
    }

    // Subtle soft kick pulse on beat 1 and 3
    for (let b = 0; b < 4; b += 2) {
      const kickTime = time + b * beatSec;
      if (kickTime >= duration) break;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(110, kickTime);
      osc.frequency.exponentialRampToValueAtTime(45, kickTime + 0.08);

      gain.gain.setValueAtTime(0.12, kickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, kickTime + 0.12);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(kickTime);
      osc.stop(kickTime + 0.15);
    }

    time += chordDuration;
    chordIdx++;
  }
}

/**
 * 2. Calm Lo-Fi Piano
 */
function renderCalmLofi(ctx: OfflineAudioContext, duration: number) {
  const chordProg = [
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
    [220.0, 261.63, 329.63, 392.0], // Am7
    [146.83, 220.0, 261.63, 349.23], // Dm7
    [196.0, 246.94, 293.66, 349.23], // G7
  ];

  let time = 0;
  let idx = 0;
  const chordLen = 3.2;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.3, 0);
  master.connect(ctx.destination);

  while (time < duration) {
    const notes = chordProg[idx % chordProg.length];

    notes.forEach((freq, noteIdx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Slightly staggered piano chord strum
      const noteStart = time + noteIdx * 0.04;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.08, noteStart + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.005, noteStart + chordLen - 0.2);
      gain.gain.linearRampToValueAtTime(0, noteStart + chordLen);

      osc.connect(gain);
      gain.connect(master);

      osc.start(noteStart);
      osc.stop(noteStart + chordLen);
    });

    time += chordLen;
    idx++;
  }
}

/**
 * 3. Inspiring Energy (Investor pitch & startup growth)
 */
function renderInspiringEnergy(ctx: OfflineAudioContext, duration: number) {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.3, 0);
  master.connect(ctx.destination);

  const bassNotes = [130.81, 146.83, 164.81, 174.61]; // C, D, E, F
  let time = 0;
  let step = 0;

  while (time < duration) {
    const freq = bassNotes[step % bassNotes.length];
    const len = 2.5;

    // Warm bass pad
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.02, time);
    gain.gain.linearRampToValueAtTime(0.07, time + 0.5);
    gain.gain.linearRampToValueAtTime(0.01, time + len);

    osc.connect(gain);
    gain.connect(master);
    osc.start(time);
    osc.stop(time + len);

    // Shimmering octave fifth
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 3, time);

    gain2.gain.setValueAtTime(0.005, time);
    gain2.gain.linearRampToValueAtTime(0.03, time + 1.0);
    gain2.gain.linearRampToValueAtTime(0, time + len);

    osc2.connect(gain2);
    gain2.connect(master);
    osc2.start(time);
    osc2.stop(time + len);

    time += len;
    step++;
  }
}

/**
 * 4. Workspace & Coworking Ambience
 */
function renderWorkspaceAmbience(ctx: OfflineAudioContext, duration: number) {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.2, 0);
  master.connect(ctx.destination);

  // Soft warm room tone filter
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(80, 0);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(140, 0);
  filter.Q.setValueAtTime(1.5, 0);

  gain.gain.setValueAtTime(0.04, 0);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  osc.start(0);
  osc.stop(duration);
}

/**
 * Mixes voice WAV blob with selected background track into a final audio Blob (WAV)
 */
export async function mixVoiceWithBackground(
  voiceBlob: Blob,
  trackId: string,
  bgVolume: number = 0.18,
  customBgBlob?: Blob
): Promise<{ mixedBlob: Blob; duration: number }> {
  // If no background chosen, return original voice blob
  if (trackId === 'none' && !customBgBlob) {
    return { mixedBlob: voiceBlob, duration: 0 };
  }

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  try {
    const voiceArrayBuffer = await voiceBlob.arrayBuffer();
    const voiceBuffer = await audioCtx.decodeAudioData(voiceArrayBuffer);
    const duration = voiceBuffer.duration + 0.6; // slight tail
    const sampleRate = voiceBuffer.sampleRate;

    let bgBuffer: AudioBuffer | null = null;
    if (customBgBlob) {
      const bgArrayBuffer = await customBgBlob.arrayBuffer();
      bgBuffer = await audioCtx.decodeAudioData(bgArrayBuffer);
    } else {
      bgBuffer = await generateProceduralBackgroundTrack(trackId, duration, sampleRate);
    }

    // Render mix in OfflineAudioContext
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);

    // 1. Voice Source (Front and center, 100% volume)
    const voiceSource = offlineCtx.createBufferSource();
    voiceSource.buffer = voiceBuffer;
    const voiceGain = offlineCtx.createGain();
    voiceGain.gain.setValueAtTime(1.0, 0);
    voiceSource.connect(voiceGain);
    voiceGain.connect(offlineCtx.destination);
    voiceSource.start(0);

    // 2. Background Source (Balanced, ducked under speech)
    if (bgBuffer) {
      const bgSource = offlineCtx.createBufferSource();
      bgSource.buffer = bgBuffer;
      bgSource.loop = true;

      const bgGain = offlineCtx.createGain();
      // Smooth fade-in and fade-out
      bgGain.gain.setValueAtTime(0, 0);
      bgGain.gain.linearRampToValueAtTime(bgVolume, 0.4);
      bgGain.gain.setValueAtTime(bgVolume, Math.max(0.5, duration - 0.7));
      bgGain.gain.linearRampToValueAtTime(0, duration);

      bgSource.connect(bgGain);
      bgGain.connect(offlineCtx.destination);
      bgSource.start(0);
      bgSource.stop(duration);
    }

    const mixedAudioBuffer = await offlineCtx.startRendering();
    const mixedWavBlob = audioBufferToWav(mixedAudioBuffer);

    return { mixedBlob: mixedWavBlob, duration };
  } finally {
    if (audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
  }
}

/**
 * Converts an AudioBuffer to standard WAV Blob with 44-byte RIFF header
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let samples: Float32Array;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    samples = new Float32Array(left.length + right.length);
    for (let i = 0; i < left.length; i++) {
      samples[i * 2] = left[i];
      samples[i * 2 + 1] = right[i];
    }
  } else {
    samples = buffer.getChannelData(0);
  }

  const dataLength = samples.length * (bitDepth / 8);
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, 'WAVE');

  // fmt sub-chunk
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);

  // data sub-chunk
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
