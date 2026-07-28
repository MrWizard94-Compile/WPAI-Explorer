export type OllamaModelRole = 'general' | 'code' | 'fallback';

export interface OllamaModelProfile {
  name: string;
  label: string;
  role: OllamaModelRole;
  size: string;
  context: string;
  purpose: string;
  strengths: string[];
}

export const OLLAMA_MODEL_PROFILES: OllamaModelProfile[] = [
  {
    name: 'gemma3:270m',
    label: 'Gemma 3 270M',
    role: 'general',
    size: '291 MB',
    context: '32K',
    purpose: 'Default local analyst for graph summaries, compatibility notes, and quick chat.',
    strengths: ['fast summaries', 'longer local context', 'low memory']
  },
  {
    name: 'qwen2.5-coder:0.5b',
    label: 'Qwen2.5 Coder 0.5B',
    role: 'code',
    size: '397 MB',
    context: '32K',
    purpose: 'Code, YAML entity specs, Minecraft modding snippets, and dependency reasoning.',
    strengths: ['code repair', 'structured specs', 'modding diagnostics']
  },
  {
    name: 'smollm2:135m',
    label: 'SmolLM2 135M',
    role: 'fallback',
    size: '270 MB',
    context: '8K',
    purpose: 'Ultra-light local fallback for endpoint checks and short diagnostics.',
    strengths: ['smallest footprint', 'fast fallback', 'offline diagnostics']
  }
];

export const RECOMMENDED_OLLAMA_MODELS = OLLAMA_MODEL_PROFILES.map((model) => model.name);
export const DEFAULT_OLLAMA_MODEL = 'gemma3:270m';
export const CODE_OLLAMA_MODEL = 'qwen2.5-coder:0.5b';
export const FALLBACK_OLLAMA_MODEL = 'smollm2:135m';

export function parseOllamaModelList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,\s]+/)
    .map((model) => model.trim())
    .filter(Boolean);
}

export function getOllamaProfile(modelName: string): OllamaModelProfile | undefined {
  return OLLAMA_MODEL_PROFILES.find((profile) => profile.name === modelName);
}
