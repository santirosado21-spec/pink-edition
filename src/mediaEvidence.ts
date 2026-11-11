export type AudioEvidence = { present: boolean; peakDbfs?: number; loudestSeconds?: number; quietFraction?: number; integratedLufs?: number | null; truePeakDbtp?: number | null };
export type MediaEvidence = { version: number; sourceSha256: string; durationSeconds: number; picture: { sampleFps: number; strongChangeSeconds: number[]; meanActivity: number }; audio: AudioEvidence };
export type MediaReview = { state: 'pass' | 'review' | 'fail'; warnings: { message: string; seconds?: number }[]; errors: { message: string; seconds?: number }[]; audio: AudioEvidence; sampleFps: number };
