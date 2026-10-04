import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { shareStore, type SharedItem, type SharedReview } from './shareStore.js';

dotenv.config();

const app = express();

// Initialize GoogleGenAI client with telemetry user-agent as per guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Vercel serverless functions cap request bodies at ~4.5MB; keep a generous local limit.
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

/**
 * Ensures TTS audio is a playable WAV. Unary Gemini TTS normally returns WAV,
 * but if the model returns headerless PCM (audio/L16 / audio/pcm), wrap it in a RIFF header.
 */
function ensureWavBase64(base64: string, mimeType?: string): string {
  const buf = Buffer.from(base64, 'base64');
  if (buf.length >= 4 && buf.toString('ascii', 0, 4) === 'RIFF') return base64;

  const mt = (mimeType || '').toLowerCase();
  const rateMatch = mt.match(/rate=(\d+)/);
  const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
  const channels = 1;
  const bitDepth = 16;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + buf.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE((sampleRate * channels * bitDepth) / 8, 28);
  header.writeUInt16LE((channels * bitDepth) / 8, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(buf.length, 40);

  return Buffer.concat([header, buf]).toString('base64');
}

// Health / Status endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    transcribeModel: 'gemini-3.5-transcribe',
    ttsModel: 'gemini-3.8-flash-lite-tts',
  });
});

/**
 * Transcribe Audio using model gemini-3.5-transcribe
 * Accepts base64 encoded audio with mimeType
 */
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioData, mimeType, prompt, language } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required', success: false });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
        success: false,
      });
    }

    // Clean and normalize base64 audio data
    const rawBase64 = audioData.includes(',') ? audioData.split(',')[1] : audioData;

    // Clean and normalize MIME type for Gemini audio compatibility
    let cleanMimeType = mimeType ? mimeType.split(';')[0].trim().toLowerCase() : 'audio/webm';
    if (cleanMimeType.includes('wav')) {
      cleanMimeType = 'audio/wav';
    } else if (cleanMimeType.includes('mp3') || cleanMimeType.includes('mpeg')) {
      cleanMimeType = 'audio/mp3';
    } else if (cleanMimeType.includes('ogg')) {
      cleanMimeType = 'audio/ogg';
    } else if (cleanMimeType.includes('mp4') || cleanMimeType.includes('m4a')) {
      cleanMimeType = 'audio/mp4';
    } else if (!cleanMimeType.startsWith('audio/')) {
      cleanMimeType = 'audio/webm';
    }

    const audioPart = {
      inlineData: {
        mimeType: cleanMimeType,
        data: rawBase64,
      },
    };

    const instructionPrompt =
      prompt ||
      `You are an expert audio transcription system.
Please transcribe the provided audio accurately word-for-word.
If the speaker is speaking Egyptian Arabic (العامية المصرية), transcribe it faithfully in natural colloquial Egyptian spelling (such as ده، كدة، علشان، إيه، إزاي، إلخ), capturing every nuance, phrase, and emotion.
If speaking Modern Standard Arabic (الفصحى) or English or code-switching between Arabic and English, transcribe exactly as spoken.
Format your output cleanly with proper punctuation and natural paragraph breaks. Do NOT add meta commentary or conversational preambles (do NOT write "Here is the transcription:" or similar); return only the exact transcription.`;

    let transcribedText = '';
    let modelUsed = 'gemini-3.5-transcribe';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            audioPart,
            {
              text: instructionPrompt,
            },
          ],
        },
      });

      transcribedText = response.text || '';
    } catch (primaryErr: any) {
      console.warn('Primary gemini-3.5-transcribe error, falling back to gemini-3.8-flash:', primaryErr?.message);
      modelUsed = 'gemini-3.8-flash';
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            audioPart,
            {
              text: instructionPrompt,
            },
          ],
        },
      });

      transcribedText = fallbackResponse.text || '';
    }

    // Clean any accidental markdown code fences or preambles
    let cleanedText = transcribedText
      .replace(/^```[a-z]*\n?/i, '')
      .replace(/\n?```$/i, '')
      .replace(/^(هذا هو النص المفرغ|النص المفرغ|Transcription):\s*/i, '')
      .trim();

    const words = cleanedText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    return res.json({
      text: cleanedText,
      modelUsed,
      wordCount,
      estimatedDurationSec: Math.ceil(wordCount / 2.3),
      success: true,
    });
  } catch (error: any) {
    console.error('Error in /api/transcribe:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to transcribe audio with gemini-3.5-transcribe',
      success: false,
    });
  }
});

