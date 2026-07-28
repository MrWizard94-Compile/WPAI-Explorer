import React, { useState, useEffect, useMemo } from 'react';
import { generateFileSystem } from './data/mockEntities';
import { FileSystemExplorer } from './components/FileSystemExplorer';
import { SmartSearchPanel } from './components/SmartSearch';
import { EntityViewer } from './components/EntityViewer';
import { VectorIndexViewer } from './components/VectorIndexViewer';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { ChatUI } from './components/ChatUI';
import { ModelSettings } from './components/ModelSettings';
import { FileNode } from './types';
import { Search, FolderTree, Hexagon, Settings, Cpu, Network, MessageSquare } from 'lucide-react';
import { cn } from './utils/cn';

type ActiveTab = 'explorer' | 'search' | 'chat' | 'vector' | 'graph' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('explorer');
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

  const fileSystem = useMemo(() => generateFileSystem(), []);

  // Pre-select a file for demonstration
  useEffect(() => {
    if (fileSystem.children && fileSystem.children.length > 0) {
      const canon = fileSystem.children.find(c => c.name === 'mc-canon');
      if (canon?.children) {
        const entities = canon.children.find(c => c.name === 'entities');
        if (entities?.children) {
          const mods = entities.children.find(c => c.name === 'Mod');
          if (mods?.children) {
            const sodiumFolder = mods.children.find(c => c.name === 'mod_sodium_001');
            if (sodiumFolder?.children) {
               setSelectedFile(sodiumFolder.children[0]);
            }
          }
        }
      }
    }
  }, [fileSystem]);

  return (
    <div className="flex h-screen w-full bg-black text-zinc-100 font-sans overflow-hidden selection:bg-lime-500/30">
      {/* Sidebar Navigation */}
      <div className="w-16 bg-[#0A0A0A] border-r border-zinc-900 flex flex-col items-center py-6 gap-6 z-10 flex-shrink-0 shadow-xl relative">
        <div className="w-10 h-10 bg-gradient-to-br from-lime-400 to-lime-600 text-black rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-lime-500/20">
          <Hexagon className="w-6 h-6 fill-white/20" />
        </div>

        <div className="flex flex-col gap-3 flex-1">
          <button
            onClick={() => setActiveTab('explorer')}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 relative group",
              activeTab === 'explorer' ? "bg-zinc-800/80 text-lime-400 shadow-sm" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
            )}
            title="Filesystem Explorer"
          >
            <FolderTree className="w-5 h-5" />
            {activeTab === 'explorer' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-lime-500 rounded-r-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 relative group",
              activeTab === 'search' ? "bg-zinc-800/80 text-lime-400 shadow-sm" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
            )}
            title="Smart Context Search"
          >
            <Search className="w-5 h-5" />
            {activeTab === 'search' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-lime-500 rounded-r-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 relative group",
              activeTab === 'chat' ? "bg-zinc-800/80 text-lime-400 shadow-sm" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
            )}
            title="AI Modding Chat Assistant"
          >
            <MessageSquare className="w-5 h-5" />
            {activeTab === 'chat' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-lime-500 rounded-r-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('vector')}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 relative group",
              activeTab === 'vector' ? "bg-zinc-800/80 text-lime-400 shadow-sm" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
            )}
            title="Vector Index & Topology"
          >
            <Cpu className="w-5 h-5" />
            {activeTab === 'vector' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-lime-500 rounded-r-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('graph')}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 relative group",
              activeTab === 'graph' ? "bg-zinc-800/80 text-lime-400 shadow-sm" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
            )}
            title="Knowledge Graph (Neo4j style)"
          >
            <Network className="w-5 h-5" />
            {activeTab === 'graph' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-lime-500 rounded-r-full" />
            )}
          </button>
        </div>

        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors mb-4 relative",
            activeTab === 'settings' ? "bg-zinc-800/80 text-lime-400 shadow-sm" : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900"
          )}
          title="Desktop Runtime Settings"
        >
          <Settings className="w-5 h-5" />
          {activeTab === 'settings' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-lime-500 rounded-r-full" />
          )}
        </button>

        <div className="text-[9px] font-mono font-bold text-zinc-600 tracking-[0.2em] -rotate-90 whitespace-nowrap mb-8 pointer-events-none opacity-50">
          WPAI STUDIO
        </div>
        <div className="absolute bottom-2 text-[6px] font-mono font-bold text-lime-500/30 tracking-widest whitespace-nowrap pointer-events-none text-center leading-tight">
          SOUL<br/>IS<br/>LAW
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'explorer' ? (
          <>
            <div className="w-80 flex-shrink-0 flex flex-col border-r border-zinc-900 bg-[#0A0A0A] shadow-2xl z-0">
              <div className="p-5 border-b border-zinc-800/50">
                <h1 className="text-sm font-semibold text-zinc-100 tracking-wide uppercase flex items-center gap-2"><span className="text-lime-400">WPAI</span> Explorer</h1>
                <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed font-mono">Wizard Productions AI Studio</p>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <FileSystemExplorer
                  data={fileSystem}
                  onSelectFile={setSelectedFile}
                  selectedFile={selectedFile}
                />
                {/* Gradient fade at bottom for style */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
              </div>
            </div>
            <div className="flex-1 min-w-0 bg-black">
              <EntityViewer file={selectedFile} />
            </div>
          </>
        ) : activeTab === 'search' ? (
          <div className="flex-1 min-w-0">
            <SmartSearchPanel />
          </div>
        ) : activeTab === 'chat' ? (
          <div className="flex-1 min-w-0">
            <ChatUI />
          </div>
        ) : activeTab === 'vector' ? (
          <div className="flex-1 min-w-0">
            <VectorIndexViewer />
          </div>
        ) : activeTab === 'graph' ? (
          <div className="flex-1 min-w-0">
            <KnowledgeGraph />
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <ModelSettings />
          </div>
        )}
      </div>
    </div>
  );
}
