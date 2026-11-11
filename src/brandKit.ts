export type BrandAsset = { id: string; name: string; file: string; sha256: string; bytes: number; seconds?: number; colors?: string[] };
export type ReferencePattern = { name: string; description: string; adaptation: string; implementation: string; evidenceSeconds: number[]; aspect?: 'rhythm' | 'typography' | 'composition' | 'resources'; editorialVersion?: 1 };
export type ReferenceAnalysis = { state: 'running' | 'ready' | 'failed'; pid?: number; error?: string; route?: string; reason?: string; patterns?: ReferencePattern[]; evidence?: import('./mediaEvidence').MediaEvidence; measurementError?: string };
export type BrandKit = { id: string; revision: number; logo?: BrandAsset; reference?: BrandAsset; selected: number[]; analysis?: ReferenceAnalysis };
export type BrandSnapshot = { kitId: string; revision: number; logo?: BrandAsset; patterns: (ReferencePattern & { sourceSha256: string; userApproval: 'liked' })[] };
