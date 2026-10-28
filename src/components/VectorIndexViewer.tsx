import React, { useEffect, useState } from 'react';
import { Network, Database, Cpu, Search, Hash, Box, Layers, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import EntityDrawer from './EntityDrawer';

interface VectorEntity {
  id: string;
  type: string;
  dewey_code: string;
  canonical: Record<string, unknown>;
  vector_2d?: [number, number];
}

interface VectorPayload {
  vectors: VectorEntity[];
}

const collections = [
  { id: 'descriptions', name: 'Mod Summaries', icon: Search },
  { id: 'dependencies', name: 'Dependency Clauses', icon: Hash },
  { id: 'changelogs', name: 'Version History', icon: Activity }
];

export const VectorIndexViewer: React.FC = () => {
  const [activeCollection, setActiveCollection] = useState('descriptions');
  const [vectors, setVectors] = useState<VectorEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadVectors = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/vectors');
        if (!response.ok) {
          throw new Error(`Vector fetch failed: ${response.statusText}`);
        }

        const data = (await response.json()) as VectorPayload;
        if (!cancelled) {
          setVectors(data.vectors || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load vector index.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadVectors();
    return () => {
      cancelled = true;
    };
  }, []);

  const countByType = {
    descriptions: vectors.filter((entity) => entity.type === 'Mod').length,
    dependencies: vectors.filter((entity) => entity.type === 'DependencyEdge').length,
    changelogs: vectors.filter((entity) => entity.type === 'Version').length,
  };

  const filteredEntities = vectors.filter((entity) => {
    if (activeCollection === 'descriptions') return entity.type === 'Mod';
    if (activeCollection === 'dependencies') return entity.type === 'DependencyEdge';
    if (activeCollection === 'changelogs') return entity.type === 'Version';
    return true;
  });

  const displayedVectors = filteredEntities.slice(0, 120);

  return (
    <div className="h-full flex flex-col bg-black text-zinc-100 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-lime-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-200px] left-[-200px] w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="p-8 pb-4 border-b border-zinc-900 bg-black/80 z-10 relative">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-lime-500/20 text-lime-400 flex items-center justify-center">
            <Network className="w-5 h-5" />
          </div>
          WPAI Vector Core
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
            <Database className="w-8 h-8 text-lime-500/50" />
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Total Vectors</div>
              <div className="text-xl font-light text-zinc-200">{vectors.length.toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
            <Cpu className="w-8 h-8 text-lime-500/50" />
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Projection</div>
              <div className="text-xl font-light text-zinc-200">2D</div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
            <Layers className="w-8 h-8 text-purple-500/50" />
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Active Collection</div>
              <div className="text-xl font-light text-zinc-200">{collections.find((col) => col.id === activeCollection)?.name}</div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
            <Box className="w-8 h-8 text-amber-500/50" />
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Showing</div>
              <div className="text-xl font-light text-zinc-200">{filteredEntities.length.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden z-10 relative">
        <div className="w-72 bg-[#0A0A0A] border-r border-zinc-900 p-6 flex flex-col gap-6">
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Box className="w-4 h-4" /> Collections
            </h3>
            <div className="space-y-2">
              {collections.map((col) => {
                const Icon = col.icon;
                return (
                  <button
                    key={col.id}
                    onClick={() => setActiveCollection(col.id)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg text-sm transition-all',
                      activeCollection === col.id
                        ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20'
                        : 'text-zinc-400 hover:bg-zinc-900 border border-transparent'
                    )}
                  >
                    <span className="font-medium flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {col.name}
                    </span>
                    <span className="text-xs font-mono opacity-60">{countByType[col.id as keyof typeof countByType].toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1" />

          <div className="bg-black border border-zinc-800 rounded-lg p-4 text-sm text-zinc-400">
            <h4 className="font-semibold text-zinc-300 mb-2">Semantic Index</h4>
            <p className="text-xs leading-relaxed">
              Local 2D vectors are projected from entity embeddings to reveal similarity clusters and semantic overlap.
            </p>
          </div>
        </div>

        <div className="flex-1 relative bg-[#020202] overflow-hidden">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(#222 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />

          <div className="absolute inset-4 border border-zinc-800/50 rounded-2xl bg-black/40 backdrop-blur-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <Search className="w-4 h-4 text-lime-400" /> Vector Projection
              </h3>
              <span className="text-xs text-zinc-500 font-mono">Showing {displayedVectors.length} nodes</span>
            </div>

            <div className="flex-1 relative p-10">
              {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center text-zinc-500 font-mono text-sm">
                  Loading vector index…
                </div>
              )}

              {error && (
                <div className="absolute inset-0 z-10 flex items-center justify-center px-8 text-rose-400 font-mono text-sm text-center">
                  {error}
                </div>
              )}

              {!isLoading && !error && displayedVectors.map((entity, index) => {
                const x = entity.vector_2d
                  ? Math.min(92, Math.max(4, entity.vector_2d[0] * 18 + 50))
                  : (index * 13) % 80 + 10;
                const y = entity.vector_2d
                  ? Math.min(92, Math.max(4, entity.vector_2d[1] * 18 + 50))
                  : (index * 19) % 80 + 10;

                const colorClass =
                  entity.type === 'Mod' ? 'bg-lime-400 shadow-lime-400/50' :
                  entity.type === 'DependencyEdge' ? 'bg-amber-400 shadow-amber-400/50' :
                  'bg-purple-400 shadow-purple-400/50';

                return (
                  <motion.div
                    key={entity.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.005 }}
                    className="absolute group"
                    style={{ left: `${x}%`, top: `${y}%` }}
                    onClick={() => setSelectedEntityId(entity.id)}
                  >
                    <div className={cn('w-3 h-3 rounded-full shadow-lg transition-transform hover:scale-150 cursor-pointer relative z-10', colorClass)} />
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 w-max max-w-xs">
                      <div className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs py-1.5 px-3 rounded-md shadow-2xl">
                        <div className="font-semibold mb-0.5">{String(entity.canonical.name ?? entity.id)}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">Dewey: {entity.dewey_code}</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {selectedEntityId && (
                <EntityDrawer entityId={selectedEntityId} onClose={() => setSelectedEntityId(null)} />
              )}

              {activeCollection === 'descriptions' && (
                <>
                  <div className="absolute top-[24%] left-[22%] w-40 h-40 border border-lime-500/20 bg-lime-500/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                    <span className="text-lime-500/30 text-xs font-mono uppercase tracking-widest font-semibold">Performance</span>
                  </div>
                  <div className="absolute top-[80%] left-[32%] w-32 h-32 border border-lime-500/20 bg-lime-500/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                    <span className="text-lime-500/30 text-xs font-mono uppercase tracking-widest font-semibold">Shaders</span>
                  </div>
                  <div className="absolute top-[20%] left-[78%] w-36 h-36 border border-lime-500/20 bg-lime-500/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                    <span className="text-lime-500/30 text-xs font-mono uppercase tracking-widest font-semibold">Tech</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
