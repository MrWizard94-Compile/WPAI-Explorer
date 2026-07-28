import React, { useState } from 'react';
import { FileNode } from '../types';
import { FileText, Database, Code, Info, History, AlertCircle } from 'lucide-react';
import { jsonToYaml } from '../utils/yaml';
import { cn } from '../utils/cn';

interface EntityViewerProps {
  file: FileNode | null;
}

export const EntityViewer: React.FC<EntityViewerProps> = ({ file }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'provenance' | 'raw'>('preview');

  if (!file) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 bg-black">
        <Database className="w-12 h-12 mb-4 opacity-20 text-lime-500" />
        <p className="font-mono text-sm tracking-widest uppercase">Select a node from the WPAI Explorer</p>
        <p className="text-xs mt-2 opacity-50">to view its metadata matrix.</p>
      </div>
    );
  }

  const isEntity = !!file.entity;

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-lime-400" />
              {file.name}
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-1">{file.path}</p>
          </div>
          {isEntity && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-lime-500/10 text-lime-400 px-2 py-1 rounded border border-lime-500/20">
                {file.entity?.type}
              </span>
              <span className="text-xs font-mono bg-zinc-800 text-zinc-400 px-2 py-1 rounded border border-zinc-700">
                Dewey: {file.entity?.dewey_code}
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        {isEntity && (
          <div className="flex gap-1 border-b border-zinc-800/50 pb-[-1px]">
            {[
              { id: 'preview', label: 'Overview', icon: Info },
              { id: 'provenance', label: 'Provenance Matrix', icon: History },
              { id: 'raw', label: 'Raw YAML', icon: Code }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-4 py-2 text-sm font-medium flex items-center gap-2 rounded-t-md transition-colors relative",
                  activeTab === tab.id
                    ? "text-lime-400 bg-zinc-900 border-t border-l border-r border-zinc-800"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-zinc-900" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#0A0A0A] custom-scrollbar relative">
        {!isEntity ? (
          <div className="p-6 font-mono text-sm">
            <pre className="text-zinc-300">
              {file.content || <span className="text-zinc-600 italic">Binary or unsupported file content.</span>}
            </pre>
          </div>
        ) : (
          <div className="p-6">
            {activeTab === 'preview' && (
              <div className="space-y-6 max-w-3xl">
                {/* Canonical Fields visualization */}
                <div>
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Canonical Properties</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {Object.entries(file.entity!.canonical).map(([key, value]) => (
                      <div key={key} className="bg-zinc-900/50 rounded-lg border border-zinc-800/50 p-4">
                        <div className="text-xs text-zinc-500 mb-1 font-mono">{key}</div>
                        <div className="text-sm text-zinc-200">
                          {Array.isArray(value) ? (
                            <div className="flex gap-2 flex-wrap">
                              {value.map((v, i) => (
                                <span key={i} className="bg-zinc-800 px-2 py-1 rounded text-xs">{v}</span>
                              ))}
                            </div>
                          ) : (
                            String(value)
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'provenance' && (
              <div className="max-w-6xl">
                 <div className="bg-lime-500/10 border border-lime-500/20 rounded-lg p-4 flex gap-3 text-lime-200/80 text-sm mb-6">
                   <Info className="w-5 h-5 flex-shrink-0 text-lime-500" />
                   <div>
                     <p className="font-semibold text-lime-400 mb-1">Git-style Blame & Provenance</p>
                     <p>This view shows the exact source and confidence score that contributed to each canonical field, similar to <code>git blame</code>.</p>
                   </div>
                 </div>

                 <div className="border border-zinc-800 rounded-lg overflow-hidden bg-black shadow-xl">
                    <div className="grid grid-cols-12 bg-zinc-900 border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      <div className="col-span-3 px-4 py-3 border-r border-zinc-800">Field</div>
                      <div className="col-span-4 px-4 py-3 border-r border-zinc-800">Canonical Value</div>
                      <div className="col-span-5 px-4 py-3">Provenance (Blame)</div>
                    </div>

                    <div className="divide-y divide-zinc-800/50">
                      {Object.entries(file.entity!.canonical).map(([field, value], idx) => {
                        const provRecords = file.entity!.provenance[field];
                        const bestProv = provRecords && provRecords.length > 0 ? provRecords[0] : null;

                        return (
                          <div key={field} className="grid grid-cols-12 group hover:bg-zinc-900/40 transition-colors">
                            {/* Field Name */}
                            <div className="col-span-3 px-4 py-3 border-r border-zinc-800/50 flex items-center">
                              <span className="text-xs font-mono text-zinc-400 group-hover:text-lime-400 transition-colors">{field}</span>
                            </div>

                            {/* Canonical Value */}
                            <div className="col-span-4 px-4 py-3 border-r border-zinc-800/50 flex items-center">
                              <div className="text-sm text-zinc-200 truncate pr-4" title={String(value)}>
                                {Array.isArray(value) ? (
                                  <div className="flex gap-1.5 flex-wrap">
                                    {value.map((v, i) => (
                                      <span key={i} className="bg-zinc-800/80 px-2 py-0.5 rounded text-xs border border-zinc-700/50">{v}</span>
                                    ))}
                                  </div>
                                ) : (
                                  String(value)
                                )}
                              </div>
                            </div>

                            {/* Blame / Provenance */}
                            <div className="col-span-5 px-4 py-3 flex items-center justify-between">
                              {bestProv ? (
                                <>
                                  <div className="flex items-center gap-3">
                                    <span className={cn(
                                      "text-[10px] font-bold uppercase px-2 py-1 rounded",
                                      bestProv.source === 'modrinth' ? "bg-[#1bd96a]/10 text-[#1bd96a]" :
                                      bestProv.source === 'curseforge' ? "bg-[#f16436]/10 text-[#f16436]" : "bg-lime-500/10 text-lime-400"
                                    )}>
                                      {bestProv.source}
                                    </span>
                                    <span className="text-zinc-500 text-xs font-mono truncate max-w-[120px]" title={bestProv.field}>
                                      src.{bestProv.field}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2" title={`Confidence: ${(bestProv.confidence * 100).toFixed(1)}%`}>
                                    <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-lime-500 rounded-full" style={{ width: `${bestProv.confidence * 100}%` }} />
                                    </div>
                                    <span className="text-lime-400/80 text-[10px] font-mono w-6 text-right">
                                      {(bestProv.confidence * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <span className="text-zinc-600 text-xs italic">System Inferred / Default</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'raw' && (
              <div className="font-mono text-sm max-w-4xl">
                <pre className="text-lime-400">
                  {jsonToYaml(file.entity)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