/**
 * Generate Egyptian Entrepreneur Voiceover / Speech
 * Generates natural audio using Gemini TTS
 */
app.post('/api/generate-speech', async (req, res) => {
  try {
    const { text, voice, style, speed, dialect } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required', success: false });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
        success: false,
      });
    }

    // Default persona based on dialect
    const defaultPersona =
      dialect === 'msa'
        ? 'Speak in clear, fluent Modern Standard Arabic (العربية الفصحى المعاصرة). Male voice. Age around 28–38. Confident, calm, modern visionary tech entrepreneur tone. Sound like a successful Arab startup founder presenting an innovative tech solution to entrepreneurs and investors across the Gulf and MENA region. Do not sound like an ancient historical drama or stiff news anchor. Maintain natural conversational rhythm, eloquence, and authentic business charisma.'
        : 'Speak in natural Egyptian Arabic. Male voice. Age around 28–38. Confident, calm, modern business tone. Sound like a real Egyptian entrepreneur explaining a useful solution. Do not sound like a news presenter. Do not use formal Modern Standard Arabic pronunciation. Do not sound overly dramatic or like a traditional TV commercial. Use natural Egyptian rhythm and conversational pacing. Keep the delivery energetic enough for a social media advertisement, but still natural and trustworthy.';

    const personaStyle = style || defaultPersona;

    const selectedVoice = voice || 'Fenrir'; // Male voices: Fenrir, Puck, Charon

    // Try gemini-3.8-flash-lite-tts first, fallback to gemini-3.8-flash-tts if needed
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.trim(),
                speechMetadata: {
                  style: personaStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const inline1 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const audioBase64 = inline1?.data;

      if (!audioBase64) {
        throw new Error('No audio returned from primary TTS model');
      }

      return res.json({
        audioData: ensureWavBase64(audioBase64, inline1?.mimeType),
        mimeType: 'audio/wav',
        modelUsed: 'gemini-3.8-flash-lite-tts',
        voiceUsed: selectedVoice,
        success: true,
      });
    } catch (ttsErr: any) {
      console.warn('Fallback to gemini-3.8-flash-tts:', ttsErr?.message);
      // Secondary attempt with gemini-3.8-flash-tts
      const response2 = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.trim(),
                speechMetadata: {
                  style: personaStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const inline2 = response2.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const audioBase64_2 = inline2?.data;

      if (!audioBase64_2) {
        throw new Error('No audio returned from speech synthesis');
      }

      return res.json({
        audioData: ensureWavBase64(audioBase64_2, inline2?.mimeType),
        mimeType: 'audio/wav',
        modelUsed: 'gemini-3.8-flash-tts',
        voiceUsed: selectedVoice,
        success: true,
      });
    }
  } catch (error: any) {
    console.error('Error in /api/generate-speech:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate speech',
      success: false,
    });
  }
});

/**
 * Analyze transcription or convert speech into Egyptian social media ad script
 */
app.post('/api/analyze-transcription', async (req, res) => {
  try {
    const { text, targetTone } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required', success: false });
    }

    const prompt = `You are a creative Egyptian marketing director and executive speech coach.
Analyze the following transcribed text:
"""
${text}
"""

Provide a JSON response with:
1. "summary": A concise 2-sentence summary in Arabic.
2. "actionPoints": An array of 3-4 bullet points of core insights or actionable takeaways.
3. "adScript": A re-engineered social media video ad script written in authentic Egyptian Arabic (لهجة مصرية بيزنس عصرية). Tone: Confident, calm, 28-38 year old Egyptian entrepreneur explaining a smart solution.
Incorporate natural hooks and rhythm, and weave in punchy phrases like:
- "مين بيتابع كل ده؟"
- "تعرف."
- "التنبيه بيوصلك على طول."
- "خلّي المعلومة هي اللي توصلك."
- "يعني ببساطة خليك دايماً في الصورة من غير أي مجهود إضافي."
4. "sentiment": A brief assessment of the emotional tone and clarity (e.g., "واثق ومقنع", "حماسي وتطويري").
5. "estimatedDurationSec": Number of seconds this would take to read at natural pace (around 2.5 words per second).`;

    let response: any;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    } catch (err: any) {
      console.warn('Falling back to gemini-2.5-flash due to error/high load:', err?.message);
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    }

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ analysis: parsed, success: true });
  } catch (error: any) {
    console.error('Error in /api/analyze-transcription:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to analyze text',
      success: false,
    });
  }
});

