/**
 * Share-link storage.
 *
 * - On Vercel (serverless), each request may hit a different instance, so an in-memory Map
 *   loses data. When Upstash Redis env vars are present (added automatically by the
 *   Vercel Marketplace "Upstash for Redis" integration), items are persisted there via REST.
 * - Locally (no env vars), falls back to an in-memory Map.
 */

export interface SharedReview {
  id: string;
  authorName: string;
  comment: string;
  status: 'approved' | 'needs_changes' | 'comment';
  createdAt: number;
}

export interface SharedItem {
  id: string;
  type: 'script' | 'audio';
  title: string;
  script: string;
  audioData?: string;
  audioMime?: string;
  voice?: string;
  platform?: string;
  dialect?: string;
  targetAudience?: string;
  hashtags?: string[];
  callToAction?: string;
  authorName?: string;
  createdAt: number;
  reviews: SharedReview[];
}

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const KEY_PREFIX = 'nabra:share:';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const DEMO_SHARE_ID = 'demo-team-review';

function buildDemoItem(): SharedItem {
  return {
    id: DEMO_SHARE_ID,
    type: 'script',
    title: 'إعلان إطلاق منصة نَبْرة لرواد الأعمال',
    script:
      'كل يوم بنفتح عشرين تاب وعشر برامج عشان نتابع شغلنا ومبيعاتنا. بس السؤال الحقيقي: مين بيتابع كل ده؟ تعرف، لما التنبيه بيوصلك على طول أول بأول، شغلك بيمشي أسرع بكتير وبدون أي توتر. من النهارده، خلّي المعلومة هي اللي توصلك لحد عندك، يعني ببساطة خليك دايماً في الصورة من غير أي مجهود إضافي.',
    platform: 'tiktok',
    dialect: 'egyptian',
    targetAudience: 'رواد الأعمال وأصحاب الشركات الناشئة في مصر والعالم العربي',
    hashtags: ['#تيك_توك_بزنس', '#رواد_أعمال_مصر', '#مشاريع_مصر'],
    callToAction: 'احجز نسختك التجريبية المجانية الآن من الرابط في البايو!',
    authorName: 'فريق الإنتاج الإبداعي',
    createdAt: Date.now() - 3600000 * 2,
    reviews: [
      {
        id: 'rev-1',
        authorName: 'سارة (مدير التسويق)',
        comment: 'الخطاف الافتتاحي قوي جداً والريتم ممتاز. معتمد للنشر على تيك توك وريلز!',
        status: 'approved',
        createdAt: Date.now() - 3600000,
      },
      {
        id: 'rev-2',
        authorName: 'كريم (مسؤول الحملات الإعلانية)',
        comment: 'يا ريت نسرع جملة الدعوة للعمل (CTA) في آخر ثانيتين لتكون أكثر حماساً.',
        status: 'needs_changes',
        createdAt: Date.now() - 1800000,
      },
    ],
  };
}

interface ShareStore {
  readonly persistent: boolean;
  get(id: string): Promise<SharedItem | null>;
  set(item: SharedItem): Promise<void>;
}

class MemoryShareStore implements ShareStore {
  readonly persistent = false;
  private map = new Map<string, SharedItem>();
  private static MAX_ITEMS = 200;

  async get(id: string) {
    return this.map.get(id) ?? null;
  }

  async set(item: SharedItem) {
    this.map.set(item.id, item);
    // Bound memory usage: evict oldest entries
    while (this.map.size > MemoryShareStore.MAX_ITEMS) {
      const oldestKey = this.map.keys().next().value as string;
      this.map.delete(oldestKey);
    }
  }
}

class UpstashShareStore implements ShareStore {
  readonly persistent = true;
  constructor(private url: string, private token: string) {}

  private async command(args: (string | number)[]): Promise<any> {
    const res = await fetch(this.url.replace(/\/$/, ''), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      throw new Error(`Redis error: ${data.error || res.statusText}`);
    }
    return data.result;
  }

  async get(id: string) {
    const raw = await this.command(['GET', KEY_PREFIX + id]);
    return raw ? (JSON.parse(raw) as SharedItem) : null;
  }

  async set(item: SharedItem) {
    await this.command(['SET', KEY_PREFIX + item.id, JSON.stringify(item), 'EX', TTL_SECONDS]);
  }
}

const baseStore: ShareStore =
  REDIS_URL && REDIS_TOKEN ? new UpstashShareStore(REDIS_URL, REDIS_TOKEN) : new MemoryShareStore();

export const shareStore = {
  persistent: baseStore.persistent,
  async get(id: string): Promise<SharedItem | null> {
    const item = await baseStore.get(id);
    if (item) return item;
    // The demo item always exists, even on a fresh store
    if (id === DEMO_SHARE_ID) return buildDemoItem();
    return null;
  },
  set(item: SharedItem) {
    return baseStore.set(item);
  },
};
