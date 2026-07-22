import React, { useState } from 'react';
import { Network, Database, Cpu, Search, Hash, Box, Layers, Activity } from 'lucide-react';
import { cn } from '../utils/cn';
import { mockEntities } from '../data/mockEntities';
import { motion } from 'motion/react';

export const VectorIndexViewer: React.FC = () => {
  const [activeCollection, setActiveCollection] = useState('descriptions');

  const collections = [
    { id: 'descriptions', name: 'Mod Summaries', count: 124502 },
    { id: 'dependencies', name: 'Dependency Clauses', count: 430291 },
    { id: 'changelogs', name: 'Changelog Chunks', count: 850122 }
  ];

  const getCollectionEntities = () => {
    switch (activeCollection) {
      case 'descriptions': return mockEntities.filter(e => e.type === 'Mod');
      case 'dependencies': return mockEntities.filter(e => e.type === 'DependencyEdge');
      case 'changelogs': return mockEntities.filter(e => e.type === 'Version');
      default: return mockEntities;
    }
  };

  const entities = getCollectionEntities();

  return (
    <div className="h-full flex flex-col bg-black text-zinc-100 overflow-hidden relative">

      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-lime-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-200px] left-[-200px] w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Dashboard (Pinecone/Milvus inspired) */}
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
              <div className="text-xl font-light text-zinc-200">1,404,915</div>
            </div>
          </div>
          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
            <Cpu className="w-8 h-8 text-lime-500/50" />
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Dimensions (MiniLM)</div>
              <div className="text-xl font-light text-zinc-200">384</div>
            </div>
          </div>
          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
            <Layers className="w-8 h-8 text-purple-500/50" />
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Index Topology</div>
              <div className="text-xl font-light text-zinc-200">HNSW <span className="text-sm text-zinc-500">M=16</span></div>
            </div>
          </div>
          <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
            <Activity className="w-8 h-8 text-amber-500/50" />
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Metric</div>
              <div className="text-xl font-light text-zinc-200">Cosine</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden z-10 relative">
        {/* Left sidebar - Collections (Chroma inspired) */}
        <div className="w-72 bg-[#0A0A0A] border-r border-zinc-900 p-6 flex flex-col gap-6">
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Box className="w-4 h-4" /> Collections
            </h3>
            <div className="space-y-2">
              {collections.map(col => (
                <button
                  key={col.id}
                  onClick={() => setActiveCollection(col.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg text-sm transition-all",
                    activeCollection === col.id
                      ? "bg-lime-500/10 text-lime-400 border border-lime-500/20"
                      : "text-zinc-400 hover:bg-zinc-900 border border-transparent"
                  )}
                >
                  <span className="font-medium">{col.name}</span>
                  <span className="text-xs font-mono opacity-60">{(col.count / 1000).toFixed(0)}k</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1" />

          <div className="bg-black border border-zinc-800 rounded-lg p-4 text-sm text-zinc-400">
            <h4 className="font-semibold text-zinc-300 mb-2">Namespace Mapping</h4>
            <p className="text-xs leading-relaxed">
              Dewey facets restrict search space before ANN search runs. E.g., searching within `794.81.1` pre-filters out 80% of vectors.
            </p>
          </div>
        </div>

        {/* Right side - 2D Vector Projection (t-SNE/UMAP mockup) */}
        <div className="flex-1 relative bg-[#020202]">
          {/* Grid lines */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(#222 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />

          <div className="absolute inset-4 border border-zinc-800/50 rounded-2xl bg-black/40 backdrop-blur-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <Search className="w-4 h-4 text-lime-400" />
                UMAP Projection (2D Approximation)
              </h3>
              <span className="text-xs text-zinc-500 font-mono">Showing {entities.length} nodes</span>
            </div>

            <div className="flex-1 relative p-10">
               {entities.map((entity, i) => {
                 const x = entity.vector_2d ? entity.vector_2d[0] : (i * 15) % 80 + 10;
                 const y = entity.vector_2d ? entity.vector_2d[1] : (i * 23) % 80 + 10;

                 const colorClass =
                   entity.type === 'Mod' ? 'bg-lime-400 shadow-lime-400/50' :
                   entity.type === 'DependencyEdge' ? 'bg-amber-400 shadow-amber-400/50' :
                   'bg-purple-400 shadow-purple-400/50';

                 return (
                   <motion.div
                     key={entity.id}
                     initial={{ opacity: 0, scale: 0 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: i * 0.05 }}
                     className="absolute group"
                     style={{ left: `${x}%`, top: `${y}%` }}
                   >
                     {/* The Dot */}
                     <div className={cn("w-3 h-3 rounded-full shadow-lg transition-transform hover:scale-150 cursor-pointer relative z-10", colorClass)} />

                     {/* Label on Hover */}
                     <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 w-max max-w-xs">
                       <div className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs py-1.5 px-3 rounded-md shadow-2xl">
                         <div className="font-semibold mb-0.5">{entity.canonical.name || entity.id}</div>
                         <div className="text-[10px] text-zinc-500 font-mono">Dewey: {entity.dewey_code}</div>
                       </div>
                     </div>
                   </motion.div>
                 )
               })}

               {/* Simulated Clusters / Centroids */}
               {activeCollection === 'descriptions' && (
                 <>
                   <div className="absolute top-[25%] left-[20%] w-40 h-40 border border-lime-500/20 bg-lime-500/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                     <span className="text-lime-500/30 text-xs font-mono uppercase tracking-widest font-semibold">Performance</span>
                   </div>
                   <div className="absolute top-[80%] left-[30%] w-32 h-32 border border-lime-500/20 bg-lime-500/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                     <span className="text-lime-500/30 text-xs font-mono uppercase tracking-widest font-semibold">Shaders</span>
                   </div>
                   <div className="absolute top-[20%] left-[80%] w-36 h-36 border border-lime-500/20 bg-lime-500/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
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
