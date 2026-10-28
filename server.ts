import express from 'express';
import type { Server } from 'node:http';
import path from 'node:path';
import { GoogleGenAI, Type } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { entityStore } from './src/data/entityStore';
import { executeSmartContext } from './src/lib/searchEngine';
import {
  DEFAULT_OLLAMA_MODEL,
  OLLAMA_MODEL_PROFILES,
  RECOMMENDED_OLLAMA_MODELS,
  getOllamaProfile,
  parseOllamaModelList
} from './src/config/ollamaModels';

type AiProvider = 'gemini' | 'ollama' | 'openai' | 'anthropic' | 'xai';
type ChatRole = 'user' | 'assistant' | 'system';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface AnalyzeRequestBody {
  query?: string;
  bundle?: unknown;
  provider?: AiProvider;
  ollamaModel?: string;
  ollamaBaseUrl?: string;
}

interface ChatRequestBody {
  messages?: ChatMessage[];
  provider?: AiProvider;
  ollamaModel?: string;
  ollamaBaseUrl?: string;
}

interface OllamaInstalledModel {
  name: string;
  digest?: string;
  size?: number;
  modifiedAt?: string;
}

interface OllamaStatus {
  connected: boolean;
  baseUrl: string;
  models: string[];
  installedModels: OllamaInstalledModel[];
  recommendedModels: typeof OLLAMA_MODEL_PROFILES;
  missingRecommended: string[];
  defaultModel: string;
  message?: string;
  error?: string;
  hints?: string[];
}

interface AiAnalysisData {
  summary: string;
  compatibility_notes: string[];
  recommendations: string[];
}

interface StartServerOptions {
  port?: number;
  host?: string;
  staticDir?: string;
  log?: boolean;
}

interface StartedServer {
  server: Server;
  url: string;
  port: number;
}

const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434/v1';
const DEFAULT_HOST = process.env.HOST || '0.0.0.0';
const DEFAULT_PORT = Number.parseInt(process.env.PORT || '3000', 10);
const DEFAULT_PROVIDER: AiProvider = 'ollama';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function getProvider(value: unknown): AiProvider {
  return value === 'gemini' || value === 'ollama' || value === 'openai' || value === 'anthropic' || value === 'xai'
    ? value
    : DEFAULT_PROVIDER;
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((message) => {
    if (!isRecord(message)) return [];
    const role = message.role === 'assistant' || message.role === 'system' ? message.role : 'user';
    const content = getString(message.content);
    return content ? [{ role, content }] : [];
  });
}

function normalizeOllamaBaseUrl(value: unknown): string {
  const baseUrl = getString(value) || process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;
  return baseUrl.replace(/\/+$/, '');
}

function toNativeOllamaBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/v1') ? baseUrl.replace(/\/v1$/, '') : baseUrl;
}

function toOpenAiCompatibleBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
}

function getConfiguredOllamaModels(): string[] {
  const configured = parseOllamaModelList(process.env.OLLAMA_MODELS);
  return configured.length > 0 ? configured : RECOMMENDED_OLLAMA_MODELS;
}

function getDefaultOllamaModel(modelName: unknown): string {
  return getString(modelName) || process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
}

function getOllamaHints(): string[] {
  return [
    'Start the Docker stack with: docker compose up -d ollama',
    'Pull the tiny WPAI model set with: docker compose run --rm ollama-models',
    'Desktop default endpoint: http://127.0.0.1:11434/v1',
    'Docker app default endpoint: http://ollama:11434/v1'
  ];
}

