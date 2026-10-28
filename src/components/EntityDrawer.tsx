import React, { useEffect, useState } from 'react';

interface Props {
  entityId: string;
  onClose: () => void;
}

interface EntityFileInfo {
  path: string;
  downloadUrl: string;
}

export const EntityDrawer: React.FC<Props> = ({ entityId, onClose }) => {
  const [entity, setEntity] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<EntityFileInfo | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [entityRes, fileRes] = await Promise.all([
          fetch(`/api/entities/${encodeURIComponent(entityId)}`),
          fetch(`/api/entities/${encodeURIComponent(entityId)}/file`)
        ]);

        if (!entityRes.ok) throw new Error(`Entity HTTP ${entityRes.status}`);
        if (!fileRes.ok) throw new Error(`File HTTP ${fileRes.status}`);

        const entityData = await entityRes.json();
        const fileData = await fileRes.json();
        if (!cancelled) {
          setEntity(entityData);
          setFileInfo(fileData);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [entityId]);

  const copyEntityId = async () => {
    await navigator.clipboard.writeText(entityId);
    setCopyStatus('Copied!');
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const openFileLink = async () => {
    if (!fileInfo) return;

    const electronOpen = typeof window !== 'undefined' && (window as any).wpaiDesktop?.openFile;
    if (electronOpen) {
      const success = await (window as any).wpaiDesktop.openFile(fileInfo.absolutePath);
      if (success) return;
    }

    window.open(fileInfo.downloadUrl, '_blank');
  };

  return (
    <div className="absolute right-6 top-6 w-[min(28rem,calc(100vw-2rem))] h-[80vh] bg-black/95 border border-zinc-800 rounded-3xl p-4 shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-[0.24em]">Entity details</div>
          <div className="mt-2 text-lg font-semibold text-zinc-100 leading-tight">{entity?.canonical?.name ?? entityId}</div>
          <div className="mt-1 text-xs text-zinc-500 font-mono break-all">{entityId}</div>
        </div>
        <button
          className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
          <div className="rounded-2xl bg-zinc-950/70 p-3">
            <div className="uppercase tracking-[0.24em] text-[10px] text-zinc-400">Type</div>
            <div className="mt-2 text-sm text-zinc-100">{entity?.type ?? 'Unknown'}</div>
          </div>
          <div className="rounded-2xl bg-zinc-950/70 p-3">
            <div className="uppercase tracking-[0.24em] text-[10px] text-zinc-400">Dewey</div>
            <div className="mt-2 text-sm text-zinc-100">{entity?.dewey_code ?? '—'}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-100 hover:border-lime-400 hover:text-lime-300"
            onClick={copyEntityId}
          >
            {copyStatus ?? 'Copy ID'}
          </button>
          <button
            className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-100 hover:border-sky-400 hover:text-sky-300"
            onClick={openFileLink}
            disabled={!fileInfo}
          >
            Open YAML
          </button>
        </div>
      </div>

      <div className="h-[calc(100%-10rem)] overflow-auto pr-2 text-sm text-zinc-200">
        {loading && <div className="text-zinc-500 font-mono">Loading entity details…</div>}
        {error && <div className="text-rose-400">{error}</div>}
        {!loading && !error && entity && (
          <div className="space-y-5">
            <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">Summary</div>
              <p className="mt-3 text-sm leading-6 text-zinc-200">{String(entity.canonical?.description_summary ?? 'No summary available.')}</p>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">Canonical Fields</div>
                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-zinc-300 bg-black/40 p-3 rounded-xl">{JSON.stringify(entity.canonical || {}, null, 2)}</pre>
              </div>
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">Timestamps</div>
                <div className="mt-3 space-y-2 text-sm text-zinc-200">
                  <div><span className="font-semibold text-zinc-300">First seen:</span> {entity.timestamps.first_seen}</div>
                  <div><span className="font-semibold text-zinc-300">Last canonicalized:</span> {entity.timestamps.last_canonicalized}</div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">Source YAML</div>
              <div className="mt-3 text-sm text-zinc-200">
                {fileInfo ? (
                  <div className="space-y-2">
                    <div className="break-all text-zinc-300">{fileInfo.path}</div>
                    <div className="text-xs text-zinc-500">Native open available in desktop mode.</div>
                  </div>
                ) : (
                  <div className="text-zinc-500">No file path available.</div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntityDrawer;
