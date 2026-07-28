import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  Server,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Paperclip,
  Cpu,
  Zap,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_OLLAMA_MODEL, OLLAMA_MODEL_PROFILES } from '../config/ollamaModels';
import { AiProvider, OllamaStatus, RuntimeConfig } from '../types';
import { cn } from '../utils/cn';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: AiProvider;
  timestamp: string;
  attachments?: string[];
  isError?: boolean;
}

const PRESET_PROMPTS = [
  { label: 'Sodium Compatibility', prompt: 'Analyze compatibility issues between Sodium, Iris Shaders, and Fabric API for Minecraft 1.20.1.' },
  { label: 'SOUL.md Rules', prompt: 'Explain the core principles of SOUL.md law in WPAI Studio and how entity provenance is tracked.' },
  { label: 'Draft Entity Spec', prompt: 'Draft a standard YAML entity specification for a Minecraft mod named "mod_sodium_001" with vector embeddings.' },
  { label: 'Container Status', prompt: 'Provide a diagnostic check for the Ollama Docker container endpoint at http://127.0.0.1:11434/v1.' }
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown network error';
}

export const ChatUI: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `### WPAI Explorer Assistant\n\nLocal Ollama is the default runtime. I can help inspect Minecraft mod entities, graph dependencies, vector-index context, and Docker/Ollama state from inside the desktop app.\n\nUse the model selector for the tiny local set, attach context, or choose a prompt starter below.`,
      provider: 'ollama',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<AiProvider>('ollama');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://127.0.0.1:11434/v1');
  const [ollamaModel, setOllamaModel] = useState(DEFAULT_OLLAMA_MODEL);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [isCheckingOllama, setIsCheckingOllama] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const checkOllamaStatus = async (targetUrl = ollamaBaseUrl) => {
    setIsCheckingOllama(true);
    try {
      const response = await fetch(`/api/ollama/status?baseUrl=${encodeURIComponent(targetUrl)}`);
      const data = await response.json() as OllamaStatus;
      setOllamaStatus(data);
      if (data.connected && data.models.length > 0 && !data.models.includes(ollamaModel)) {
        const preferred = data.models.includes(DEFAULT_OLLAMA_MODEL) ? DEFAULT_OLLAMA_MODEL : data.models[0];
        setOllamaModel(preferred);
      }
    } catch (error) {
      setOllamaStatus({
        connected: false,
        baseUrl: targetUrl,
        models: [],
        installedModels: [],
        recommendedModels: OLLAMA_MODEL_PROFILES,
        missingRecommended: OLLAMA_MODEL_PROFILES.map((model) => model.name),
        defaultModel: DEFAULT_OLLAMA_MODEL,
        error: getErrorMessage(error)
      });
    } finally {
      setIsCheckingOllama(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function loadRuntimeConfig() {
      try {
        const response = await fetch('/api/runtime-config');
        if (!response.ok) return;
        const config = await response.json() as RuntimeConfig;
        if (cancelled) return;
        setProvider(config.defaultProvider);
        setOllamaBaseUrl(config.ollamaBaseUrl || 'http://127.0.0.1:11434/v1');
        setOllamaModel(config.ollamaModel || DEFAULT_OLLAMA_MODEL);
        await checkOllamaStatus(config.ollamaBaseUrl || 'http://127.0.0.1:11434/v1');
      } catch {
        if (!cancelled) {
          await checkOllamaStatus();
        }
      }
    }
    void loadRuntimeConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessageText = attachedFiles.length > 0
      ? `[Attached Context: ${attachedFiles.join(', ')}]\n\n${textToSend}`
      : textToSend;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map(m => ({ role: m.role, content: m.content })),
          provider,
          ollamaBaseUrl,
          ollamaModel
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response from server');
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.reply || 'No content received.',
        provider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `**Error Call Failure**: ${getErrorMessage(err)}\n\nSuggestion: verify your API key or Docker/Ollama endpoint settings.`,
        provider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Chat session cleared. How can I assist with WPAI Studio today?',
        provider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const toggleAttachment = (file: string) => {
    if (attachedFiles.includes(file)) {
      setAttachedFiles(attachedFiles.filter(f => f !== file));
    } else {
      setAttachedFiles([...attachedFiles, file]);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-black text-zinc-100 font-sans relative overflow-hidden">
      {/* Top Bar Header */}
      <div className="h-14 border-b border-zinc-800/80 bg-[#0A0A0A] px-6 flex items-center justify-between shadow-md flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase flex items-center gap-2">
              WPAI <span className="text-lime-400 font-mono text-xs">Chat Assistant</span>
            </h2>
            <p className="text-[10px] text-zinc-500 font-mono">Multi-model conversation engine with local container support</p>
          </div>
        </div>

        {/* Model Selection Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-black border border-zinc-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setProvider('gemini')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-all font-mono text-[11px] flex items-center gap-1.5',
                provider === 'gemini' ? 'bg-lime-500/20 text-lime-400 border border-lime-500/40 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Sparkles className="w-3 h-3 text-lime-400" />
              Gemini
            </button>
            <button
              onClick={() => setProvider('ollama')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-all font-mono text-[11px] flex items-center gap-1.5',
                provider === 'ollama' ? 'bg-lime-500/20 text-lime-400 border border-lime-500/40 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Server className="w-3 h-3 text-lime-400" />
              Ollama / Docker
            </button>
            <button
              onClick={() => setProvider('openai')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-all font-mono text-[11px] flex items-center gap-1.5',
                provider === 'openai' ? 'bg-lime-500/20 text-lime-400 border border-lime-500/40 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Cpu className="w-3 h-3 text-lime-400" />
              GPT-4o
            </button>
            <button
              onClick={() => setProvider('anthropic')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-all font-mono text-[11px] flex items-center gap-1.5',
                provider === 'anthropic' ? 'bg-lime-500/20 text-lime-400 border border-lime-500/40 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Zap className="w-3 h-3 text-lime-400" />
              Claude
            </button>
          </div>

          <button
            onClick={handleClearChat}
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-lg transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ollama Configuration Sub-banner */}
      {provider === 'ollama' && (
        <div className="bg-zinc-950/90 border-b border-zinc-800/80 px-6 py-2 flex items-center justify-between text-xs font-mono text-zinc-400 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-lime-400 flex items-center gap-1.5 text-[11px]">
              <Server className="w-3.5 h-3.5" /> Docker Endpoint:
            </span>
            <input
              type="text"
              value={ollamaBaseUrl}
              onChange={(e) => setOllamaBaseUrl(e.target.value)}
              className="bg-black border border-zinc-800 text-zinc-200 px-2 py-0.5 rounded text-[11px] w-60 focus:border-lime-500/50 outline-none"
            />
            <span className="text-zinc-500">Model:</span>
            <select
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              className="bg-black border border-zinc-800 text-lime-400 px-2 py-0.5 rounded text-[11px] min-w-44 focus:border-lime-500/50 outline-none"
            >
              {(ollamaStatus?.models.length ? ollamaStatus.models : OLLAMA_MODEL_PROFILES.map((model) => model.name)).map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            <button
              onClick={() => checkOllamaStatus()}
              disabled={isCheckingOllama}
              className="p-1.5 text-zinc-500 hover:text-lime-400 hover:bg-zinc-900 border border-zinc-800 rounded transition-colors disabled:opacity-50"
              title="Refresh Ollama models"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isCheckingOllama && 'animate-spin')} />
            </button>
          </div>
          <span className="text-[10px] text-zinc-500 flex items-center gap-1.5">
            {ollamaStatus?.connected ? (
              <CheckCircle2 className="w-3 h-3 text-lime-400" />
            ) : (
              <XCircle className="w-3 h-3 text-red-400" />
            )}
            {ollamaStatus?.connected ? `${ollamaStatus.models.length} model(s) ready` : 'Ollama offline'}
          </span>
        </div>
      )}

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex gap-4 max-w-4xl mx-auto',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400 flex-shrink-0 mt-1 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={cn(
                  'rounded-xl p-4 max-w-2xl relative group shadow-lg',
                  msg.role === 'user'
                    ? 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tr-none'
                    : msg.isError
                    ? 'bg-red-950/30 border border-red-500/30 text-zinc-200 rounded-tl-none'
                    : 'bg-[#0E0E0E] border border-zinc-800/80 text-zinc-200 rounded-tl-none'
                )}
              >
                {/* Header info */}
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-2 border-b border-zinc-800/50 pb-1.5">
                  <span className="uppercase tracking-wider flex items-center gap-1.5">
                    {msg.role === 'user' ? (
                      <>
                        <User className="w-3 h-3 text-zinc-400" /> You
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-lime-400" /> WPAI Assistant
                        {msg.provider && (
                          <span className="ml-1 px-1.5 py-0.2 rounded bg-lime-500/10 text-lime-400 border border-lime-500/20 text-[9px]">
                            {msg.provider.toUpperCase()}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Attachments preview if present */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {msg.attachments.map((att, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-zinc-800 text-lime-400 border border-zinc-700 text-[10px] font-mono flex items-center gap-1">
                        <Paperclip className="w-2.5 h-2.5" /> {att}
                      </span>
                    ))}
                  </div>
                )}

                {/* Formatted Content */}
                <div className="text-sm leading-relaxed font-sans whitespace-pre-wrap selection:bg-lime-500/30">
                  {msg.content}
                </div>

                {/* Message Actions */}
                <button
                  onClick={() => copyToClipboard(msg.content, msg.id)}
                  className="absolute top-2 right-2 p-1.5 text-zinc-500 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/80 rounded border border-zinc-800"
                  title="Copy message"
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3.5 h-3.5 text-lime-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 flex-shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 max-w-4xl mx-auto items-center"
          >
            <div className="w-8 h-8 rounded-lg bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400 flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-[#0E0E0E] border border-zinc-800/80 rounded-xl rounded-tl-none p-4 flex items-center gap-3 text-xs font-mono text-zinc-400">
              <RefreshCw className="w-4 h-4 text-lime-400 animate-spin" />
              <span>Analyzing context with <strong className="text-lime-400">{provider.toUpperCase()}</strong>...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset Prompts Row & Input Area */}
      <div className="p-4 bg-[#0A0A0A] border-t border-zinc-800/80 max-w-4xl mx-auto w-full space-y-3 flex-shrink-0 z-10">
        {/* Context Attachment Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1 flex-shrink-0">
            <Paperclip className="w-3 h-3 text-lime-400" /> Attach Context:
          </span>
          {['mod_sodium_001.yaml', 'mod_iris_002.yaml', 'SOUL.md', 'MANIFEST.md'].map((file) => (
            <button
              key={file}
              onClick={() => toggleAttachment(file)}
              className={cn(
                'px-2 py-0.5 rounded border text-[10px] font-mono transition-colors flex items-center gap-1 flex-shrink-0',
                attachedFiles.includes(file)
                  ? 'bg-lime-500/20 text-lime-400 border-lime-500/40 font-semibold'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              )}
            >
              {attachedFiles.includes(file) && <Check className="w-2.5 h-2.5" />}
              {file}
            </button>
          ))}
        </div>

        {/* Preset Starters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PRESET_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(item.prompt)}
              disabled={isLoading}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs transition-colors flex-shrink-0 font-sans"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="relative flex items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask WPAI Assistant about Minecraft mod entities, dependencies, SOUL rules, or Docker settings..."
            className="w-full bg-black border border-zinc-800 text-zinc-100 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-lime-500/50 resize-none h-14 selection:bg-lime-500/30 font-sans"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-lime-500 text-black hover:bg-lime-400 rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-lime-500 font-semibold shadow-md"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
