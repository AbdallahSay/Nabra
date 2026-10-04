import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Flame,
  Volume2,
  ArrowRight,
  Lightbulb,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  Star,
  Trash2,
  Edit3,
  Search,
  Download,
  Clock,
  Plus,
  Share2,
  Play,
  Pause,
  RotateCcw,
  VolumeX,
  Radio,
  Music,
  Hash,
  Layers,
  Film,
  Camera,
  Wand2,
  Target,
  LayoutTemplate,
  Package,
  Briefcase,
  Calendar,
} from 'lucide-react';
import {
  base64ToBlob,
  blobToBase64,
  downloadBlob,
  downloadFile,
  formatDuration,
  wavToMp3Blob,
} from '../utils/audioUtils';
import { ShareModal } from './ShareModal';

interface AdScriptGeneratorProps {
  onLoadScriptToStudio: (script: string) => void;
  onOpenShareReviewModal?: (shareId: string) => void;
}

export type SocialPlatform = 'tiktok' | 'instagram' | 'facebook' | 'linkedin' | 'youtube_shorts';

export interface AdScriptTemplate {
  id: string;
  category: 'product_launch' | 'service_promo' | 'event_invite';
  categoryName: string;
  badge: string;
  badgeBg: string;
  title: string;
  targetPlatform: SocialPlatform;
  recommendedDuration: '15s' | '30s' | '60s';
  recommendedTone: 'confident' | 'energetic' | 'calm_story';
  framework: 'pas' | 'aida' | 'hook_story_offer';
  productDesc: string;
  targetAudience: string;
  script: string;
  callToAction: string;
  hashtags: string[];
}

export interface ScriptVariation {
  id: string;
  name: string;
  hook: string;
  script: string;
  targetPacing: string;
  angleDesc: string;
}

export interface StoryboardScene {
  timestamp: string;
  scene: string;
  visualCue: string;
  voiceLine: string;
  soundEffect: string;
}

export interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  badge: string;
  iconBg: string;
  color: string;
  description: string;
  recommendedDuration: '15s' | '30s' | '60s';
  recommendedTone: 'confident' | 'energetic' | 'calm_story';
  tip: string;
}

export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'tiktok',
    name: 'تيك توك',
    badge: 'TikTok 🎵',
    iconBg: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    color: 'border-pink-500/40 text-pink-300 bg-pink-500/10',
    description: 'إيقاع إعلاني سريع مع Hook خاطف في أول ثانيتين ولغة بيزنس شبابية عصرية',
    recommendedDuration: '15s',
    recommendedTone: 'energetic',
    tip: '💡 سر تيك توك: ادخل في المشكلة فوراً بدون أي مقدمات لضمان عدم تجاوز الفيديو.',
  },
  {
    id: 'instagram',
    name: 'انستجرام ريلز',
    badge: 'Instagram 📸',
    color: 'border-purple-500/40 text-purple-300 bg-purple-500/10',
    iconBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    description: 'قصة بصرية عصرية تركز على راحة البال وحفظ المقطع وإرساله في الرسائل',
    recommendedDuration: '30s',
    recommendedTone: 'confident',
    tip: '💡 سر انستجرام: شجع المتابع على حفظ الريلز (Save) وإرساله لشريكه لزيادة الانتشار.',
  },
  {
    id: 'facebook',
    name: 'فيسبوك',
    badge: 'Facebook 📘',
    color: 'border-blue-500/40 text-blue-300 bg-blue-500/10',
    iconBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    description: 'حل بيزنس مجتمعي مباشر يفتح باب النقاش والتعليقات والطلب المباشر للخدمة',
    recommendedDuration: '30s',
    recommendedTone: 'confident',
    tip: '💡 سر فيسبوك: خاطب التحدي اليومي لمدير المشروع وادعه لمشاركة تجربته بالتعليقات.',
  },
  {
    id: 'linkedin',
    name: 'لينكد إن',
    badge: 'LinkedIn 💼',
    color: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
    iconBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    description: 'نبرة مؤسس ريادي موثوق يشارك فكرة حل استراتيجي وعائد استثماري ملموس',
    recommendedDuration: '60s',
    recommendedTone: 'calm_story',
    tip: '💡 سر لينكد إن: ركز على العائد الاستثماري وحلول توفير وقت الفريق وتطوير الكفاءة.',
  },
  {
    id: 'youtube_shorts',
    name: 'يوتيوب شورتس',
    badge: 'Shorts ▶️',
    color: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
    iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    description: 'مقطع سريع عالي الاحتفاظ يقدم معلومة مركزة وحلاً ذكياً متتابعاً',
    recommendedDuration: '30s',
    recommendedTone: 'energetic',
    tip: '💡 سر شورتس: الانتقال السريع بين المشكلة والحل يحافظ على نسبة إكمال المشاهدة 100%.',
  },
];

export interface SavedAdScript {
  id: string;
  title: string;
  script: string;
  productDesc?: string;
  targetAudience?: string;
  platform?: SocialPlatform;
  hashtags?: string[];
  callToAction?: string;
  savedAt: number;
  tags?: string[];
  isFavorite?: boolean;
}

const STORAGE_KEY = 'nabra_saved_ad_scripts_v1';

const INITIAL_SAVED_SCRIPTS: SavedAdScript[] = [
  {
    id: 'sample-1',
    title: 'تطبيق متابعة الإشعارات والبيزنس',
    script:
      'كل يوم بنفتح عشرين تاب وعشر برامج عشان نتابع شغلنا. بس السؤال الحقيقي: مين بيتابع كل ده؟ تعرف، لما التنبيه بيوصلك على طول أول بأول، شغلك بيمشي أسرع بكتير. خلّي المعلومة هي اللي توصلك لحد عندك، يعني ببساطة خليك دايماً في الصورة من غير أي مجهود إضافي.',
    productDesc: 'منصة ذكية تجمع رسائل العملاء، تنبيهات المبيعات، ومشاكل السيرفرات في مكان واحد مع إشعار فوري.',
    targetAudience: 'أصحاب الشركات الناشئة ورواد الأعمال',
    savedAt: Date.now() - 3600000 * 24,
    tags: ['ريلز', 'سوشيال ميديا', 'بيزنس'],
    isFavorite: true,
  },
  {
    id: 'sample-2',
    title: 'شات بوت ذكاء اصطناعي لواتساب',
    script:
      'العميل بيبعت استفسار، وبياخد الرد بعد ساعتين؟ في البيزنس، الثانية بتفرق. مين بيتابع كل ده؟ تعرف، التنبيه بيوصلك على طول أول ما العميل يكون جاهز للشراء. خلّي المعلومة هي اللي توصلك واقفل الديل في دقيقته، يعني ببساطة خليك دايماً في الصورة من غير أي مجهود إضافي.',
    productDesc: 'أداة ذكاء اصطناعي لخدمة العملاء على واتساب ترد بسرعة البرق وتحول العميل الجاهز للمبيعات.',
    targetAudience: 'المتاجر الإلكترونية والشركات الخدمية',
    savedAt: Date.now() - 3600000 * 12,
    tags: ['واتساب', 'مبيعات', 'Startups'],
    isFavorite: true,
  },
];