/**
 * Generate tailored Egyptian ad copy from a raw concept or pitch using Gemini 3.8 Flash
 * Supports platform categorization (TikTok, Instagram, Facebook, LinkedIn, YouTube Shorts)
 * and generates platform-specific tone and hashtag suggestions.
 */
app.post('/api/generate-script', async (req, res) => {
  try {
    const { productDescription, targetAudience, keyBenefits, tone, targetDuration, platform, dialect, framework } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
        success: false,
      });
    }

    const selectedPlatform = platform || 'instagram';
    const isMsa = dialect === 'msa';
    const selectedFramework = framework || 'pas';

    const frameworkGuides: Record<string, string> = {
      pas: 'Framework: PAS (Problem, Agitate, Solution). Start with visceral relatable frustration, intensify the friction of doing things manually, then present the solution as the ultimate relief.',
      aida: 'Framework: AIDA (Attention, Interest, Desire, Action). Catch attention in 2 seconds, spark interest with a compelling business reality, build intense desire with effortless workflow, close with crisp CTA.',
      hook_story_offer: 'Framework: Hook-Story-Offer. Irresistible pattern-interrupt hook, miniature authentic founder story, and clear compelling proposition.',
    };

    const platformGuides: Record<string, { label: string; rules: string }> = {
      tiktok: {
        label: 'تيك توك (TikTok)',
        rules:
          'Platform: TikTok. Extreme hook in the first 2 seconds, punchy modern delivery, high urgency, trend-friendly, direct call to action to comment or click link in bio.',
      },
      instagram: {
        label: 'انستجرام ريلز (Instagram Reels)',
        rules:
          'Platform: Instagram Reels. Visual storytelling, modern aesthetic, founder lifestyle, relatable problem, strong CTA encouraging viewers to save the reel or send a DM for the link.',
      },
      facebook: {
        label: 'فيسبوك (Facebook Video)',
        rules:
          'Platform: Facebook Video. Community-oriented, relatable business problem, conversational tone, conversational storytelling, invite shares and comments.',
      },
      linkedin: {
        label: 'لينكد إن (LinkedIn Video)',
        rules:
          'Platform: LinkedIn Video. Founder thought leadership, professional tech startup ecosystem tone across MENA/Gulf, ROI/efficiency focus, executive credibility, invite industry dialogue.',
      },
      youtube_shorts: {
        label: 'يوتيوب شورتس (YouTube Shorts)',
        rules:
          'Platform: YouTube Shorts. High retention, quick educational demo hook, fast pacing, clear problem-to-solution transition, subscribe / link in description CTA.',
      },
    };

    const targetPlatformGuide = platformGuides[selectedPlatform] || platformGuides.instagram;
    const targetFrameworkGuide = frameworkGuides[selectedFramework] || frameworkGuides.pas;

    const durationInstruction =
      targetDuration === '15s'
        ? 'Target length: 15-20 seconds (approx 35-50 words). Fast, punchy hook.'
        : targetDuration === '60s'
        ? 'Target length: 50-60 seconds (approx 120-140 words). Storytelling with deep trust.'
        : 'Target length: 30-40 seconds (approx 70-95 words). Ideal for Reels and TikTok.';

    const toneInstruction =
      tone === 'energetic'
        ? 'Tone: Energetic, quick, bold modern entrepreneur with strong urgency and viral hooks.'
        : tone === 'calm_story'
        ? 'Tone: Calm, storytelling, authentic founder sharing an insightful real-world realization.'
        : 'Tone: Confident, calm, modern business entrepreneur explaining a smart tech solution.';

    const dialectRules = isMsa
      ? `1. Dialect: Modern Standard Arabic (العربية الفصحى المعاصرة). Sound like a dynamic, visionary Arab tech founder speaking naturally and fluently, without archaic theatrical stiffness or newsreader drama.
2. MUST seamlessly weave in these signature anchor lines in MSA:
   - "من يتابع كل هذا؟"
   - "هل تعلم."
   - "التنبيه يصلك على الفور."
   - "دع المعلومة تصل إليك مباشرة."
   - "ببساطة، ابقَ دائماً في الصورة دون أي جهد إضافي."`
      : `1. Dialect: 100% natural Egyptian Arabic (العامية المصرية الريادية). Conversational pacing with authentic Egyptian rhythm.
2. MUST seamlessly weave in these signature anchor lines:
   - "مين بيتابع كل ده؟"
   - "تعرف."
   - "التنبيه بيوصلك على طول."
   - "خلّي المعلومة هي اللي توصلك."
   - "يعني ببساطة خليك دايماً في الصورة من غير أي مجهود إضافي."`;

    const prompt = `You are a world-class creative director, copywriter, and commercial director specializing in modern Arab startup and entrepreneur social video advertising.

Target Platform: ${targetPlatformGuide.label}
Platform Nuances: ${targetPlatformGuide.rules}
Copywriting Architecture: ${targetFrameworkGuide}

Project / Product:
${productDescription || 'منصة ذكية لمتابعة الأعمال وتنبيهات فورية لرواد الأعمال'}

Target Audience:
${targetAudience || (isMsa ? 'رواد الأعمال وأصحاب المشاريع والشركات في الخليج والعالم العربي' : 'رواد الأعمال وأصحاب المشاريع في مصر والشرق الأوسط')}

Key Benefits:
${keyBenefits || 'توفير الوقت، راحة البال، وتنبيهات فورية بدون تشتت'}

${durationInstruction}
${toneInstruction}

Essential Rules:
- Persona: Male Arab startup founder/entrepreneur, 28–38 years old. Modern business charisma.
${dialectRules}

Generate a comprehensive, agency-grade commercial package in valid JSON with these exact keys:
{
  "script": "النص الإعلاني الرئيسي المتكامل، صافٍ وجاهز فوراً للإلقاء الصوتي في الاستوديو بدون أي توجيهات إخراجية أو أقواس",
  "hook": "الخطاف الافتتاحي القوي في أول ثانيتين لجذب المشاهدين",
  "alternativeHooks": [
    "خطاف بديل 1: يعتمد على الفضول والمفاجأة",
    "خطاف بديل 2: يعتمد على الأرقام والعائد المباشر",
    "خطاف بديل 3: يعتمد على التحدي المباشر للروتين التقليدي"
  ],
  "variations": [
    {
      "id": "pain_point",
      "name": "زاوية المشكلة والحل (Pain Point)",
      "hook": "الخطاف الخاص بهذه الزاوية",
      "script": "النص الصوتي الكامل لهذه الزاوية (جاهز للإلقاء الصوتي)",
      "targetPacing": "1.0x متوازن",
      "angleDesc": "تركيز على الصداع اليومي وضياع الوقت والحل الفوري"
    },
    {
      "id": "roi_speed",
      "name": "زاوية الكفاءة ونمو الأعمال (ROI & Growth)",
      "hook": "الخطاف الخاص بهذه الزاوية",
      "script": "النص الصوتي الكامل لهذه الزاوية (جاهز للإلقاء الصوتي)",
      "targetPacing": "1.15x إعلاني سريع",
      "angleDesc": "تركيز على مضاعفة الإنتاجية وتوفير التكاليف وتسريع النمو"
    },
    {
      "id": "founder_story",
      "name": "زاوية قصة المؤسس والابتكار (Founder Story)",
      "hook": "الخطاف الخاص بهذه الزاوية",
      "script": "النص الصوتي الكامل لهذه الزاوية (جاهز للإلقاء الصوتي)",
      "targetPacing": "0.85x رصين وهادئ",
      "angleDesc": "حكاية ملهمة واقعية ومشاركة تجربة بيزنس حقيقية"
    }
  ],
  "storyboard": [
    {
      "timestamp": "00:00 - 00:03",
      "scene": "الخطاف الافتتاحي",
      "visualCue": "وصف المشهد المرئي للكاميرا بدقة",
      "voiceLine": "جملة التعليق الصوتي في هذا المشهد",
      "soundEffect": "المؤثر الصوتي المقترح (SFX)"
    },
    {
      "timestamp": "00:03 - 00:15",
      "scene": "تفاقم المشكلة والواقع",
      "visualCue": "وصف المشهد المرئي للكاميرا بدقة",
      "voiceLine": "جملة التعليق الصوتي في هذا المشهد",
      "soundEffect": "المؤثر الصوتي المقترح (SFX)"
    },
    {
      "timestamp": "00:15 - 00:25",
      "scene": "الحل والتحول الذكي",
      "visualCue": "وصف المشهد المرئي للكاميرا بدقة",
      "voiceLine": "جملة التعليق الصوتي في هذا المشهد",
      "soundEffect": "المؤثر الصوتي المقترح (SFX)"
    },
    {
      "timestamp": "00:25 - 00:30",
      "scene": "الدعوة لاتخاذ الإجراء (CTA)",
      "visualCue": "وصف المشهد المرئي للكاميرا بدقة",
      "voiceLine": "جملة التعليق الصوتي في هذا المشهد",
      "soundEffect": "المؤثر الصوتي المقترح (SFX)"
    }
  ],
  "hashtags": ["#هاشتاج1", "#هاشتاج2", "#هاشتاج3", "#هاشتاج4", "#هاشتاج5"],
  "callToAction": "الدعوة لاتخاذ الإجراء المناسبة للمنصة المحددة",
  "platformAdvice": "نصيحة تسويقية وإخراجية محددة للمنصة",
  "directorTips": "نصيحة إخراجية للمؤسس أثناء تصوير وتسجيل الإعلان"
}`;

    let response: any;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    } catch (err: any) {
      console.warn('Falling back to gemini-2.5-flash due to error/high load:', err?.message);
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    }

    let scriptText = '';
    let hook = '';
    let alternativeHooks: string[] = [];
    let variations: any[] = [];
    let storyboard: any[] = [];
    let hashtags: string[] = [];
    let callToAction = '';
    let platformAdvice = '';
    let directorTips = '';

    try {
      const parsed = JSON.parse(response.text || '{}');
      scriptText = parsed.script || '';
      hook = parsed.hook || '';
      alternativeHooks = Array.isArray(parsed.alternativeHooks) ? parsed.alternativeHooks : [];
      variations = Array.isArray(parsed.variations) ? parsed.variations : [];
      storyboard = Array.isArray(parsed.storyboard) ? parsed.storyboard : [];
      hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];
      callToAction = parsed.callToAction || '';
      platformAdvice = parsed.platformAdvice || '';
      directorTips = parsed.directorTips || '';
    } catch (parseErr) {
      scriptText = response.text?.trim() || '';
      hashtags = ['#ريلز_بيزنس', '#رواد_اعمال_مصر', '#تسويق_رقمي', '#startups_egypt'];
    }

    // Default hashtags if empty
    if (!hashtags || hashtags.length === 0) {
      const defaultTagMap: Record<string, string[]> = {
        tiktok: ['#تيك_توك_بزنس', '#رواد_أعمال_مصر', '#مشاريع_مصر', '#foryou_egypt', '#بيزنس_تيك_توك'],
        instagram: ['#ريلز_بيزنس', '#انستجرام_مصر', '#رواد_الأعمال', '#startup_egypt', '#تسويق_رقمي'],
        facebook: ['#بيزنس_مصر', '#أصحاب_المشاريع', '#تجارة_إلكترونية', '#خدمات_الشركات', '#نجاح_البيزنس'],
        linkedin: ['#LinkedInEgypt', '#StartupMENA', '#Entrepreneurship', '#CairoTech', '#ادارة_الأعمال'],
        youtube_shorts: ['#شورتس_بيزنس', '#رواد_اعمال', '#نصائح_بيزنس', '#YouTubeShortsEgypt', '#افكار_مشاريع'],
      };
      hashtags = defaultTagMap[selectedPlatform] || defaultTagMap.instagram;
    }

    const words = scriptText.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    return res.json({
      script: scriptText,
      hook,
      alternativeHooks,
      variations,
      storyboard,
      platform: selectedPlatform,
      framework: selectedFramework,
      hashtags,
      callToAction,
      platformAdvice,
      directorTips,
      modelUsed: 'gemini-3.8-flash',
      wordCount,
      estimatedDurationSec: Math.round(wordCount / 2.3),
      success: true,
    });
  } catch (error: any) {
    console.error('Error in /api/generate-script:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate script with Gemini',
      success: false,
    });
  }
});

