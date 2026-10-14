import type { AIModelOption } from '../types';

// UI 예시 목록. 실제 모델 ID·한도·단가는 Phase 3에서 공급자 설정값으로 관리한다.
export const MODELS: AIModelOption[] = [
  { id: 'gemini-free', provider: 'gemini', optionLabel: 'Gemini 무료 API', shortLabel: 'Gemini 무료', tier: 'free' },
  { id: 'groq-free', provider: 'groq', optionLabel: 'Groq 무료 API', shortLabel: 'Groq 무료', tier: 'free' },
  { id: 'openrouter-free', provider: 'openrouter', optionLabel: 'OpenRouter 무료 모델', shortLabel: 'OpenRouter 무료', tier: 'free' },
  { id: 'ollama-local', provider: 'ollama', optionLabel: 'Ollama 로컬 AI', shortLabel: 'Ollama 로컬', tier: 'local' },
  { id: 'paid-demo', provider: 'paid-demo', optionLabel: '유료 AI · 샘플 요금', shortLabel: '유료 AI 샘플', tier: 'paid' },
];

export const DEFAULT_MODEL_ID = 'gemini-free';