const SAMPLE_IDEAS = [
  {
    title: 'تطبيق متابعة الإشعارات وتنبيهات البيزنس',
    desc: 'منصة ذكية تجمع رسائل العملاء، تنبيهات المبيعات، ومشاكل السيرفرات في مكان واحد مع إشعار فوري على الموبايل.',
    target: 'أصحاب الشركات الناشئة، مديري المبيعات، والتجارة الإلكترونية',
  },
  {
    title: 'منصة إدارة المخزون والموردين',
    desc: 'سيستم سحابي يتابع نواقص البضاعة ويبعت تنبيه قبل ما المنتج يخلص من المخزن بدون متابعة يدوية.',
    target: 'تجار التجزئة، أصحاب البراندات والمتاجر الإلكترونية في مصر',
  },
  {
    title: 'أداة ذكاء اصطناعي لخدمة العملاء على واتساب',
    desc: 'شات بوت بيرد بسرعة البرق باللهجة المصرية، وبيحوّل العميل الجاهز لفريق المبيعات بتنبيه مباشر.',
    target: 'الشركات والعيادات وشركات العقارات والخدمات',
  },
];

export const READY_TEMPLATES: AdScriptTemplate[] = [
  {
    id: 'tpl-product-1',
    category: 'product_launch',
    categoryName: 'إطلاق منتج جديد',
    badge: '🚀 تطبيق / SaaS',
    badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    title: 'إطلاق منصة ذكية لرواد الأعمال والمبيعات',
    targetPlatform: 'instagram',
    recommendedDuration: '30s',
    recommendedTone: 'energetic',
    framework: 'pas',
    productDesc: 'منصة ذكية لمتابعة مبيعات الشركة والأنشطة والعملاء في مكان واحد مع تنبيهات فورية بدون تشتت.',
    targetAudience: 'أصحاب الشركات الناشئة، المتاجر الإلكترونية، ورواد الأعمال',
    script:
      'كل يوم بنفتح عشرين تاب وعشر برامج عشان نتابع شغلنا ومبيعاتنا. بس السؤال الحقيقي: مين بيتابع كل ده؟ تعرف، لما التنبيه بيوصلك على طول أول بأول، شغلك بيمشي أسرع بكتير وبدون أي توتر. من النهارده، خلّي المعلومة هي اللي توصلك لحد عندك، يعني ببساطة خليك دايماً في الصورة من غير أي مجهود إضافي. احجز نسختك التجريبية المجانية دلوقتي من اللينك في البايو!',
    callToAction: 'احجز نسختك التجريبية المجانية الآن من الرابط في البايو!',
    hashtags: ['#منتج_جديد', '#ريلز_بيزنس', '#تطبيقات_ذكية', '#رواد_الأعمال', '#startups_egypt'],
  },
  {
    id: 'tpl-product-2',
    category: 'product_launch',
    categoryName: 'إطلاق منتج جديد',
    badge: '📦 منتج ملموس / تجارة',
    badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    title: 'إطلاق منتج مكتبي ذكي لزيادة الإنتاجية والتركيز',
    targetPlatform: 'tiktok',
    recommendedDuration: '30s',
    recommendedTone: 'energetic',
    framework: 'pas',
    productDesc: 'منظم مكتب ذكي مع شاحن لاسلكي سريع وساعة بومودورو للعمل بتركيز عالي.',
    targetAudience: 'المبرمجون، المصممون، ورواد الأعمال الذين يعملون عن بعد',
    script:
      'مكتبك مكركب، كابلات في كل حتة، وتركيزك بيضيع؟ مين بيتابع كل ده وسط زحمة اليوم؟ مع المنظم المكتبي الذكي الجديد، مكتبك هيرجع منظم وشاحنك وجهازك في مكان واحد جاهز. تعرف، هدوء المكان بيخليك تنتج أسرع وتنجز أكتر. يعني ببساطة خليك دايماً في كامل تركيزك من غير أي مجهود إضافي. اطلب دلوقتي واستفيد بخصم الإطلاق 20% والشحن مجاني!',
    callToAction: 'اطلب الآن بخصم الإطلاق 20% مع شحن مجاني لكافة المحافظات!',
    hashtags: ['#منتج_جديد', '#انستجرام_مصر', '#ترتيب_المكتب', '#انتاجية', '#foryou_egypt'],
  },
  {
    id: 'tpl-service-1',
    category: 'service_promo',
    categoryName: 'ترويج خدمة',
    badge: '💼 تسويق وإعلانات B2B',
    badgeBg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    title: 'ترويج خدمات التسويق الرقمي وإدارة الحملات الممولة',
    targetPlatform: 'linkedin',
    recommendedDuration: '30s',
    recommendedTone: 'confident',
    framework: 'aida',
    productDesc: 'خدمات إدارة الحملات الإعلانية الممولة وتحسين العائد الإعلاني للشركات والمتاجر.',
    targetAudience: 'أصحاب المتاجر الإلكترونية ومديرو التسويق والشركات المتوسطة',
    script:
      'بتصرف ميزانيات إعلانية كبيرة لكن العائد مش واضح، وبتسأل نفسك: مين بيتابع كل ده؟ في شركتنا، مش بس بنعمل إعلانات، إحنا بنبني ماكينة مبيعات دقيقة. التنبيه بيوصلك على طول مع كل طلب جديد وعائد استثمارك محسوب بالجنيه. خلّي المعلومة هي اللي توصلك وتفرغ أنت لتطوير البيزنس بتاعك. ابعتلنا رسالة دلوقتي واحصل على تحليل تسويقي مجاني لحملاتك.',
    callToAction: 'أرسل لنا رسالة مباشرة للحصول على تدقيق مجاني لحسابك الإعلاني!',
    hashtags: ['#خدمات_تسويق', '#اعلانات_موقعة', '#B2B_Services', '#LinkedInEgypt', '#مبيعات_رقمية'],
  },
  {
    id: 'tpl-service-2',
    category: 'service_promo',
    categoryName: 'ترويج خدمة',
    badge: '⚖️ استشارات وتأسيس',
    badgeBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    title: 'خدمات الاستشارات وتأسيس الشركات لرواد الأعمال',
    targetPlatform: 'linkedin',
    recommendedDuration: '60s',
    recommendedTone: 'confident',
    framework: 'pas',
    productDesc: 'خدمات قانونية ومحاسبية متكاملة لتأسيس الشركات وتسجيل العلامات التجارية في مصر والخليج.',
    targetAudience: 'مؤسسو الشركات الناشئة ورواد الأعمال والمستثمرون',
    script:
      'تأسيس شركة جديدة محتاج خطوات دقيقة، من التراخيص والسجل التجاري لحد العقود وحصص الشركاء. مين بيتابع كل ده وسط ضغط البدايات؟ في مكتبنا الاستشاري، بنشيل عنك كل الإجراءات القانونية والمحاسبية من الألف للياء. تعرف، لما خطوتك الأولى تكون مبنية صح، شركتك بتنمو بثقة وبدون أي عوائق مستقبلية. التنبيه بيوصلك على طول مع كل خطوة بتخلص في ملفك. احجز جلستك الاستشارية الأولى معانا مجاناً دلوقتي.',
    callToAction: 'تواصل معنا اليوم لحجز جلسة استشارية أولية مجانية لمشروعك!',
    hashtags: ['#تأسيس_شركات', '#استشارات_قانونية', '#رواد_الأعمال', '#StartupMENA', '#استثمار'],
  },
  {
    id: 'tpl-event-1',
    category: 'event_invite',
    categoryName: 'دعوة لحدث',
    badge: '🎟️ ويبينار وورشة عمل',
    badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    title: 'دعوة لويبينار مباشر: مضاعفة المبيعات بالذكاء الاصطناعي',
    targetPlatform: 'tiktok',
    recommendedDuration: '30s',
    recommendedTone: 'energetic',
    framework: 'hook_story_offer',
    productDesc: 'ويبينار أونلاين مجاني يكشف أحدث استراتيجيات مضاعفة المبيعات بالذكاء الاصطناعي لعام 2026.',
    targetAudience: 'المسوقون وأصحاب المشاريع والشركات الناشئة',
    script:
      'لو بتدور إزاي تضاعف مبيعاتك في 2026 بأقل مجهود، الويبينار ده معمول مخصوص علشانك! مين بيتابع كل ده وكل تحديثات السوق السريعة؟ في ساعة واحدة بس، هشارك معاك الاستراتيجية اللي بنستخدمها لمضاعفة أرباحنا بدون حرق ميزانيات. التنبيه بيوصلك على طول أول ما نسجل في الورشة، سجل مكانك المجاني فوراً لأن المقاعد محدودة جداً!',
    callToAction: 'سجل مكانك المجاني الآن من الرابط، المقاعد محدودة لـ 100 شخص فقط!',
    hashtags: ['#ويبينار_مجاني', '#تطوير_البيزنس', '#ورشة_عمل', '#تيك_توك_بزنس', '#تسويق'],
  },
  {
    id: 'tpl-event-2',
    category: 'event_invite',
    categoryName: 'دعوة لحدث',
    badge: '🏢 مؤتمر وقمة سنوية',
    badgeBg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    title: 'دعوة لحضور قمة رواد الأعمال الكبرى (Cairo Summit)',
    targetPlatform: 'facebook',
    recommendedDuration: '60s',
    recommendedTone: 'energetic',
    framework: 'aida',
    productDesc: 'أكبر تجمع لرواد الأعمال والمستثمرين في القاهرة، يضم أكثر من 50 متحدثاً وفرص تشبيك استثنائية.',
    targetAudience: 'رواد الأعمال، المبرمجون، المستثمرون، والشركات الناشئة',
    script:
      'أكبر قمة لرواد الأعمال والشركات الناشئة راجعة السنة دي بمفاجآت أضخم! أكتر من ألف مؤسس ومستثمر تحت سقف واحد في القاهرة. مين بيتابع كل ده وكل الفرص اللي بتفتح قدامك في حدث زي ده؟ يومين كاملين من ورش العمل، والتشبيك مع كبرى الصناديق الاستثمارية. تعرف، صفقة واحدة أو شراكة واحدة من المؤتمر كفيلة تنقل شركتك لمستوى تاني خالص. التذاكر المبكرة متاحة دلوقتي بخصم 30% لفترة محدودة جداً، احجز تذكرتك وشاركنا في الحدث الأكبر لهذا العام!',
    callToAction: 'احجز تذكرتك المبكرة بخصم 30% قبل نفاد المقاعد!',
    hashtags: ['#CairoSummit', '#ريادة_الأعمال', '#مؤتمرات_مصر', '#Startups', '#استثمار'],
  },
];

