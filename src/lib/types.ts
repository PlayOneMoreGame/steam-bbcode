export interface TranslationState {
  bbcode: string;
  status: 'idle' | 'translating' | 'done' | 'error';
  error?: string;
  stale: boolean;
}
