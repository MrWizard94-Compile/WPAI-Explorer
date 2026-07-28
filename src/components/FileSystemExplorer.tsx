import React, { useState } from 'react';
import { ChevronRight, FileText, Folder, Database, Hash, GitCommit } from 'lucide-react';
import { FileNode } from '../types';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'motion/react';

interface ExplorerProps {
  data: FileNode;
  onSelectFile: (file: FileNode) => void;
  selectedFile: FileNode | null;
}

const getIconForType = (node: FileNode) => {
  if (node.type === 'folder') return <Folder className="w-4 h-4 text-lime-400" />;
  if (node.entity?.type === 'Mod') return <Database className="w-4 h-4 text-lime-400" />;
  if (node.entity?.type === 'Version') return <GitCommit className="w-4 h-4 text-purple-400" />;
  if (node.entity?.type === 'DependencyEdge') return <Hash className="w-4 h-4 text-amber-400" />;
  return <FileText className="w-4 h-4 text-zinc-400" />;
}

const TreeNode: React.FC<{
  node: FileNode;
  level: number;
  onSelectFile: (file: FileNode) => void;
  selectedFile: FileNode | null;
}> = ({ node, level, onSelectFile, selectedFile }) => {
  const [isOpen, setIsOpen] = useState(level < 3); // Auto-open deeper to show more initially
  const isFile = node.type === 'file';
  const isSelected = selectedFile?.path === node.path;

  return (
    <div className="w-full">
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 cursor-pointer select-none group transition-all rounded-md mx-1 my-0.5",
          isSelected ? "bg-lime-900/30 text-lime-300 ring-1 ring-lime-500/50" : "text-zinc-300 hover:bg-zinc-800/80"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          if (isFile) {
            onSelectFile(node);
          } else {
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="flex items-center justify-center w-4 h-4">
          {!isFile && (
            <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.15 }}>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
            </motion.div>
          )}
        </div>

        {getIconForType(node)}

        <span className="truncate text-sm font-medium tracking-tight flex-1">
          {node.name}
        </span>

        {node.dewey_prefix && (
          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
            {node.dewey_prefix}
          </span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {!isFile && isOpen && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden flex flex-col"
          >
            {node.children.map((child, idx) => (
              <TreeNode
                key={`${child.path}-${idx}`}
                node={child}
                level={level + 1}
                onSelectFile={onSelectFile}
                selectedFile={selectedFile}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FileSystemExplorer: React.FC<ExplorerProps> = ({ data, onSelectFile, selectedFile }) => {
  return (
    <div className="h-full overflow-y-auto bg-black pb-8 custom-scrollbar">
      <TreeNode
        node={data}
        level={0}
        onSelectFile={onSelectFile}
        selectedFile={selectedFile}
      />
    </div>
  );
};