export const AdScriptGenerator: React.FC<AdScriptGeneratorProps> = ({
  onLoadScriptToStudio,
  onOpenShareReviewModal,
}) => {
  const [activeTab, setActiveTab] = useState<'generator' | 'templates' | 'saved'>('generator');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<'all' | 'product_launch' | 'service_promo' | 'event_invite'>('all');
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>('');
  const [shareModalData, setShareModalData] = useState<{
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
  } | null>(null);

  const [productDesc, setProductDesc] = useState<string>(
    'منصة متابعة وإشعارات ذكية لرواد الأعمال، بتجمع كل أنشطة الشركة والمبيعات وتنبيهات العملاء في مكان واحد بدون تشتت.'
  );
  const [targetAudience, setTargetAudience] = useState<string>(
    'رواد الأعمال وأصحاب المشاريع والشركات في مصر والوطن العربي'
  );
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('tiktok');
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([
    '#تيك_توك_بزنس',
    '#رواد_أعمال_مصر',
    '#مشاريع_مصر',
    '#foryou_egypt',
    '#بيزنس_تيك_توك',
  ]);
  const [generatedCta, setGeneratedCta] = useState<string>('');
  const [platformAdvice, setPlatformAdvice] = useState<string>(
    '💡 سر تيك توك: ادخل في المشكلة فوراً بدون أي مقدمات لضمان عدم تجاوز الفيديو.'
  );
  const [savedPlatformFilter, setSavedPlatformFilter] = useState<'all' | SocialPlatform>('all');
  const [copiedHashtags, setCopiedHashtags] = useState<boolean>(false);

  const [scriptDialect, setScriptDialect] = useState<'egyptian' | 'msa'>('egyptian');
  const [framework, setFramework] = useState<'pas' | 'aida' | 'hook_story_offer'>('pas');
  const [adDuration, setAdDuration] = useState<'15s' | '30s' | '60s'>('15s');
  const [adTone, setAdTone] = useState<'confident' | 'energetic' | 'calm_story'>('energetic');
  const [autoGenerateAudio, setAutoGenerateAudio] = useState<boolean>(false);
  const [isEditingScript, setIsEditingScript] = useState<boolean>(false);
  const [estimatedDurationSec, setEstimatedDurationSec] = useState<number>(20);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [variations, setVariations] = useState<ScriptVariation[]>([]);
  const [activeVariationIndex, setActiveVariationIndex] = useState<number>(0);
  const [storyboard, setStoryboard] = useState<StoryboardScene[]>([]);
  const [alternativeHooks, setAlternativeHooks] = useState<string[]>([]);
  const [directorTips, setDirectorTips] = useState<string>('');
  const [displayMode, setDisplayMode] = useState<'clean_script' | 'storyboard'>('clean_script');
  const [wordCount, setWordCount] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSelectVariation = (idx: number) => {
    setActiveVariationIndex(idx);
    const chosen = variations[idx];
    if (chosen && chosen.script) {
      setGeneratedScript(chosen.script);
      setEstimatedDurationSec(Math.round(chosen.script.split(/\s+/).length / 2.3));
      if (previewAudioRef.current && isPlayingPreview) {
        previewAudioRef.current.pause();
        setIsPlayingPreview(false);
      }
    }
  };

  const handleApplyAlternativeHook = (hookText: string) => {
    const sentences = generatedScript.split(/([.!؟\n]+)/);
    if (sentences.length > 2) {
      const rest = sentences.slice(2).join('');
      setGeneratedScript(`${hookText.trim()} ${rest}`.trim());
    } else {
      setGeneratedScript(`${hookText.trim()} ${generatedScript}`);
    }
  };

  const handleApplyTemplate = (tpl: AdScriptTemplate) => {
    setProductDesc(tpl.productDesc);
    setTargetAudience(tpl.targetAudience);
    setSelectedPlatform(tpl.targetPlatform);
    setAdDuration(tpl.recommendedDuration);
    setAdTone(tpl.recommendedTone);
    setFramework(tpl.framework);
    setGeneratedScript(tpl.script);
    setGeneratedHashtags(tpl.hashtags);
    setGeneratedCta(tpl.callToAction);
    setEstimatedDurationSec(tpl.recommendedDuration === '15s' ? 18 : tpl.recommendedDuration === '60s' ? 55 : 30);
    setWordCount(tpl.script.split(/\s+/).filter(Boolean).length);
    setIsEditingScript(true);
    setActiveTab('generator');
    setSaveSuccessMsg(`تم تفعيل قالب "${tpl.title}" بنجاح! يمكنك الآن تعديله بحرية أو الاستماع والتسجيل.`);
    setTimeout(() => setSaveSuccessMsg(null), 4500);
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const handlePlatformSelect = (platformId: SocialPlatform) => {
    setSelectedPlatform(platformId);
    const cfg = PLATFORMS.find((p) => p.id === platformId);
    if (cfg) {
      setAdDuration(cfg.recommendedDuration);
      setAdTone(cfg.recommendedTone);
      setPlatformAdvice(cfg.tip);
    }
  };

  const handleOpenShareForCurrent = async () => {
    let audioBase64: string | undefined = undefined;
    if (previewBlob) {
      try {
        audioBase64 = await blobToBase64(previewBlob);
      } catch (e) {}
    }
    const firstLine = generatedScript.split('\n')[0].replace(/[".]/g, '').trim();
    const title = firstLine.length > 40 ? firstLine.slice(0, 40) + '...' : firstLine || 'مسودة سكريبت إعلاني مصري';

    setShareModalData({
      title,
      script: generatedScript,
      audioBase64,
      audioMime: 'audio/wav',
      voice: previewVoice,
      platform: selectedPlatform,
      dialect: scriptDialect,
      targetAudience,
      hashtags: generatedHashtags,
      callToAction: generatedCta,
    });
  };

  const handleOpenShareForTemplate = (tpl: AdScriptTemplate) => {
    setShareModalData({
      title: tpl.title,
      script: tpl.script,
      platform: tpl.targetPlatform,
      targetAudience: tpl.targetAudience,
      hashtags: tpl.hashtags,
      callToAction: tpl.callToAction,
    });
  };

  const handleOpenShareForSaved = async (item: SavedAdScript) => {
    let audioBase64: string | undefined = undefined;
    if (item.audioBlob) {
      try {
        audioBase64 = await blobToBase64(item.audioBlob);
      } catch (e) {}
    }
    setShareModalData({
      title: item.title,
      script: item.script,
      audioBase64,
      audioMime: 'audio/wav',
      voice: item.voiceUsed || 'Fenrir',
      platform: item.platform,
      targetAudience: item.targetAudience,
      hashtags: item.hashtags,
      callToAction: item.callToAction,
    });
  };

  // Saved scripts state with localStorage persistence
  const [savedScripts, setSavedScripts] = useState<SavedAdScript[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse saved scripts from localStorage:', e);
    }
    return INITIAL_SAVED_SCRIPTS;
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Audio Preview State
  const [previewVoice, setPreviewVoice] = useState<'Fenrir' | 'Puck' | 'Charon'>('Fenrir');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewScriptText, setPreviewScriptText] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState<number>(0);
  const [previewDuration, setPreviewDuration] = useState<number>(0);
  const [isConvertingMp3, setIsConvertingMp3] = useState<boolean>(false);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedScripts));
    } catch (e) {
      console.warn('Failed to save scripts to localStorage:', e);
    }
  }, [savedScripts]);

  // Audio element event listeners
  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setPreviewCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setPreviewDuration(audio.duration || 0);
    const onEnded = () => {
      setIsPlayingPreview(false);
      setPreviewCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const handleTogglePreview = async (text: string, id: string) => {
    // If currently previewing this text and already generated:
    if (previewingId === id && previewBlob && previewScriptText === text) {
      if (!previewAudioRef.current) return;
      if (isPlayingPreview) {
        previewAudioRef.current.pause();
        setIsPlayingPreview(false);
      } else {
        previewAudioRef.current.play().then(() => setIsPlayingPreview(true)).catch(() => {});
      }
      return;
    }

    // Stop current playing audio
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    }

    setPreviewingId(id);
    setIsLoadingPreview(true);
    setPreviewScriptText(text);

    const personaInstruction =
      scriptDialect === 'msa'
        ? `Speak in clear, professional Modern Standard Arabic (العربية الفصحى المعاصرة). Male voice. Age around 28–38. Confident, modern visionary business entrepreneur tone. Sound like an innovative Arab tech founder explaining a cutting-edge business solution to peers and investors across the Gulf and MENA region. Natural conversational pacing with professional Arabic eloquence.`
        : `Speak in natural Egyptian Arabic. Male voice. Age around 28–38. Confident, calm, modern business tone. Sound like a real Egyptian entrepreneur explaining a useful solution. Do not sound like a news presenter. Do not use formal Modern Standard Arabic pronunciation. Natural Egyptian rhythm and conversational pacing.`;

    try {
      const res = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voice: previewVoice,
          style: personaInstruction,
          dialect: scriptDialect,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل توليد الصوت للمعاينة');
      }

      const blob = base64ToBlob(data.audioData, data.mimeType || 'audio/wav');
      setPreviewBlob(blob);
      const url = URL.createObjectURL(blob);

      if (previewAudioRef.current) {
        previewAudioRef.current.src = url;
        previewAudioRef.current.play().then(() => setIsPlayingPreview(true)).catch(() => {});
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSeekPreview = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setPreviewCurrentTime(val);
    if (previewAudioRef.current) {
      previewAudioRef.current.currentTime = val;
    }
  };

  const handleDownloadPreviewMp3 = async () => {
    if (!previewBlob) return;
    setIsConvertingMp3(true);
    try {
      const mp3Blob = await wavToMp3Blob(previewBlob);
      downloadBlob(mp3Blob, `ad-script-preview-${Date.now()}.mp3`);
    } catch (err) {
      console.error('MP3 preview download error:', err);
      downloadBlob(previewBlob, `ad-script-preview-${Date.now()}.wav`);
    } finally {
      setIsConvertingMp3(false);
    }
  };

  const handleDownloadPreviewWav = () => {
    if (!previewBlob) return;
    downloadBlob(previewBlob, `ad-script-preview-${Date.now()}.wav`);
  };

  const handleGenerate = async (customVariationNote?: string) => {
    if (!productDesc.trim()) return;
    setIsGenerating(true);
    setPreviewBlob(null);
    setPreviewScriptText('');

    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productDescription: productDesc + (customVariationNote ? ` (${customVariationNote})` : ''),
          targetAudience: targetAudience,
          keyBenefits: 'توفير الوقت، راحة البال، وتنبيهات فورية بدون تشتت',
          tone: adTone,
          targetDuration: adDuration,
          platform: selectedPlatform,
          dialect: scriptDialect,
          framework: framework,
        }),
      });

      const data = await res.json();
      if (data.success && data.script) {
        setGeneratedScript(data.script);
        setVariations(data.variations || []);
        setActiveVariationIndex(0);
        setStoryboard(data.storyboard || []);
        setAlternativeHooks(data.alternativeHooks || []);
        setDirectorTips(data.directorTips || '');
        setWordCount(data.wordCount || data.script.split(/\s+/).filter(Boolean).length);

        if (data.hashtags && data.hashtags.length > 0) {
          setGeneratedHashtags(data.hashtags);
        }
        if (data.callToAction) setGeneratedCta(data.callToAction);
        if (data.platformAdvice) setPlatformAdvice(data.platformAdvice);
        setEstimatedDurationSec(data.estimatedDurationSec || 25);
        setIsEditingScript(false);

        // If client chose auto 1-click audio:
        if (autoGenerateAudio) {
          handleTogglePreview(data.script, 'current');
        }
      }
    } catch (err) {
      console.error('Script generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyScriptText = (text: string, id: string = 'current') => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyHashtagsOnly = () => {
    navigator.clipboard.writeText(generatedHashtags.join(' '));
    setCopiedHashtags(true);
    setTimeout(() => setCopiedHashtags(false), 2000);
  };

  const copyScriptWithHashtags = () => {
    const fullText = `${generatedScript}\n\n${generatedCta ? generatedCta + '\n\n' : ''}${generatedHashtags.join(' ')}`;
    navigator.clipboard.writeText(fullText);
    setCopiedId('full_with_tags');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveCurrentScript = () => {
    if (!generatedScript.trim()) return;

    // Check if already saved
    const exists = savedScripts.some((s) => s.script.trim() === generatedScript.trim());
    if (exists) {
      setSaveSuccessMsg('السكريبت محفوظ بالفعل في قائمة المحفوظات!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      return;
    }

    const firstLine = generatedScript.split('\n')[0].replace(/[".]/g, '').trim();
    const title = firstLine.length > 40 ? firstLine.slice(0, 40) + '...' : firstLine || 'سكريبت إعلاني ريادي مصري';
    const platformObj = PLATFORMS.find((p) => p.id === selectedPlatform);

    const newSaved: SavedAdScript = {
      id: Date.now().toString(),
      title: title,
      script: generatedScript.trim(),
      productDesc: productDesc,
      targetAudience: targetAudience,
      platform: selectedPlatform,
      hashtags: generatedHashtags,
      callToAction: generatedCta,
      savedAt: Date.now(),
      tags: [platformObj ? platformObj.name : 'سوشيال ميديا', 'مصري', 'ريلز'],
      isFavorite: true,
    };

    setSavedScripts((prev) => [newSaved, ...prev]);
    setSaveSuccessMsg('تم حفظ السكريبت في المحفوظات بنجاح! ⭐');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleDeleteSaved = (id: string) => {
    setSavedScripts((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleFavorite = (id: string) => {
    setSavedScripts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s))
    );
  };

  const filteredSavedScripts = savedScripts.filter((s) => {
    if (savedPlatformFilter !== 'all' && s.platform !== savedPlatformFilter) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(query) ||
      s.script.toLowerCase().includes(query) ||
      (s.hashtags && s.hashtags.some((h) => h.toLowerCase().includes(query))) ||
      (s.tags && s.tags.some((t) => t.toLowerCase().includes(query)))
    );
  });

  const isCurrentScriptSaved = savedScripts.some(
    (s) => s.script.trim() === generatedScript.trim()
  );

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Hidden audio element for preview */}
      <audio ref={previewAudioRef} preload="auto" className="hidden" />

      {/* Decorative glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
            <Flame className="w-6 h-6" />
          </span>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              مُولّد ومكتبة سكريبتات السوشيال ميديا
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm">
              صياغة فورية لنصوص إعلانية ريادية مقنعة باللهجة المصرية وحفظها للرجوع إليها
            </p>
          </div>
        </div>

        {/* Tab switch buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs">
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'generator'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>صياغة سكريبت جديد</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'templates'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span>نماذج وقوالب جاهزة (Templates)</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'templates' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-amber-400'
              }`}
            >
              {READY_TEMPLATES.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'saved'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>المحفوظات</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'saved' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-amber-400'
              }`}
            >
              {savedScripts.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Script Generator */}
      {activeTab === 'generator' && (
        <div id="generator-main-area">
          {/* Preset Ideas & Quick Templates Launch Bar */}
          <div className="mb-6 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <LayoutTemplate className="w-3.5 h-3.5 text-amber-400" />
                <span>قوالب إعلانية جاهزة للتطبيق والتعديل الفوري (اختر قالباً لتبدأ منه):</span>
              </label>
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>عرض مكتبة القوالب الكاملة ({READY_TEMPLATES.length})</span>
                <ArrowRight className="w-3 h-3 rotate-180" />
              </button>
            </div>

            {/* Quick Template Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {READY_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-right transition-all cursor-pointer flex flex-col justify-between group"
                  title={`تطبيق قالب: ${tpl.title}`}
                >
                  <span className="text-[10px] font-bold text-amber-400 block mb-1 group-hover:text-amber-300 truncate">
                    {tpl.badge}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white line-clamp-2 leading-snug">
                    {tpl.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Social Media Platform Categorization Selector */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 mb-3">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>اختر المنصة المستهدفة (Platform Categorization):</span>
              </label>
              <span className="text-[11px] text-slate-400">
                تعديل نبرة النص ومدة الإعلان واقتراحات الهاشتاجات تلقائياً
              </span>
            </div>

            {/* Platform Grid Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PLATFORMS.map((platform) => {
                const isSelected = selectedPlatform === platform.id;
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => handlePlatformSelect(platform.id)}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-lg shadow-amber-500/20 scale-[1.02]'
                        : 'bg-slate-900/80 hover:bg-slate-850 text-slate-300 border-slate-800 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black">{platform.badge}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                          isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {platform.recommendedDuration}
                      </span>
                    </div>
                    <p
                      className={`text-[10px] line-clamp-2 leading-tight ${
                        isSelected ? 'text-slate-950 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {platform.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Platform Tip Banner */}
            {platformAdvice && (
              <div className="mt-3 p-2.5 rounded-xl bg-slate-900/90 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{platformAdvice}</span>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                وصف المنتج أو الخدمة التي تقدمها:
              </label>
              <textarea
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
                rows={3}
                dir="rtl"
                placeholder="مثال: تطبيق ذكي لتنظيم حجوزات المطاعم ومتابعة الطاولات وتنبيه الويتر فوراً..."
                className="w-full bg-slate-950/70 border border-slate-700 rounded-xl p-3.5 text-white text-sm focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                الجمهور المستهدف:
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                dir="rtl"
                placeholder="مثال: أصحاب الكافيهات، المديرين، رواد الأعمال..."
                className="w-full bg-slate-950/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>

            {/* Language & Dialect Selector */}
            <div className="pt-1">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                لغة ولهجة الإعلان:
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setScriptDialect('egyptian')}
                  className={`py-2 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    scriptDialect === 'egyptian'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🇪🇬 العامية المصرية (ريادي مصري)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScriptDialect('msa')}
                  className={`py-2 px-3 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    scriptDialect === 'msa'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🌐 العربية الفصحى المعاصرة (الخليج والعرب)</span>
                </button>
              </div>
            </div>

            {/* Copywriting Framework Selector */}
            <div className="pt-1">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                <span>الهيكل الإعلاني التسويقي (Copywriting Architecture):</span>
                <span className="text-[10px] text-amber-400 font-normal">هندسة إقناعية مدروسة</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                {[
                  { id: 'pas', label: 'المشكلة ➔ الحل (PAS)', desc: 'الأفضل لآلام ومشاكل العمل' },
                  { id: 'aida', label: 'الانتباه ➔ الرغبة (AIDA)', desc: 'للترويج والتحفيز والحلول' },
                  { id: 'hook_story_offer', label: 'خطاف ➔ قصة ➔ عرض', desc: 'لفيديوهات السوشيال والفيرال' },
                ].map((fw) => (
                  <button
                    key={fw.id}
                    type="button"
                    onClick={() => setFramework(fw.id as any)}
                    className={`p-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                      framework === fw.id
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-[11px]">{fw.label}</div>
                    <div className={`text-[9px] mt-0.5 ${framework === fw.id ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                      {fw.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Gemini Script Settings: Length & Tone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  مدة الإعلان المستهدفة:
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                  {[
                    { id: '15s', label: '15 ثانية (سريع)' },
                    { id: '30s', label: '30 ثانية (ريلز)' },
                    { id: '60s', label: '60 ثانية (قصة)' },
                  ].map((dur) => (
                    <button
                      key={dur.id}
                      type="button"
                      onClick={() => setAdDuration(dur.id as any)}
                      className={`py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        adDuration === dur.id
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  نبرة صياغة Gemini:
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                  {[
                    { id: 'confident', label: 'واثق وهادئ' },
                    { id: 'energetic', label: 'حماسي وسريع' },
                    { id: 'calm_story', label: 'قصة بيزنس' },
                  ].map((tn) => (
                    <button
                      key={tn.id}
                      type="button"
                      onClick={() => setAdTone(tn.id as any)}
                      className={`py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        adTone === tn.id
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 1-Click Auto Pilot Option */}
            <div className="flex items-center gap-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={autoGenerateAudio}
                  onChange={(e) => setAutoGenerateAudio(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
                />
                <span className="font-semibold text-amber-300">
                  ⚡ الوضع التلقائي: توليد الصوت فوراً بمجرد اكتمال السكريبت من Gemini
                </span>
              </label>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={() => handleGenerate()}
            disabled={isGenerating || !productDesc.trim()}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer mb-6"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Google Gemini 3.8 Flash يصيغ السكريبت الإعلاني المصري...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>توليد السكريبت بواسطة Gemini الذكي (Generate with Gemini 3.8)</span>
              </>
            )}
          </button>

          {/* Generated Result Output */}
          {generatedScript && (
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-amber-500/40 space-y-4">
              {/* Header with Title and Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>السكريبت الإعلاني المقترح من Google Gemini 3.8:</span>
                </span>

                <div className="flex items-center gap-2">
                  {/* Share with Team button */}
                  <button
                    type="button"
                    onClick={handleOpenShareForCurrent}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
                    title="توليد رابط مشاركة فريد لمراجعة هذا السكريبت مع الفريق"
                  >
                    <Share2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>مشاركة مع الفريق 🔗</span>
                  </button>

                  {/* Save to library button */}
                  <button
                    onClick={handleSaveCurrentScript}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isCurrentScriptSaved
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {isCurrentScriptSaved ? (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>محفوظ في المحفوظات</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>حفظ في المحفوظات ⭐</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => copyScriptText(generatedScript, 'current')}
                    className="text-xs text-slate-300 hover:text-amber-400 flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700"
                  >
                    {copiedId === 'current' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {saveSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Strategic Angle Variations Tabs */}
              {variations && variations.length > 0 && (
                <div className="space-y-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>الزوايا الإعلانية الاستراتيجية (اختر زاوية الطرح):</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">3 خيارات تسويقية</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {variations.map((v, idx) => {
                      const isSelected = activeVariationIndex === idx;
                      return (
                        <button
                          key={v.id || idx}
                          type="button"
                          onClick={() => handleSelectVariation(idx)}
                          className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                              : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold">{v.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-amber-400">
                              {v.targetPacing}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{v.angleDesc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Alternative Viral Hooks Bar */}
              {alternativeHooks && alternativeHooks.length > 0 && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>خطافات افتتاحية بديلة (اضغط على أي خطاف لتبديل بداية السكريبت فوراً):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {alternativeHooks.map((altHook, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyAlternativeHook(altHook)}
                        className="text-right p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 text-xs text-slate-200 transition-all cursor-pointer flex items-start gap-1.5 group"
                        title="انقر لتطبيق هذا الخطاف في بداية السكريبت"
                      >
                        <span className="text-amber-400 font-bold shrink-0">#{idx + 1}</span>
                        <span className="line-clamp-2 leading-relaxed text-[11px] group-hover:text-amber-200">
                          "{altHook}"
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Display Mode Switcher (Clean Script vs Storyboard) & Meta Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setDisplayMode('clean_script')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      displayMode === 'clean_script'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>النص الصافي للإلقاء (TTS)</span>
                  </button>

                  {storyboard && storyboard.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDisplayMode('storyboard')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        displayMode === 'storyboard'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>اللوحة الإخراجية (Storyboard)</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                  <span>{wordCount || generatedScript.split(/\s+/).filter(Boolean).length} كلمة</span>
                  <span>•</span>
                  <span>المدة التقديرية: <strong className="text-white">~{estimatedDurationSec} ثانية</strong></span>
                </div>
              </div>

              {/* Mode 1: Clean Script View */}
              {displayMode === 'clean_script' && (
                <div>
                  {isEditingScript ? (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-amber-300">
                        تعديل نص السكريبت يدوياً قبل التسجيل الصوتي:
                      </label>
                      <textarea
                        value={generatedScript}
                        onChange={(e) => {
                          setGeneratedScript(e.target.value);
                          setPreviewBlob(null);
                        }}
                        rows={5}
                        dir="rtl"
                        className="w-full bg-slate-900 border border-amber-500/50 rounded-xl p-4 text-white text-base leading-relaxed font-medium focus:outline-none focus:border-amber-400"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsEditingScript(false)}
                          className="px-4 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          حفظ التعديل والاعتماد
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <p className="text-white text-base leading-relaxed font-medium bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                        {generatedScript}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsEditingScript(true)}
                        className="absolute top-2 left-2 text-[11px] text-slate-400 hover:text-amber-300 bg-slate-950/80 px-2 py-1 rounded-md border border-slate-700/80 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>تعديل</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Director Storyboard View */}
              {displayMode === 'storyboard' && storyboard && storyboard.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-2.5">
                    {storyboard.map((scene, sIdx) => (
                      <div
                        key={sIdx}
                        className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all text-right space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold flex items-center justify-center">
                              {sIdx + 1}
                            </span>
                            <span className="text-xs font-bold text-white">{scene.scene}</span>
                          </div>
                          <span className="text-[10px] font-mono text-amber-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                            {scene.timestamp}
                          </span>
                        </div>

                        {/* Visual & Sound Cues */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-850">
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                              <Camera className="w-3 h-3 text-sky-400" />
                              <span className="font-semibold text-sky-300">المشهد المرئي للكاميرا:</span>
                            </div>
                            <p className="text-slate-300 text-[11px] leading-relaxed">{scene.visualCue}</p>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-850">
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                              <Music className="w-3 h-3 text-amber-400" />
                              <span className="font-semibold text-amber-300">المؤثر الصوتي المقترح:</span>
                            </div>
                            <p className="text-slate-300 text-[11px] leading-relaxed">{scene.soundEffect}</p>
                          </div>
                        </div>

                        {/* Voiceover line for this scene */}
                        <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
                          <span className="text-[10px] font-semibold text-amber-400 block mb-0.5">
                            التعليق الصوتي للمشهد:
                          </span>
                          <p className="text-white text-xs leading-relaxed font-medium">"{scene.voiceLine}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Director Tips Box */}
              {directorTips && (
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-emerald-500/20 flex items-start gap-2.5 text-xs">
                  <Camera className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-300 block mb-0.5">نصيحة المخرج للمؤسس:</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{directorTips}</p>
                  </div>
                </div>
              )}

              {/* Automatic Platform & Hashtags Suggestion Box */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                      <Hash className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>اقتراحات الهاشتاجات التلقائية لمنصة</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold">
                        {PLATFORMS.find((p) => p.id === selectedPlatform)?.name || selectedPlatform}
                      </span>
                      :
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copyHashtagsOnly}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-amber-400 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      title="نسخ جميع الهاشتاجات إلى الحافظة"
                    >
                      {copiedHashtags ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">تم نسخ الهاشتاجات!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ الهاشتاجات</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={copyScriptWithHashtags}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-amber-400 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      title="نسخ السكريبت مع الهاشتاجات جاهز للنشر"
                    >
                      {copiedId === 'full_with_tags' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">تم نسخ المنشور بالكامل!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ المنشور بالكامل</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Hashtag Chips Cloud */}
                <div className="flex flex-wrap gap-2 pt-1" dir="ltr">
                  {generatedHashtags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-amber-300 text-xs font-mono font-medium hover:border-amber-400 transition-colors select-all cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Platform Call-To-Action if present */}
                {generatedCta && (
                  <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2 text-xs text-slate-300">
                    <span className="font-bold text-amber-400 shrink-0">الدعوة للتفاعل (CTA):</span>
                    <span className="italic">{generatedCta}</span>
                  </div>
                )}
              </div>

              {/* Client Approval & Audio Action Decision Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-emerald-500/15 border-2 border-amber-500/40 shadow-xl space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <span>هل أعجبك هذا السكريبت وتريد تحويله إلى صوت؟ 🎙️</span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      إذا نال إعجابك، اضغط لتوليده فوراً بصوت رائد الأعمال المصري، أو اطلب نسخة بديلة من Gemini!
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Primary Yes Button: Generate Audio */}
                    <button
                      type="button"
                      onClick={() => handleTogglePreview(generatedScript, 'current')}
                      disabled={isLoadingPreview && previewingId === 'current'}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/30 transition-transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingPreview && previewingId === 'current' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Gemini يُسجّل الصوت الآن...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>نعم عجبني! توليد الصوت الآن 🎙️</span>
                        </>
                      )}
                    </button>

                    {/* Generate Alternative Variation with Gemini */}
                    <button
                      type="button"
                      onClick={() => handleGenerate('صياغة نسخة إعلانية بديلة ومبتكرة بزاوية تسويقية جديدة كلياً')}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      title="اطلب من Gemini إعادة صياغة السكريبت بفكرة تسويقية بديلة"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>صياغة نسخة أخرى بـ Gemini</span>
                    </button>

                    {/* Edit Manually */}
                    <button
                      type="button"
                      onClick={() => setIsEditingScript(!isEditingScript)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                        isEditingScript
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                      title="تعديل أي كلمة بالسكريبت قبل التسجيل"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Audio Preview & Direct Download Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                      <Radio className="w-4 h-4 animate-pulse" />
                    </span>
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                        معاينة صوتية فورية قبل التحميل (Audio Preview)
                        {previewBlob && previewingId === 'current' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                            جاهز للاستماع والتحميل
                          </span>
                        )}
                      </h5>
                      <p className="text-[11px] text-slate-400">
                        استمع للسكريبت بنبرة رائد الأعمال المصري وتأكد من الوقع الإعلاني قبل تحميل الملف
                      </p>
                    </div>
                  </div>

                  {/* Voice Selector */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                    <span className="text-[11px] text-slate-400 px-1">الصوت:</span>
                    {[
                      { id: 'Fenrir', name: 'فينرير (هادئ)' },
                      { id: 'Puck', name: 'باك (نشيط)' },
                      { id: 'Charon', name: 'شارون (رزين)' },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setPreviewVoice(v.id as any);
                          setPreviewBlob(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
                          previewVoice === v.id
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Player Transport Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleTogglePreview(generatedScript, 'current')}
                      disabled={isLoadingPreview && previewingId === 'current'}
                      className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 hover:from-amber-400 hover:to-amber-200 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25 transition-transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                      title={isPlayingPreview ? 'إيقاف مؤقت' : 'استماع للمعاينة'}
                    >
                      {isLoadingPreview && previewingId === 'current' ? (
                        <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : isPlayingPreview && previewingId === 'current' ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </button>

                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>
                          {previewBlob && previewingId === 'current'
                            ? isPlayingPreview
                              ? 'جارٍ تشغيل المعاينة الصوتية...'
                              : 'المعاينة جاهزة للاستماع'
                            : 'اضغط للاستماع الصوتي الفوري'}
                        </span>
                        {isPlayingPreview && previewingId === 'current' && (
                          <span className="flex items-center gap-0.5">
                            <span className="w-1 h-3 bg-amber-400 animate-pulse rounded-full" />
                            <span className="w-1 h-4 bg-amber-400 animate-pulse delay-75 rounded-full" />
                            <span className="w-1 h-2 bg-amber-400 animate-pulse delay-150 rounded-full" />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {previewBlob && previewingId === 'current'
                          ? `${formatDuration(previewCurrentTime)} / ${formatDuration(previewDuration)}`
                          : 'صوت مصري 24kHz • نبرة إعلانية مقنعة'}
                      </span>
                    </div>
                  </div>

                  {/* Scrubber slider if generated */}
                  {previewBlob && previewingId === 'current' && (
                    <div className="flex-1 min-w-[160px] max-w-xs flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={previewDuration || 1}
                        step={0.01}
                        value={previewCurrentTime}
                        onChange={handleSeekPreview}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                  )}

                  {/* Direct Download Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadPreviewMp3}
                      disabled={!previewBlob || isConvertingMp3}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title="تحميل المقطع المعاين بصيغة MP3 لسوشيال ميديا"
                    >
                      {isConvertingMp3 ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>تحويل MP3...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>تحميل MP3</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadPreviewWav}
                      disabled={!previewBlob}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title="تحميل بصيغة WAV استوديو غير مضغوطة"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>تحميل WAV</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs text-slate-400">
                  يمكنك حفظ هذا النص أو إرساله مباشرة لتوليد الصوت بالذكاء الاصطناعي
                </span>

                <button
                  onClick={() => onLoadScriptToStudio(generatedScript)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-400 text-slate-950 font-black text-xs shadow-lg transition-transform hover:scale-[1.02] cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>إرسال هذا السكريبت إلى استوديو الصوت لتوليده بصوت رائد الأعمال</span>
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Ready-Made Ad Script Templates (نماذج سكريبتات جاهزة) */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Header Banner & Description */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-emerald-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <LayoutTemplate className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-white">
                  مكتبة نماذج السكريبتات الجاهزة (Ready-Made Templates)
                </h3>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl">
                نماذج إعلانية مصاغة ومحكمة بالعامية المصرية الريادية لأشهر سيناريوهات التسويق (إطلاق منتج، ترويج خدمة، دعوة لحدث). اختر أي قالب لبدء تعديله وتخصيصه مباشرة لبيزنسك، أو سجله فوراً في استوديو الصوت.
              </p>
            </div>

            <button
              onClick={() => {
                setActiveTab('generator');
                setIsEditingScript(false);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
            >
              العودة للمولد المخصص
            </button>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={templateSearchQuery}
                onChange={(e) => setTemplateSearchQuery(e.target.value)}
                placeholder="ابحث في أسماء ونصوص القوالب..."
                dir="rtl"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pr-10 pl-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'جميع النماذج', icon: LayoutTemplate, count: READY_TEMPLATES.length },
                { id: 'product_launch', label: 'إطلاق منتج جديد', icon: Package, count: READY_TEMPLATES.filter((t) => t.category === 'product_launch').length },
                { id: 'service_promo', label: 'ترويج خدمة', icon: Briefcase, count: READY_TEMPLATES.filter((t) => t.category === 'service_promo').length },
                { id: 'event_invite', label: 'دعوة لحدث وويبينار', icon: Calendar, count: READY_TEMPLATES.filter((t) => t.category === 'event_invite').length },
              ].map((cat) => {
                const isSelected = templateCategoryFilter === cat.id;
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setTemplateCategoryFilter(cat.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                    <span className={`text-[10px] px-1 rounded-full ${isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {READY_TEMPLATES.filter((tpl) => {
              const matchesCat = templateCategoryFilter === 'all' || tpl.category === templateCategoryFilter;
              const matchesSearch =
                !templateSearchQuery ||
                tpl.title.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
                tpl.script.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
                tpl.categoryName.toLowerCase().includes(templateSearchQuery.toLowerCase());
              return matchesCat && matchesSearch;
            }).map((tpl) => {
              const platformObj = PLATFORMS.find((p) => p.id === tpl.targetPlatform);
              const isCopied = copiedId === tpl.id;

              return (
                <div
                  key={tpl.id}
                  className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 transition-all space-y-3.5 flex flex-col justify-between group shadow-lg"
                >
                  <div className="space-y-2.5">
                    {/* Top Meta Chips */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${tpl.badgeBg}`}>
                        {tpl.badge}
                      </span>

                      <div className="flex items-center gap-1.5 text-[11px] font-mono">
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                          {platformObj?.badge || tpl.targetPlatform}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-amber-400">
                          {tpl.recommendedDuration}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                      {tpl.title}
                    </h4>

                    {/* Audience & Product Context */}
                    <div className="text-[11px] text-slate-400 space-y-1">
                      <p><strong className="text-slate-300">الجمهور المستهدف:</strong> {tpl.targetAudience}</p>
                    </div>

                    {/* Script Content Card */}
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 leading-relaxed font-medium">
                      "{tpl.script}"
                    </div>

                    {/* CTA Chip */}
                    <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300">
                      <strong>الدعوة للعمل (CTA):</strong> {tpl.callToAction}
                    </div>
                  </div>

                  {/* Template Card Action Buttons */}
                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Copy script button */}
                      <button
                        type="button"
                        onClick={() => copyScriptText(tpl.script, tpl.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        title="نسخ السكريبت إلى الحافظة"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>

                      {/* Send directly to voice studio */}
                      <button
                        type="button"
                        onClick={() => onLoadScriptToStudio(tpl.script)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="إرسال هذا القالب مباشرة إلى استوديو الصوت لتوليده بصوت رائد الأعمال المصري"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>تسجيل بالاستوديو</span>
                      </button>
                    </div>

                    {/* Primary Button: Use and Edit Template */}
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>استخدام وتعديل القالب</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Saved Scripts Library (المحفوظات) */}
      {activeTab === 'saved' && (
        <div className="space-y-6">
          {/* Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في السكريبتات المحفوظة..."
                dir="rtl"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pr-10 pl-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs text-slate-400">
              <span>إجمالي النصوص المحفوظة: <strong className="text-amber-300 font-mono">{savedScripts.length}</strong></span>
              <button
                onClick={() => {
                  setActiveTab('generator');
                  setGeneratedScript('');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>صياغة سكريبت جديد</span>
              </button>
            </div>
          </div>

          {/* Platform Categorization Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSavedPlatformFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                savedPlatformFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
              }`}
            >
              جميع المنصات ({savedScripts.length})
            </button>

            {PLATFORMS.map((p) => {
              const count = savedScripts.filter((s) => s.platform === p.id).length;
              const isSelected = savedPlatformFilter === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSavedPlatformFilter(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  <span>{p.badge}</span>
                  <span
                    className={`text-[10px] px-1 rounded-full ${
                      isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Saved Scripts List */}
          {filteredSavedScripts.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 rounded-3xl border border-slate-800/80">
              <Bookmark className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-300 mb-1">
                {searchQuery || savedPlatformFilter !== 'all'
                  ? 'لا توجد نتائج مطابقة لبحثك في هذا التصنيف'
                  : 'لا توجد نصوص إعلانية محفوظة حتى الآن'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                قم بتوليد سكريبت جديد واضغط على "حفظ في المحفوظات" للرجوع إليه واستخدامه في أي وقت.
              </p>
              <button
                onClick={() => setActiveTab('generator')}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md transition-transform hover:scale-105 cursor-pointer"
              >
                توليد سكريبت إعلاني الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredSavedScripts.map((item) => {
                const isCopied = copiedId === item.id;
                const platformObj = item.platform
                  ? PLATFORMS.find((p) => p.id === item.platform)
                  : null;
                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-amber-500/40 transition-all space-y-3 relative group"
                  >
                    {/* Top Row: Title, Date, Platform, Favorite */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleFavorite(item.id)}
                          className="text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                          title={item.isFavorite ? 'إزالة من المفضلة' : 'تمييز كمفضل'}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              item.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                            }`}
                          />
                        </button>
                        <h4 className="font-bold text-white text-sm sm:text-base">
                          {item.title}
                        </h4>

                        {platformObj && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${platformObj.color}`}
                          >
                            {platformObj.badge}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(item.savedAt).toLocaleDateString('ar-EG', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>

                        <div className="flex items-center gap-1">
                          {item.tags?.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700/60 text-[10px] text-amber-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Script Body */}
                    <p className="text-slate-200 text-sm sm:text-base leading-relaxed font-medium bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                      {item.script}
                    </p>

                    {/* Saved Hashtags if available */}
                    {item.hashtags && item.hashtags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]" dir="ltr">
                        <span className="text-slate-500 text-[10px]">الهاشتاجات:</span>
                        {item.hashtags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-amber-300/80 font-mono text-[10px]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Audio Preview Button */}
                        <button
                          onClick={() => handleTogglePreview(item.script, item.id)}
                          disabled={isLoadingPreview && previewingId === item.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isPlayingPreview && previewingId === item.id
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/25'
                              : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                          }`}
                          title="استماع ومعاينة صوتية لهذا السكريبت بصوت رائد الأعمال المصري"
                        >
                          {isLoadingPreview && previewingId === item.id ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                              <span>جارٍ التجهيز...</span>
                            </>
                          ) : isPlayingPreview && previewingId === item.id ? (
                            <>
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              <span>إيقاف المعاينة</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
                              <span>معاينة صوتية</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => copyScriptText(item.script, item.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-semibold">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() =>
                            downloadFile(item.script, `script-${item.title.replace(/\s+/g, '-')}.txt`)
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                          title="تحميل كملف نصي TXT"
                        >
                          <Download className="w-3.5 h-3.5 text-cyan-400" />
                          <span>تحميل TXT</span>
                        </button>

                        <button
                          onClick={() => {
                            if (item.productDesc) setProductDesc(item.productDesc);
                            if (item.targetAudience) setTargetAudience(item.targetAudience);
                            setGeneratedScript(item.script);
                            setActiveTab('generator');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                          title="فتح في المُولّد للتعديل"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>تعديل</span>
                        </button>

                        <button
                          onClick={() => handleOpenShareForSaved(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-amber-300 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                          title="توليد رابط مشاركة فريد لمراجعة هذا السكريبت مع الفريق"
                        >
                          <Share2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>مشاركة مع الفريق 🔗</span>
                        </button>

                        <button
                          onClick={() => handleDeleteSaved(item.id)}
                          className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-800 transition-colors cursor-pointer"
                          title="حذف من المحفوظات"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Main CTA: Load into voice studio */}
                      <button
                        onClick={() => onLoadScriptToStudio(item.script)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 text-slate-950 font-black text-xs shadow-md transition-all hover:scale-[1.02] cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>إرسال لاستوديو الصوت المصري</span>
                        <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Share Modal Dialog */}
      {shareModalData && (
        <ShareModal
          isOpen={!!shareModalData}
          onClose={() => setShareModalData(null)}
          title={shareModalData.title}
          script={shareModalData.script}
          audioBase64={shareModalData.audioBase64}
          audioMime={shareModalData.audioMime}
          voice={shareModalData.voice}
          platform={shareModalData.platform}
          dialect={shareModalData.dialect}
          targetAudience={shareModalData.targetAudience}
          hashtags={shareModalData.hashtags}
          callToAction={shareModalData.callToAction}
          onOpenReviewModal={(shareId) => {
            setShareModalData(null);
            if (onOpenShareReviewModal) {
              onOpenShareReviewModal(shareId);
            }
          }}
        />
      )}
    </div>
  );
};
