import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Download,
  RefreshCw,
  Server,
  Settings,
  Terminal,
  XCircle
} from 'lucide-react';
import { DEFAULT_OLLAMA_MODEL, OLLAMA_MODEL_PROFILES } from '../config/ollamaModels';
import { OllamaStatus, RuntimeConfig } from '../types';
import { cn } from '../utils/cn';

function formatBytes(value?: number): string {
  if (!value || value <= 0) return 'unknown';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export const ModelSettings: React.FC = () => {
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:11434/v1');
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const installedModelNames = useMemo(() => new Set(status?.models || []), [status?.models]);

  const loadRuntimeConfig = useCallback(async (): Promise<RuntimeConfig> => {
    const response = await fetch('/api/runtime-config');
    if (!response.ok) throw new Error(`Runtime config failed with HTTP ${response.status}`);
    const config = await response.json() as RuntimeConfig;
    setRuntimeConfig(config);
    setBaseUrl(config.ollamaBaseUrl || 'http://127.0.0.1:11434/v1');
    return config;
  }, []);

  const checkStatus = useCallback(async (targetBaseUrl: string) => {
    setIsChecking(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/ollama/status?baseUrl=${encodeURIComponent(targetBaseUrl)}`);
      const nextStatus = await response.json() as OllamaStatus;
      setStatus(nextStatus);
      setMessage(nextStatus.message || nextStatus.error || null);
    } catch (error) {
      setStatus({
        connected: false,
        baseUrl: targetBaseUrl,
        models: [],
        installedModels: [],
        recommendedModels: OLLAMA_MODEL_PROFILES,
        missingRecommended: OLLAMA_MODEL_PROFILES.map((model) => model.name),
        defaultModel: DEFAULT_OLLAMA_MODEL,
        error: getErrorMessage(error)
      });
      setMessage(getErrorMessage(error));
    } finally {
      setIsChecking(false);
    }
  }, []);

  const pullModel = useCallback(async (modelName: string) => {
    setPullingModel(modelName);
    setMessage(`Pulling ${modelName} through Ollama...`);
    try {
      const response = await fetch('/api/ollama/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName, baseUrl })
      });
      const data = await response.json() as { status?: OllamaStatus; error?: string };
      if (!response.ok) throw new Error(data.error || `Pull failed with HTTP ${response.status}`);
      if (data.status) setStatus(data.status);
      setMessage(`${modelName} is installed.`);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setPullingModel(null);
    }
  }, [baseUrl]);

  const pullMissingModels = useCallback(async () => {
    const missing = status?.missingRecommended.length ? status.missingRecommended : OLLAMA_MODEL_PROFILES.map((model) => model.name);
    setPullingModel('recommended');
    setMessage(`Pulling ${missing.length} recommended model(s)...`);
    try {
      for (const modelName of missing) {
        await pullModel(modelName);
      }
      await checkStatus(baseUrl);
      setMessage('Recommended WPAI tiny model set is installed.');
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setPullingModel(null);
    }
  }, [baseUrl, checkStatus, pullModel, status?.missingRecommended]);

  useEffect(() => {
    void loadRuntimeConfig()
      .then((config) => checkStatus(config.ollamaBaseUrl))
      .catch((error) => setMessage(getErrorMessage(error)));
  }, [checkStatus, loadRuntimeConfig]);

  return (
    <div className="h-full bg-black text-zinc-100 overflow-y-auto custom-scrollbar">
      <div className="border-b border-zinc-900 bg-[#080808] px-8 py-6">
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-lime-500/10 border border-lime-500/30 text-lime-400 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-100">Desktop Runtime</h2>
                <p className="text-xs text-zinc-500 font-mono mt-1">Docker Ollama endpoint and local model inventory</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            {status?.connected ? (
              <span className="flex items-center gap-2 border border-lime-500/30 bg-lime-500/10 text-lime-400 px-3 py-1.5 rounded-sm">
                <CheckCircle2 className="w-4 h-4" /> ONLINE
              </span>
            ) : (
              <span className="flex items-center gap-2 border border-red-500/30 bg-red-500/10 text-red-400 px-3 py-1.5 rounded-sm">
                <XCircle className="w-4 h-4" /> OFFLINE
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <section className="border border-zinc-800 bg-[#080808] rounded-md">
          <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Server className="w-4 h-4 text-lime-400" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-300">Ollama Service</h3>
            </div>
            <button
              onClick={() => checkStatus(baseUrl)}
              disabled={isChecking}
              className="h-8 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-sm text-xs font-mono flex items-center gap-2 disabled:opacity-50"
              title="Refresh Ollama status"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isChecking && 'animate-spin')} />
              Refresh
            </button>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
                Base URL
              </label>
              <div className="flex gap-2">
                <input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  className="h-10 flex-1 bg-black border border-zinc-800 text-zinc-100 px-3 rounded-sm text-sm font-mono focus:outline-none focus:border-lime-500/60"
                />
                <button
                  onClick={() => {
                    const nextBaseUrl = baseUrl.includes('ollama:11434')
                      ? 'http://127.0.0.1:11434/v1'
                      : 'http://ollama:11434/v1';
                    setBaseUrl(nextBaseUrl);
                    void checkStatus(nextBaseUrl);
                  }}
                  className="h-10 px-3 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 rounded-sm text-xs font-mono text-zinc-300"
                  title="Toggle host and Docker network endpoints"
                >
                  Host / Docker
                </button>
              </div>
              {message && (
                <div className={cn(
                  'mt-3 flex items-start gap-2 text-xs font-mono border px-3 py-2 rounded-sm',
                  status?.connected ? 'text-lime-300 bg-lime-500/5 border-lime-500/20' : 'text-amber-300 bg-amber-500/5 border-amber-500/20'
                )}>
                  <Terminal className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{message}</span>
                </div>
              )}
            </div>

            <div className="bg-black border border-zinc-800 rounded-sm p-4 font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Default</span>
                <span className="text-lime-400">{runtimeConfig?.ollamaModel || DEFAULT_OLLAMA_MODEL}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Installed</span>
                <span className="text-zinc-200">{status?.models.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Missing WPAI Set</span>
                <span className={cn((status?.missingRecommended.length || 0) > 0 ? 'text-amber-400' : 'text-lime-400')}>
                  {status?.missingRecommended.length || 0}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="border border-zinc-800 bg-[#080808] rounded-md">
          <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Cpu className="w-4 h-4 text-lime-400" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-300">WPAI Tiny Model Set</h3>
            </div>
            <button
              onClick={pullMissingModels}
              disabled={pullingModel !== null || (status?.connected === false)}
              className="h-8 px-3 bg-lime-500/10 hover:bg-lime-500/20 border border-lime-500/30 text-lime-400 rounded-sm text-xs font-mono flex items-center gap-2 disabled:opacity-40"
              title="Pull missing recommended models"
            >
              <Download className="w-3.5 h-3.5" />
              Pull Missing
            </button>
          </div>

          <div className="divide-y divide-zinc-900">
            {OLLAMA_MODEL_PROFILES.map((model) => {
              const installed = installedModelNames.has(model.name);
              const installedModel = status?.installedModels.find((item) => item.name === model.name);
              const isPulling = pullingModel === model.name || pullingModel === 'recommended';
              return (
                <div key={model.name} className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_220px] gap-4 px-5 py-5">
                  <div className="font-mono">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full', installed ? 'bg-lime-400' : 'bg-zinc-700')} />
                      <span className="text-sm text-zinc-100">{model.name}</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-600 mt-1">{model.role}</div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm text-zinc-200">{model.label}</div>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{model.purpose}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {model.strengths.map((strength) => (
                        <span key={strength} className="text-[10px] uppercase tracking-wider text-zinc-400 bg-black border border-zinc-800 rounded-sm px-2 py-1">
                          {strength}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="font-mono text-[11px] text-right">
                      <div className="text-zinc-400">{installed ? formatBytes(installedModel?.size) : model.size}</div>
                      <div className="text-zinc-600 mt-1">{model.context} context</div>
                    </div>
                    {installed ? (
                      <span className="h-8 px-3 border border-lime-500/20 bg-lime-500/10 text-lime-400 rounded-sm text-xs font-mono flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Ready
                      </span>
                    ) : (
                      <button
                        onClick={() => pullModel(model.name)}
                        disabled={isPulling || status?.connected === false}
                        className="h-8 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-sm text-xs font-mono flex items-center gap-2 disabled:opacity-40"
                        title={`Pull ${model.name}`}
                      >
                        {isPulling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Pull
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {status && !status.connected && (
          <section className="border border-red-500/20 bg-red-500/5 rounded-md p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm text-red-300 font-semibold">Ollama is not reachable</h3>
                <p className="text-xs text-zinc-400 mt-1 font-mono">{status.error}</p>
                {status.hints && (
                  <div className="mt-3 space-y-1">
                    {status.hints.map((hint) => (
                      <div key={hint} className="text-[11px] text-zinc-500 font-mono">{hint}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