async function getOllamaStatus(baseUrlInput?: unknown): Promise<OllamaStatus> {
  const baseUrl = normalizeOllamaBaseUrl(baseUrlInput);
  const nativeBaseUrl = toNativeOllamaBaseUrl(baseUrl);
  const defaultModel = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

  try {
    const response = await fetch(`${nativeBaseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return {
        connected: false,
        baseUrl,
        models: [],
        installedModels: [],
        recommendedModels: OLLAMA_MODEL_PROFILES,
        missingRecommended: RECOMMENDED_OLLAMA_MODELS,
        defaultModel,
        error: `Ollama returned HTTP ${response.status}: ${response.statusText}`,
        hints: getOllamaHints()
      };
    }

    const data = (await response.json()) as { models?: Array<Record<string, unknown>> };
    const installedModels = (data.models || []).flatMap((model): OllamaInstalledModel[] => {
      const name = getString(model.name) || getString(model.model);
      if (!name) return [];
      return [{
        name,
        digest: getString(model.digest),
        size: typeof model.size === 'number' ? model.size : undefined,
        modifiedAt: getString(model.modified_at)
      }];
    });
    const models = installedModels.map((model) => model.name);
    const missingRecommended = RECOMMENDED_OLLAMA_MODELS.filter((model) => !models.includes(model));

    return {
      connected: true,
      baseUrl,
      models,
      installedModels,
      recommendedModels: OLLAMA_MODEL_PROFILES,
      missingRecommended,
      defaultModel,
      message: missingRecommended.length === 0
        ? 'Ollama is online and the WPAI tiny model set is installed.'
        : 'Ollama is online, but one or more WPAI tiny models are missing.'
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to connect to Ollama service';
    return {
      connected: false,
      baseUrl,
      models: [],
      installedModels: [],
      recommendedModels: OLLAMA_MODEL_PROFILES,
      missingRecommended: RECOMMENDED_OLLAMA_MODELS,
      defaultModel,
      error: message,
      hints: getOllamaHints()
    };
  }
}

async function pullOllamaModel(modelName: string, baseUrlInput?: unknown): Promise<unknown> {
  if (!RECOMMENDED_OLLAMA_MODELS.includes(modelName)) {
    throw new Error(`Refusing to pull unapproved model '${modelName}'. Approved WPAI tiny models: ${RECOMMENDED_OLLAMA_MODELS.join(', ')}`);
  }

  const baseUrl = normalizeOllamaBaseUrl(baseUrlInput);
  const nativeBaseUrl = toNativeOllamaBaseUrl(baseUrl);
  const response = await fetch(`${nativeBaseUrl}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName, stream: false }),
    signal: AbortSignal.timeout(900000)
  });

  if (!response.ok) {
    throw new Error(`Ollama model pull failed for '${modelName}' with HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

function parseJsonFromModel(rawText: string): unknown {
  const trimmed = rawText.trim();
  const unfenced = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(unfenced);
  } catch {
    const firstBrace = unfenced.indexOf('{');
    const lastBrace = unfenced.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(unfenced.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Model did not return valid JSON.');
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const text = getString(item);
    return text ? [text] : [];
  });
}

function normalizeAnalysis(value: unknown, fallbackSummary: string): AiAnalysisData {
  if (!isRecord(value)) {
    return {
      summary: fallbackSummary,
      compatibility_notes: [],
      recommendations: ['Run the query again with a larger model if deeper natural-language analysis is required.']
    };
  }

  const summary = getString(value.summary) || fallbackSummary;
  return {
    summary,
    compatibility_notes: normalizeStringArray(value.compatibility_notes),
    recommendations: normalizeStringArray(value.recommendations)
  };
}

function buildFallbackAnalysis(query: string, bundle: unknown): AiAnalysisData {
  const entityCount = isRecord(bundle) && Array.isArray(bundle.entities) ? bundle.entities.length : 0;
  const edgeCount = isRecord(bundle) && Array.isArray(bundle.edges) ? bundle.edges.length : 0;
  const filterSummary = isRecord(bundle) && isRecord(bundle.resolved_facets)
    ? Object.entries(bundle.resolved_facets)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(', ')
    : 'no explicit facets';

  return {
    summary: `Local deterministic fallback for "${query}": the context bundle contains ${entityCount} entities, ${edgeCount} edges, and ${filterSummary}.`,
    compatibility_notes: edgeCount > 0
      ? ['Dependency edges are present in the context bundle; inspect version ranges before changing a mod pack.']
      : ['No dependency edges were returned for this query.'],
    recommendations: [
      'Verify source provenance before acting on compatibility conclusions.',
      'Use qwen2.5-coder:0.5b when the next step involves code, YAML, or loader-specific debugging.'
    ]
  };
}

function getSystemPrompt(modelName?: string): string {
  const profile = modelName ? getOllamaProfile(modelName) : undefined;
  const profileLine = profile ? ` Local model role: ${profile.role}; purpose: ${profile.purpose}` : '';
  return `You are WPAI Assistant, a concise desktop-local AI expert specializing in Minecraft modding, entity dependency graphs, vector indexes, software architecture, Docker, and Ollama. SOUL is law: be complete, accurate, security-aware, and practical.${profileLine}`;
}

async function generateOllamaChat(messages: ChatMessage[], modelName: string, baseUrl: string): Promise<string> {
  const openai = new OpenAI({
    apiKey: 'ollama',
    baseURL: toOpenAiCompatibleBaseUrl(baseUrl)
  });

  const response = await openai.chat.completions.create({
    model: modelName,
    messages: [
      { role: 'system' as const, content: getSystemPrompt(modelName) },
      ...messages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .map((message) => ({
          role: message.role === 'assistant' ? 'assistant' as const : 'user' as const,
          content: message.content
        }))
    ]
  });

  return response.choices[0]?.message?.content || 'No response generated.';
}

export async function startServer(options: StartServerOptions = {}): Promise<StartedServer> {
  const app = express();
  const port = options.port ?? DEFAULT_PORT;
  const host = options.host ?? DEFAULT_HOST;
  const shouldLog = options.log ?? true;
  let viteServer: { middlewares: express.RequestHandler; close: () => Promise<void> } | undefined;

  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, app: 'WPAI Explorer', mode: process.env.NODE_ENV || 'development' });
  });

  app.get('/api/runtime-config', (_req, res) => {
    res.json({
      defaultProvider: DEFAULT_PROVIDER,
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL,
      ollamaModel: process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
      ollamaModels: getConfiguredOllamaModels(),
      recommendedModels: OLLAMA_MODEL_PROFILES
    });
  });

  app.get('/api/fs/tree', (_req, res) => {
    res.json(entityStore.getTree());
  });

  app.get('/api/fs/file', (req, res) => {
    const filePath = getString(req.query.path);
    if (!filePath) {
      res.status(400).json({ error: 'File path is required.' });
      return;
    }

    const file = entityStore.getFile(filePath);
    if (!file) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }

    res.json(file);
  });

  app.get('/api/entities/:id', (req, res) => {
    const entity = entityStore.getEntityById(req.params.id);
    if (!entity) {
      res.status(404).json({ error: 'Entity not found.' });
      return;
    }
    res.json(entity);
  });

  app.get('/api/entities/:id/file', (req, res) => {
    const entityId = req.params.id;
    const filePath = entityStore.getEntityFilePath(entityId);
    const absolutePath = entityStore.getEntityAbsoluteFilePath(entityId);
    if (!filePath || !absolutePath) {
      res.status(404).json({ error: 'Entity file not found.' });
      return;
    }
    res.json({ path: filePath, absolutePath, downloadUrl: `/api/fs/file?path=${encodeURIComponent(filePath)}` });
  });

  app.get('/api/search', (req, res) => {
    const query = getString(req.query.q) || '';
    const bundle = executeSmartContext(query);
    res.json(bundle);
  });

  app.get('/api/graph', (_req, res) => {
    res.json(entityStore.getGraphData());
  });

  app.get('/api/vectors', (_req, res) => {
    res.json({ vectors: entityStore.getVectorData() });
  });

  app.get('/api/ollama/status', async (req, res) => {
    const status = await getOllamaStatus(req.query.baseUrl);
    res.status(status.connected ? 200 : 503).json(status);
  });

  app.post('/api/ollama/pull', async (req, res) => {
    try {
      const body = isRecord(req.body) ? req.body : {};
      const modelName = getString(body.model);
      if (!modelName) {
        res.status(400).json({ error: 'Model name is required.' });
        return;
      }

      const pullResult = await pullOllamaModel(modelName, body.baseUrl);
      const status = await getOllamaStatus(body.baseUrl);
      res.json({ ok: true, model: modelName, pullResult, status });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to pull Ollama model.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/ollama/pull-recommended', async (req, res) => {
    try {
      const body = isRecord(req.body) ? req.body : {};
      const results: Array<{ model: string; result: unknown }> = [];
      for (const modelName of RECOMMENDED_OLLAMA_MODELS) {
        const result = await pullOllamaModel(modelName, body.baseUrl);
        results.push({ model: modelName, result });
      }
      const status = await getOllamaStatus(body.baseUrl);
      res.json({ ok: true, results, status });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to pull recommended Ollama models.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/ai/chat', async (req, res) => {
    try {
      const body: ChatRequestBody = isRecord(req.body)
        ? {
            messages: normalizeMessages(req.body.messages),
            provider: getProvider(req.body.provider),
            ollamaModel: getString(req.body.ollamaModel),
            ollamaBaseUrl: getString(req.body.ollamaBaseUrl)
          }
        : { messages: [], provider: DEFAULT_PROVIDER };

      const messages = body.messages || [];
      const provider = body.provider || DEFAULT_PROVIDER;

      if (provider === 'gemini') {
        if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY environment variable is missing.');
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'wpai-explorer-desktop' } }
        });
        const formattedPrompt = messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join('\n\n');
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: formattedPrompt,
          config: { systemInstruction: getSystemPrompt() }
        });
        res.json({ reply: response.text || 'No response generated.' });
        return;
      }

      if (provider === 'openai') {
        if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY environment variable is missing.');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system' as const, content: getSystemPrompt() },
            ...messages
              .filter((message) => message.role === 'user' || message.role === 'assistant')
              .map((message) => ({
                role: message.role === 'assistant' ? 'assistant' as const : 'user' as const,
                content: message.content
              }))
          ]
        });
        res.json({ reply: response.choices[0]?.message?.content || 'No response generated.' });
        return;
      }

      if (provider === 'anthropic') {
        if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY environment variable is missing.');
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const formattedMessages = messages
          .filter((message) => message.role === 'user' || message.role === 'assistant')
          .map((message) => ({
            role: message.role === 'assistant' ? 'assistant' as const : 'user' as const,
            content: message.content
          }));
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: getSystemPrompt(),
          messages: formattedMessages.length ? formattedMessages : [{ role: 'user' as const, content: 'Hello' }]
        });
        const content = response.content[0];
        res.json({ reply: content?.type === 'text' ? content.text : '' });
        return;
      }

      if (provider === 'xai') {
        if (!process.env.XAI_API_KEY) throw new Error('XAI_API_KEY environment variable is missing.');
        const openai = new OpenAI({
          apiKey: process.env.XAI_API_KEY,
          baseURL: 'https://api.x.ai/v1'
        });
        const response = await openai.chat.completions.create({
          model: 'grok-2-latest',
          messages: [
            { role: 'system' as const, content: getSystemPrompt() },
            ...messages
              .filter((message) => message.role === 'user' || message.role === 'assistant')
              .map((message) => ({
                role: message.role === 'assistant' ? 'assistant' as const : 'user' as const,
                content: message.content
              }))
          ]
        });
        res.json({ reply: response.choices[0]?.message?.content || 'No response generated.' });
        return;
      }

      const targetBaseUrl = normalizeOllamaBaseUrl(body.ollamaBaseUrl);
      const targetModel = getDefaultOllamaModel(body.ollamaModel);
      const reply = await generateOllamaChat(messages, targetModel, targetBaseUrl);
      res.json({ reply, provider: 'ollama', model: targetModel });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process chat request.';
      console.error('Chat API error:', message);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/ai/analyze', async (req, res) => {
    const body: AnalyzeRequestBody = isRecord(req.body)
      ? {
          query: getString(req.body.query),
          bundle: req.body.bundle,
          provider: getProvider(req.body.provider),
          ollamaModel: getString(req.body.ollamaModel),
          ollamaBaseUrl: getString(req.body.ollamaBaseUrl)
        }
      : {};
    const query = body.query || 'mod dependency graph';
    const bundle = body.bundle;
    const provider = body.provider || DEFAULT_PROVIDER;
    const fallback = buildFallbackAnalysis(query, bundle);

    try {
      const systemInstruction = 'You are an expert Minecraft modding assistant. Analyze mod relationships, dependencies, and provenance data. Return strict JSON containing summary (string), compatibility_notes (array of strings), and recommendations (array of strings).';
      const prompt = `Given the following query: "${query}", analyze the provided Minecraft mod dependency graph context.
Provide a short compatibility and security analysis, and suggest what the user should know based on these entities.

Context Bundle:
${JSON.stringify(bundle, null, 2)}`;

      if (provider === 'gemini') {
        if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY environment variable is missing.');
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'wpai-explorer-desktop' } }
        });
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                compatibility_notes: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['summary', 'compatibility_notes', 'recommendations']
            }
          }
        });
        res.json(normalizeAnalysis(parseJsonFromModel(response.text || '{}'), fallback.summary));
        return;
      }

      if (provider === 'openai') {
        if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY environment variable is missing.');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system' as const, content: systemInstruction },
            { role: 'user' as const, content: prompt }
          ]
        });
        res.json(normalizeAnalysis(parseJsonFromModel(response.choices[0]?.message?.content || '{}'), fallback.summary));
        return;
      }

      if (provider === 'anthropic') {
        if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY environment variable is missing.');
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: systemInstruction,
          messages: [
            { role: 'user' as const, content: `${prompt}\n\nRespond only with a valid JSON object matching the requested schema.` }
          ]
        });
        const content = response.content[0];
        const rawText = content?.type === 'text' ? content.text : '{}';
        res.json(normalizeAnalysis(parseJsonFromModel(rawText), fallback.summary));
        return;
      }

      if (provider === 'xai') {
        if (!process.env.XAI_API_KEY) throw new Error('XAI_API_KEY environment variable is missing.');
        const openai = new OpenAI({
          apiKey: process.env.XAI_API_KEY,
          baseURL: 'https://api.x.ai/v1'
        });
        const response = await openai.chat.completions.create({
          model: 'grok-2-latest',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system' as const, content: systemInstruction },
            { role: 'user' as const, content: prompt }
          ]
        });
        res.json(normalizeAnalysis(parseJsonFromModel(response.choices[0]?.message?.content || '{}'), fallback.summary));
        return;
      }

      const targetBaseUrl = normalizeOllamaBaseUrl(body.ollamaBaseUrl);
      const targetModel = getDefaultOllamaModel(body.ollamaModel);
      const openai = new OpenAI({
        apiKey: 'ollama',
        baseURL: toOpenAiCompatibleBaseUrl(targetBaseUrl)
      });
      const response = await openai.chat.completions.create({
        model: targetModel,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system' as const, content: systemInstruction },
          { role: 'user' as const, content: `${prompt}\n\nReturn only JSON. Do not include Markdown fences.` }
        ]
      });
      const rawText = response.choices[0]?.message?.content || '{}';
      res.json(normalizeAnalysis(parseJsonFromModel(rawText), fallback.summary));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate AI response.';
      if (provider === 'ollama' && message.includes('valid JSON')) {
        res.json(fallback);
        return;
      }
      console.error('Analyze API error:', message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production' && !options.staticDir) {
    const { createServer: createViteServer } = await import('vite');
    viteServer = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(viteServer.middlewares);
  } else {
    const distPath = options.staticDir || path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = await new Promise<Server>((resolve) => {
    const listeningServer = app.listen(port, host, () => resolve(listeningServer));
  });

  server.on('close', () => {
    void viteServer?.close();
  });

  const address = server.address();
  const resolvedPort = typeof address === 'object' && address ? address.port : port;
  const publicHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  const url = `http://${publicHost}:${resolvedPort}`;
  if (shouldLog) {
    console.log(`WPAI Explorer server running on ${url}`);
  }

  return { server, url, port: resolvedPort };
}

const cliEntrypoint = process.argv[1] || '';
if (cliEntrypoint.endsWith('server.ts') || cliEntrypoint.endsWith('server.cjs')) {
  startServer().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown startup failure';
    console.error(`Failed to start WPAI Explorer: ${message}`);
    process.exit(1);
  });
}
