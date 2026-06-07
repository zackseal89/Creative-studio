import React, { useState } from 'react';
import { Eye, Code, Download, RefreshCw, FileText, Check, Undo, Save } from 'lucide-react';

interface ScriptWorkspaceProps {
  script: string | null;
  onUpdateScript: (updatedScript: string) => void;
  onRegenerate: () => void;
  onReset: () => void;
  isScriptingLoading: boolean;
}

export default function ScriptWorkspace({
  script,
  onUpdateScript,
  onRegenerate,
  onReset,
  isScriptingLoading
}: ScriptWorkspaceProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const [isCopied, setIsCopied] = useState(false);

  if (isScriptingLoading) {
    return (
      <div className="bg-[#0A0A0A] border border-[#222] rounded-none p-8 flex flex-col items-center justify-center h-full min-h-[450px]">
        <div className="w-8 h-8 rounded-sm bg-[#F27D26] flex items-center justify-center animate-spin">
          <div className="w-2.5 h-2.5 bg-black transform rotate-45"></div>
        </div>
        <div className="text-center mt-5">
          <p className="text-zinc-300 font-extrabold text-[11px] uppercase tracking-widest">Compiling Cinematic Narrative...</p>
          <p className="text-[#666] text-[10px] font-mono tracking-widest uppercase mt-1">Interlock Hook, Bridge, & Content Loop</p>
        </div>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="bg-[#0A0A0A] border border-[#222] rounded-none p-8 flex flex-col items-center justify-center text-center h-full min-h-[450px]">
        <span className="text-[#333] text-4xl mb-4 font-mono select-none">Ø</span>
        <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest">Scriptwriter Awaiting Approval</p>
        <p className="text-[#666] text-[11px] mt-2 max-w-sm leading-relaxed">
          Review and approve the creative storyboard milestones to compile the finished editorial video script.
        </p>
      </div>
    );
  }

  // Download markdown helper
  const handleDownload = () => {
    const blob = new Blob([script], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'high-retention-script.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Light markdown parser to display scripts professionally in raw Editorial style
  const renderParsedMarkdown = (md: string) => {
    const lines = md.split('\n');
    return lines.map((line, index) => {
      const trimmed = line.trim();

      // Headings
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={index} className="text-xs font-mono font-bold text-[#F27D26] mt-4 mb-2 uppercase tracking-widest pl-2 border-l border-[#F27D26]">
            {trimmed.replace('###', '').trim()}
          </h4>
        );
      }
      if (trimmed.startsWith('##')) {
        return (
          <h3 key={index} className="text-sm font-sans font-bold text-[#F27D26] mt-5 mb-2.5 uppercase tracking-wider">
            {trimmed.replace('##', '').trim()}
          </h3>
        );
      }
      if (trimmed.startsWith('#')) {
        return (
          <h2 key={index} className="text-lg font-serif italic text-white mt-8 mb-4 border-b border-[#222] pb-2 font-semibold">
            {trimmed.replace('#', '').trim()}
          </h2>
        );
      }

      // Visual / Audio split-screen direction styles
      if (trimmed.includes('[Visual:') || trimmed.includes('(Visual:') || trimmed.startsWith('Visual:')) {
        return (
          <div key={index} className="bg-[#141414] border-l-2 border-[#F27D26] p-3.5 rounded-none my-2.5 text-xs text-[#E0E0E0] font-serif italic leading-relaxed select-text flex flex-col gap-1">
            <span className="text-[#F27D26] font-sans font-extrabold text-[9px] uppercase tracking-widest">VISUAL INSTRUCTION</span>
            <span className="text-[12px] opacity-90">{trimmed.replace(/\[Visual:|\]|\(Visual:|\)/gi, '').trim()}</span>
          </div>
        );
      }

      // Voiceover dialogue style
      if (trimmed.includes('Speaker:') || trimmed.startsWith('Speaker:') || trimmed.startsWith('Narrator:')) {
        return (
          <div key={index} className="bg-[#050505]/40 p-4 border border-[#222] rounded-none my-3 text-sm leading-relaxed text-zinc-300 select-text flex flex-col gap-1.5 shadow-sm">
            <span className="text-[9px] font-bold tracking-widest text-[#F27D26] uppercase select-none">VOICEOVER DIALOGUE (HIGH RETENTION DRIVEN)</span>
            <span className="text-[13px] text-zinc-100 leading-relaxed font-serif">{trimmed.replace(/Speaker:|Narrator:/i, '').trim()}</span>
          </div>
        );
      }

      // Standard list items
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return (
          <li key={index} className="list-none pl-4 border-l border-[#333] text-zinc-400 text-xs my-2 select-text font-serif italic">
            {trimmed.substring(1).trim()}
          </li>
        );
      }

      // Default text / paragraph
      if (trimmed.length > 0) {
        return (
          <p key={index} className="text-xs text-zinc-400 font-sans font-light leading-relaxed my-3 select-text">
            {trimmed}
          </p>
        );
      }

      return <div key={index} className="h-1.5" />;
    });
  };

  return (
    <div className="bg-[#0A0A0A] border border-[#222] rounded-none overflow-hidden flex flex-col h-full shadow-sm">
      {/* Tab Header */}
      <div className="bg-[#0F0F0F] px-6 py-3 border-b border-[#222] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#F27D26] text-xs">●</span>
            <h3 className="font-extrabold text-[11px] text-zinc-100 uppercase tracking-widest">03 . Script Board</h3>
          </div>
          
          {/* Toggles */}
          <div className="bg-[#0A0A0A] p-0.5 rounded-none border border-[#222] flex items-center gap-0.5">
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold tracking-widest uppercase rounded-none transition-all cursor-pointer ${
                viewMode === 'preview' 
                  ? 'bg-[#F27D26] text-black' 
                  : 'text-[#666] hover:text-[#AAA]'
              }`}
            >
              <span>Studio View</span>
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold tracking-widest uppercase rounded-none transition-all cursor-pointer ${
                viewMode === 'raw' 
                  ? 'bg-[#F27D26] text-black' 
                  : 'text-[#666] hover:text-[#AAA]'
              }`}
            >
              <span>Markdown Source</span>
            </button>
          </div>
        </div>

        {/* Copy / Export controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-none border text-[10px] uppercase tracking-widest font-extrabold cursor-pointer transition-all ${
              isCopied ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'border-[#222] text-[#666] hover:text-white hover:border-[#333]'
            }`}
          >
            <span>{isCopied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 bg-[#F27D26] hover:bg-white text-black font-extrabold text-[10px] uppercase tracking-widest py-1.5 px-4 rounded-none cursor-pointer transition-all border border-[#F27D26] hover:border-white"
            title="Export to Markdown script document"
          >
            <Download className="w-3.5 h-3.5 shrink-0 text-black" />
            <span>Export to Studio</span>
          </button>
        </div>
      </div>

      {/* Main Workspace content */}
      <div className="flex-1 p-8 overflow-y-auto bg-[#0A0A0A] scrollbar-thin">
        {viewMode === 'raw' ? (
          <textarea
            value={script}
            onChange={(e) => onUpdateScript(e.target.value)}
            className="w-full h-full min-h-[400px] bg-[#050505] border border-[#222] rounded-none p-5 text-xs font-mono text-[#AAA] leading-relaxed outline-none focus:border-[#F27D26] transition-colors scrollbar-thin"
            placeholder="Edit script in raw markdown format..."
          />
        ) : (
          <div className="max-w-2xl mx-auto space-y-5 select-text font-serif leading-relaxed text-[#CCC]">
            {renderParsedMarkdown(script)}
          </div>
        )}
      </div>

      {/* Footer workspace triggers */}
      <div className="bg-[#0F0F0F] px-6 py-4 border-t border-[#222] flex items-center justify-between">
        <button
          onClick={onReset}
          className="text-[#555] hover:text-[#CCC] text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-colors"
        >
          <span>← Reset Workspace</span>
        </button>

        <button
          onClick={onRegenerate}
          className="flex items-center gap-1.5 bg-[#1A1A1A] border border-[#222] hover:border-[#F27D26]/70 hover:text-white text-[#666] font-extrabold text-[10px] uppercase tracking-widest py-2.5 px-4 rounded-none cursor-pointer transition-all"
        >
          <RefreshCw className="w-3 h-3 shrink-0" />
          <span>Regen Video Script</span>
        </button>
      </div>
    </div>
  );
}
