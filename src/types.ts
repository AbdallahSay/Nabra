export interface TranscriptionResult {
  text: string;
  modelUsed: string;
  timestamp: number;
  duration?: number;
  audioBlobUrl?: string;
  audioBase64?: string;
  mimeType?: string;
  fileName?: string;
}

export interface ScriptAnalysis {
  summary: string;
  actionPoints: string[];
  adScript: string;
  sentiment: string;
  estimatedDurationSec: number;
}

export interface GeneratedVoice {
  id: string;
  text: string;
  audioBlobUrl: string;
  audioBase64: string;
  mimeType: string;
  voiceName: string;
  timestamp: number;
  duration?: number;
}

export interface ShareReview {
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
  reviews?: ShareReview[];
}

