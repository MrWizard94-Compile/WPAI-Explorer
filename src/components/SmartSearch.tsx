import React, { useState, useEffect } from 'react';
import { Search, Loader2, Database, Box, Play, GitMerge, AlertCircle, Server, Cpu, CheckCircle2, XCircle, RefreshCw, Terminal } from 'lucide-react';
import { executeSmartContext } from '../lib/searchEngine';
import { AiProvider, ContextBundle, OllamaStatus, RuntimeConfig } from '../types';
import { jsonToYaml } from '../utils/yaml';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_OLLAMA_MODEL, OLLAMA_MODEL_PROFILES } from '../config/ollamaModels';
import { cn } from '../utils/cn';

const GraphVisualizer: React.FC<{ bundle: ContextBundle }> = ({ bundle }) => {
  // A simple visualizer using CSS flex/grid to show nodes and edges
  return (
    <div className="bg-black/60 backdrop-blur-md border border-zinc-800/80 rounded-sm p-6 overflow-x-auto">
      <h3 className="text-[10px] font-mono text-lime-500 uppercase tracking-widest mb-6 flex items-center gap-2">
        <GitMerge className="w-4 h-4" /> Expanded Subgraph
      </h3>

      <div className="flex flex-col gap-4 min-w-[600px]">
        {bundle.entities.map(entity => {
          // Find if this entity is a target or source of any edge
          const relatedEdges = bundle.edges.filter(e => e.source === entity.id || e.target === entity.id);
          const isTarget = bundle.edges.some(e => e.target === entity.id);

          return (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={entity.id}
              className={cn(
                "flex items-center gap-4 p-3 rounded-sm border backdrop-blur-sm",
                isTarget ? "bg-lime-900/10 border-lime-500/30 ml-8" : "bg-zinc-900/40 border-zinc-800/80"
              )}
            >
              <div className="w-32 flex-shrink-0 text-xs font-mono text-zinc-500 truncate border-r border-zinc-800/50 pr-2">
                {entity.dewey_code}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded font-mono",
                    entity.type === 'Mod' ? "bg-lime-500/10 text-lime-400" :
                    entity.type === 'Version' ? "bg-purple-500/10 text-purple-400" :
                    "bg-amber-500/10 text-amber-400"
                  )}>
                    {entity.type}
                  </span>
                  <span className="font-medium text-zinc-200">{entity.canonical.name || entity.canonical.relation || entity.id}</span>
                </div>
                {entity.canonical.version_number && (
                  <div className="text-xs text-zinc-400 mt-1">v{entity.canonical.version_number}</div>
                )}
              </div>

              {/* Show connections visually on the right side if it's a DependencyEdge */}
              {entity.type === 'DependencyEdge' && (
                <div className="flex-shrink-0 flex items-center gap-2 text-xs font-mono">
                   <span className="text-zinc-500">[{entity.canonical.version_range}]</span>
                   <span className="text-lime-400 px-2 py-1 bg-lime-500/10 rounded">➜ target</span>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

interface AiAnalysisData {
  summary: string;
  compatibility_notes: string[];
  recommendations: string[];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to connect to AI service';
}

export const SmartSearchPanel: React.FC = () => {
  const [query, setQuery] = useState('fabric mods for 1.20.1 that depend on sodium');
  const [isSearching, setIsSearching] = useState(false);
  const [bundle, setBundle] = useState<ContextBundle | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisData | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState<AiProvider>('ollama');
  const [aiError, setAiError] = useState<string | null>(null);

  // Docker & Ollama Wiring State
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://127.0.0.1:11434/v1');
  const [ollamaModel, setOllamaModel] = useState(DEFAULT_OLLAMA_MODEL);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [isCheckingOllama, setIsCheckingOllama] = useState(false);

  const checkOllamaStatus = async (targetUrl?: string) => {
    setIsCheckingOllama(true);
    const urlToTest = targetUrl || ollamaBaseUrl;
    try {
      const res = await fetch(`/api/ollama/status?baseUrl=${encodeURIComponent(urlToTest)}`);
      const data = await res.json() as OllamaStatus;
      setOllamaStatus(data);
      if (data.connected && data.models && data.models.length > 0) {
        if (!data.models.includes(ollamaModel)) {
          setOllamaModel(data.models.includes(DEFAULT_OLLAMA_MODEL) ? DEFAULT_OLLAMA_MODEL : data.models[0]);
        }
      }
    } catch (err) {
      setOllamaStatus({
        connected: false,
        baseUrl: urlToTest,
        models: [],
        installedModels: [],
        recommendedModels: OLLAMA_MODEL_PROFILES,
        missingRecommended: OLLAMA_MODEL_PROFILES.map((model) => model.name),
        defaultModel: DEFAULT_OLLAMA_MODEL,
        error: getErrorMessage(err),
        hints: ['Check network connection to Docker host/container.']
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
        setAiProvider(config.defaultProvider);
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

  const handleSearch = async () => {
    setIsSearching(true);
    setAiAnalysis(null);
    setAiError(null);

    // Simulate network delay for bundle creation
    await new Promise(resolve => setTimeout(resolve, 800));

    const newBundle = executeSmartContext(query);
    setBundle(newBundle);
    setIsSearching(false);

    // Call AI Endpoint
    setIsAiLoading(true);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          bundle: newBundle,
          provider: aiProvider,
          ollamaBaseUrl,
          ollamaModel
        })
      });
      const data = await response.json();
      if (response.ok) {
        setAiAnalysis(data);
      } else {
        setAiError(data.error || 'Failed to analyze graph');
      }
    } catch (e) {
      console.error(e);
      setAiError(getErrorMessage(e));
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden relative font-sans text-zinc-300">
      {/* High-tech Grid Background Layer */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-lime-900/5 to-transparent z-0 pointer-events-none" />

      <div className="p-8 border-b border-zinc-800/80 bg-black/40 backdrop-blur-md relative z-10">
        <h2 className="text-xl font-medium text-zinc-100 mb-2 flex items-center gap-3 tracking-wide">
          <div className="w-7 h-7 rounded bg-lime-500/10 border border-lime-500/30 text-lime-400 flex items-center justify-center">
             <Database className="w-4 h-4" />
          </div>
          <span className="font-mono uppercase text-sm text-lime-400 font-semibold tracking-widest">WPAI //</span>
          Context Loader
        </h2>
        <p className="text-sm text-zinc-500 mb-6 max-w-2xl font-mono leading-relaxed">
          &gt; Test the query-time "bundle builder". Prunes via Dewey spaces, performs semantic vector search within pruned spaces, and expands the graph to gather localized context.
        </p>

        <div className="flex gap-3 max-w-4xl">
          <div className="relative flex-1 group">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-lime-400 transition-colors" />
            <input
              type="text"
              className="w-full bg-black/40 border border-zinc-800 text-zinc-200 rounded-sm py-3 pl-12 pr-4 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/50 transition-all font-mono text-sm placeholder:text-zinc-700"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Query matrix..."
            />
          </div>
          <select
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value as AiProvider)}
            className="bg-black/40 border border-zinc-800 text-lime-400 rounded-sm px-4 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/50 transition-all font-mono text-sm cursor-pointer appearance-none min-w-[160px]"
          >
            <option value="gemini">:: Gemini</option>
            <option value="openai">:: GPT-4o</option>
            <option value="anthropic">:: Claude</option>
            <option value="xai">:: Grok</option>
            <option value="ollama">:: Ollama</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 border border-lime-500/30 px-6 py-3 rounded-sm text-sm font-mono tracking-wider uppercase transition-all flex items-center gap-2 disabled:opacity-30 disabled:hover:bg-lime-500/10"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Execute
          </button>
        </div>

        {/* Docker / Ollama Wiring Panel (shown when Ollama is selected) */}
        {aiProvider === 'ollama' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-4xl mt-4 p-4 bg-zinc-950/80 border border-lime-500/20 rounded-sm font-mono text-xs text-zinc-300 space-y-3 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-2 text-lime-400 font-semibold uppercase tracking-wider">
                <Server className="w-4 h-4 text-lime-400" />
                <span>Docker / Ollama Container Wiring</span>
              </div>
              <div className="flex items-center gap-2">
                {ollamaStatus?.connected ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-lime-500/10 text-lime-400 border border-lime-500/30 text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> ONLINE
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 text-[10px]">
                    <XCircle className="w-3 h-3" /> UNREACHABLE
                  </span>
                )}
                <button
                  onClick={() => checkOllamaStatus()}
                  disabled={isCheckingOllama}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-sm text-[10px] flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Re-check container status"
                >
                  <RefreshCw className={cn("w-3 h-3", isCheckingOllama && "animate-spin")} />
                  Test Connection
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">
                  Ollama Base Endpoint URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ollamaBaseUrl}
                    onChange={(e) => setOllamaBaseUrl(e.target.value)}
                    placeholder="http://127.0.0.1:11434/v1"
                    className="flex-1 bg-black border border-zinc-800 text-zinc-200 px-3 py-1.5 rounded-sm focus:outline-none focus:border-lime-500/50 text-xs"
                  />
                  <button
                    onClick={() => {
                      const next = ollamaBaseUrl.includes('host.docker.internal')
                        ? 'http://127.0.0.1:11434/v1'
                        : 'http://host.docker.internal:11434/v1';
                      setOllamaBaseUrl(next);
                      checkOllamaStatus(next);
                    }}
                    className="px-2 py-1 bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-sm text-[10px]"
                    title="Toggle Host / Docker container localhost"
                  >
                    Host / Docker
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">
                  Target Model Name
                </label>
                {ollamaStatus?.connected && ollamaStatus.models.length > 0 ? (
                  <select
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-lime-400 px-3 py-1.5 rounded-sm focus:outline-none focus:border-lime-500/50 text-xs cursor-pointer"
                  >
                    {ollamaStatus.models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-lime-400 px-3 py-1.5 rounded-sm focus:outline-none focus:border-lime-500/50 text-xs cursor-pointer"
                  >
                    {OLLAMA_MODEL_PROFILES.map((model) => (
                      <option key={model.name} value={model.name}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Docker Hints & Diagnostic Output */}
            {ollamaStatus && !ollamaStatus.connected && (
              <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-sm space-y-1.5 text-[11px] text-zinc-400">
                <div className="flex items-center gap-2 text-red-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Connection Diagnostic: {ollamaStatus.error}</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono space-y-1">
                  <p className="text-zinc-400">Docker Run Command:</p>
                  <code className="block bg-black p-1.5 rounded text-lime-400/90 border border-zinc-900 overflow-x-auto">
                    docker run -d -v ollama:/root/.ollama -p 11434:11434 -e OLLAMA_ORIGINS="*" --name ollama ollama/ollama
                  </code>
                  <p className="text-zinc-500 mt-1">
                    Note: If running WPAI in a container, set Base URL to <span className="text-lime-400">http://host.docker.internal:11434/v1</span> to reach host Ollama.
                  </p>
                </div>
              </div>
            )}

            {ollamaStatus?.connected && (
              <div className="bg-lime-500/5 border border-lime-500/20 p-2.5 rounded-sm flex items-center justify-between text-[11px] text-zinc-300">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-lime-400" />
                  <span>Verified Docker Engine at <code className="text-lime-400">{ollamaStatus.baseUrl}</code></span>
                </div>
                <span className="text-zinc-500">
                  {ollamaStatus.models.length} model(s) pulled: {ollamaStatus.models.join(', ') || 'none'}
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Pinecone-style Query Metrics UI (shown after search) */}
        {bundle && !isSearching && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mt-6 flex items-center gap-6 text-[11px] uppercase tracking-widest font-mono"
          >
            <div className="flex items-center gap-2 text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse shadow-[0_0_8px_rgba(132,204,22,0.8)]" />
              Latency: <span className="text-zinc-200">14ms</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-500">
              <Database className="w-3.5 h-3.5" />
              Scanned: <span className="text-zinc-200">12,402 vec</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-500">
              <span>Filter:</span>
              <code className="text-lime-400 bg-lime-500/10 px-2 py-0.5 rounded-sm border border-lime-500/20">
                {`{ "$in": [${bundle.pruned_dewey_spaces.map(s => `"${s.split(' ')[0]}"`).join(', ')}] }`}
              </code>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
        <AnimatePresence mode="wait">
          {!bundle && !isSearching && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 font-mono text-sm tracking-wide"
            >
              <Box className="w-12 h-12 mb-4 opacity-30 text-lime-500" />
              [ AWAITING_SYSTEM_INPUT ]
            </motion.div>
          )}

          {isSearching && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-lime-500 font-mono text-sm gap-6 tracking-widest"
            >
              <div className="relative flex items-center justify-center">
                 <div className="absolute w-16 h-16 border border-lime-500/30 rounded-full animate-ping" />
                 <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-zinc-300 uppercase">Compiling Topology...</span>
                <span className="text-xs text-lime-500/70">Vector search operating on partitioned facets</span>
              </div>
            </motion.div>
          )}

          {bundle && !isSearching && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6 max-w-6xl mx-auto"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black/60 border border-zinc-800/80 rounded-sm p-5 relative overflow-hidden backdrop-blur-sm">
                  <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-3">
                    <span className="text-lime-500">01</span>
                    Resolution Matrix
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-black/80 border border-zinc-800/50 rounded-sm p-3 font-mono text-xs">
                      <div className="text-zinc-600 mb-2 uppercase tracking-widest">Active Filters:</div>
                      {Object.entries(bundle.resolved_facets).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between mt-1">
                          <span className="text-zinc-400">{k}:</span>
                          <span className="text-lime-400 bg-lime-500/10 px-1.5 py-0.5 rounded-sm">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-widest">
                       <span className="text-zinc-600 block mb-2">Dewey Partitions:</span>
                       <div className="flex flex-wrap gap-2">
                          {bundle.pruned_dewey_spaces.map(s => (
                            <span key={s} className="bg-zinc-900 text-zinc-400 px-2 py-1 rounded-sm border border-zinc-800">{s}</span>
                          ))}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="bg-black/60 border border-zinc-800/80 rounded-sm p-5 backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-[1px] bg-gradient-to-r from-transparent to-lime-500/50" />
                  <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-3">
                    <span className="text-lime-500">02</span>
                    Vector Alignments
                  </h3>
                  <div className="space-y-2">
                    {bundle.semantic_matches.map((m, i) => (
                      <div key={i} className="flex flex-col gap-1 p-2 bg-black/80 border border-zinc-800/50 rounded-sm">
                         <div className="flex justify-between items-center text-xs">
                           <span className="font-mono text-zinc-300 truncate">{m.id}</span>
                           <span className="text-lime-400 font-mono bg-lime-500/10 px-1.5 py-0.5 rounded-sm shadow-[0_0_10px_rgba(132,204,22,0.1)]">{m.score.toFixed(2)}</span>
                         </div>
                         <div className="text-[10px] text-zinc-600 font-mono truncate">hit: {m.section}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-black/60 border border-zinc-800/80 rounded-sm p-5 backdrop-blur-sm relative flex flex-col">
                  <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-3">
                    <span className="text-lime-500">03</span>
                    Graph Expansion
                  </h3>
                  <div className="text-sm text-zinc-300 flex flex-col gap-2 flex-1 justify-center relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(132,204,22,0.05)_0%,transparent_70%)]" />
                    <p className="text-center text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Topology Nodes</p>
                    <p className="text-5xl text-center font-light text-lime-400 font-mono drop-shadow-[0_0_15px_rgba(132,204,22,0.3)]">{bundle.expanded_nodes}</p>
                  </div>
                </div>
              </div>

              <GraphVisualizer bundle={bundle} />

              {/* AI Insights Panel */}
              <div className="bg-black/60 backdrop-blur-md border border-zinc-800 rounded-sm overflow-hidden border-l-[3px] border-l-lime-500 shadow-[0_0_20px_rgba(132,204,22,0.03)]">
                <div className="bg-black/80 border-b border-zinc-800/80 px-5 py-3 flex items-center justify-between">
                  <h3 className="text-[11px] font-mono font-semibold text-lime-400 uppercase tracking-widest flex items-center gap-3">
                    <span className="relative flex h-2 w-2">
                      {isAiLoading ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
                        </>
                      ) : (
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500 shadow-[0_0_8px_rgba(132,204,22,0.8)]"></span>
                      )}
                    </span>
                    AI Mod Analyst // {aiProvider.toUpperCase()}
                  </h3>
                </div>

                <div className="p-6 relative">
                  <div className="absolute top-0 right-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-lime-500/10 to-transparent" />

                  {isAiLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-lime-500/80 font-mono uppercase tracking-widest">
                      <div className="flex gap-1 mb-4">
                        <div className="w-1 h-4 bg-lime-500 animate-pulse delay-75" />
                        <div className="w-1 h-4 bg-lime-500 animate-pulse delay-150" />
                        <div className="w-1 h-4 bg-lime-500 animate-pulse delay-300" />
                      </div>
                      <p className="text-[10px]">
                        Executing analysis protocol via {aiProvider}...
                      </p>
                    </div>
                  ) : aiError ? (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-sm p-5 flex gap-4 text-red-300/80 font-mono text-xs">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                      <div>
                        <p className="font-semibold text-red-400 mb-1 uppercase tracking-widest">CRITICAL FAILURE</p>
                        <p>{aiError}</p>
                      </div>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Context Summary</h4>
                        <p className="text-sm text-zinc-300 leading-relaxed font-sans">{aiAnalysis.summary}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {aiAnalysis.compatibility_notes && aiAnalysis.compatibility_notes.length > 0 && (
                          <div className="bg-black/50 rounded-sm p-5 border border-zinc-800/80 relative">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-amber-500/20" />
                            <h4 className="text-[10px] font-mono text-amber-500 uppercase tracking-widest mb-4">Compatibility Flags</h4>
                            <ul className="space-y-3">
                              {aiAnalysis.compatibility_notes.map((note: string, i: number) => (
                                <li key={i} className="text-xs text-zinc-400 flex items-start gap-3 font-sans">
                                  <span className="text-amber-500 font-mono mt-0.5">&gt;</span>
                                  {note}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                          <div className="bg-black/50 rounded-sm p-5 border border-zinc-800/80 relative">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-lime-500/20" />
                            <h4 className="text-[10px] font-mono text-lime-500 uppercase tracking-widest mb-4">Action Protocols</h4>
                            <ul className="space-y-3">
                              {aiAnalysis.recommendations.map((rec: string, i: number) => (
                                <li key={i} className="text-xs text-zinc-400 flex items-start gap-3 font-sans">
                                  <span className="text-lime-500 font-mono mt-0.5">&gt;</span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-zinc-600 font-mono text-[10px] uppercase tracking-widest">
                      [ NO ANALYSIS DATA AVAILABLE ]
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-black/60 backdrop-blur-md border border-zinc-800/80 rounded-sm overflow-hidden flex flex-col shadow-sm">
                <div className="bg-black/80 border-b border-zinc-800/80 px-5 py-3 flex justify-between items-center">
                  <h3 className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-widest">Raw Output Payload (YAML)</h3>
                </div>
                <div className="p-6 overflow-y-auto max-h-96 custom-scrollbar font-mono text-[11px] bg-black">
                  <pre className="text-lime-400/80 leading-relaxed">
                    {jsonToYaml({ context: { query: bundle.query, facets: bundle.resolved_facets, entities: bundle.entities } })}
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