// ============================================================================
// Team Collaboration & Unique Shareable Links API
// ============================================================================



// Keep shared audio under ~3MB of base64 so it fits Vercel's 4.5MB body limit and Redis value limits
const MAX_SHARED_AUDIO_BASE64 = 3 * 1024 * 1024;

/**
 * Create a new share link
 */
app.post('/api/share', async (req, res) => {
  try {
    const {
      title,
      script,
      audioData,
      audioMime,
      voice,
      platform,
      dialect,
      targetAudience,
      hashtags,
      callToAction,
      authorName,
    } = req.body;

    if (!script && !audioData) {
      return res.status(400).json({ error: 'Script or audio is required', success: false });
    }

    if (audioData && typeof audioData === 'string' && audioData.length > MAX_SHARED_AUDIO_BASE64) {
      return res.status(413).json({
        error: 'الملف الصوتي كبير جداً للمشاركة (الحد الأقصى ~2MB). جرّب مقطعاً أقصر.',
        success: false,
      });
    }

    const shareId = `sh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const newItem: SharedItem = {
      id: shareId,
      type: audioData ? 'audio' : 'script',
      title: title || 'سكريبت إعلاني ريادي مصري',
      script: script || '',
      audioData: audioData || undefined,
      audioMime: audioMime || 'audio/wav',
      voice: voice || 'Fenrir',
      platform: platform || 'tiktok',
      dialect: dialect || 'egyptian',
      targetAudience: targetAudience || '',
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      callToAction: callToAction || '',
      authorName: authorName || 'مستخدم نَبْرة',
      createdAt: Date.now(),
      reviews: [],
    };

    await shareStore.set(newItem);

    return res.json({
      success: true,
      shareId,
      item: newItem,
      persistent: shareStore.persistent,
    });
  } catch (error: any) {
    console.error('Error in POST /api/share:', error);
    return res.status(500).json({ error: error?.message || 'Failed to create share link', success: false });
  }
});

/**
 * Retrieve shared item by ID
 */
app.get('/api/share/:id', async (req, res) => {
  try {
    const item = await shareStore.get(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'الرابط غير موجود أو منتهي الصلاحية', success: false });
    }
    return res.json({ success: true, item });
  } catch (error: any) {
    console.error('Error in GET /api/share/:id:', error);
    return res.status(500).json({ error: error?.message || 'Failed to load share', success: false });
  }
});

/**
 * Add team review / comment to a shared item
 */
app.post('/api/share/:id/review', async (req, res) => {
  try {
    const item = await shareStore.get(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'الرابط غير موجود', success: false });
    }

    const { authorName, comment, status = 'comment' } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment is required', success: false });
    }

    const newReview: SharedReview = {
      id: `rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      authorName: String(authorName || '').trim().slice(0, 80) || 'عضو الفريق',
      comment: String(comment).trim().slice(0, 2000),
      status: status === 'approved' || status === 'needs_changes' ? status : 'comment',
      createdAt: Date.now(),
    };

    item.reviews = [newReview, ...(item.reviews || [])].slice(0, 200);
    await shareStore.set(item);
    return res.json({ success: true, reviews: item.reviews });
  } catch (error: any) {
    console.error('Error in POST /api/share/:id/review:', error);
    return res.status(500).json({ error: error?.message || 'Failed to add review', success: false });
  }
});

export default app;
