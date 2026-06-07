import React from 'react';
import { ResearchInsight } from '../types';
import { Newspaper, Flame, HelpCircle, ExternalLink, Activity, Info, Globe, Sparkles } from 'lucide-react';

interface ResearchSidebarProps {
  research: ResearchInsight | null;
  selectedHookIndex: number | null;
  onSelectHook: (index: number) => void;
  isLoading: boolean;
}

export default function ResearchSidebar({ research, selectedHookIndex, onSelectHook, isLoading }: ResearchSidebarProps) {
  if (isLoading) {
    return (
      <div className="bg-[#0F0F0F] border border-[#222] rounded-none p-6 h-full flex flex-col justify-center items-center space-y-4">
        <div className="w-8 h-8 rounded-sm bg-[#F27D26] flex items-center justify-center animate-spin">
          <div className="w-2.5 h-2.5 bg-black transform rotate-45"></div>
        </div>
        <div className="text-center">
          <p className="text-zinc-300 font-extrabold text-[11px] uppercase tracking-widest">Retrieving Live Signals...</p>
          <p className="text-[#666] text-[10px] uppercase font-mono mt-1">Mining Google Search & verifying trends</p>
        </div>
      </div>
    );
  }

  if (!research) {
    return (
      <div className="bg-[#0F0F0F] border border-[#222] rounded-none p-8 h-full flex flex-col justify-center items-center text-center">
        <span className="text-[#333] text-4xl mb-4 font-mono select-none">Ø</span>
        <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest">No Research Deployed</p>
        <p className="text-[#666] text-[11px] mt-2 max-w-[260px] leading-relaxed">
          Enter your topic context and initiate the research agent to generate search-grounded telemetry.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0F0F0F] border border-[#222] rounded-none overflow-hidden flex flex-col h-full shadow-sm">
      {/* Sidebar Header */}
      <div className="bg-[#0A0A0A] px-4 py-3.5 border-b border-[#222] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#F27D26] text-xs">●</span>
          <h3 className="font-extrabold text-[11px] text-zinc-100 uppercase tracking-[0.2em]">01 . Research Report</h3>
        </div>
        <span className="text-[9px] bg-[#1A1A1A] px-2 py-0.5 rounded-sm border border-[#222] text-[#F27D26] font-bold uppercase tracking-widest">
          LIVE SEARCH ACTIVE
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin select-text">
        {/* Research summary card */}
        <div className="bg-[#141414] p-4 rounded-none border-l-2 border-[#F27D26]">
          <p className="text-[#666] text-[10px] font-bold uppercase tracking-widest mb-1">
            Strategic Synthesis
          </p>
          <p className="text-white text-[13px] font-serif italic leading-relaxed">
            "{research.rawSummary}"
          </p>
        </div>

        {/* 5 Trending Facts */}
        <div>
          <h4 className="text-[#F27D26] font-bold text-[10px] uppercase tracking-[0.20em] mb-3">
            Top 5 Grounded Insights
          </h4>
          <div className="space-y-3">
            {research.facts.map((fact, index) => (
              <div 
                key={index} 
                className="bg-[#0A0A0A] border border-[#222] hover:border-[#333] p-3.5 rounded-none text-xs leading-relaxed text-[#AAA] flex gap-3 transition-colors duration-150"
              >
                <span className="text-[#F27D26] font-mono font-bold select-none shrink-0">
                  0{index + 1}
                </span>
                <span className="font-sans font-light text-zinc-200">{fact}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3 Controversial Hooks */}
        <div>
          <div className="mb-3">
            <h4 className="text-[#F27D26] font-bold text-[10px] uppercase tracking-[0.20em]">
              Hook Selection Matrix
            </h4>
            <p className="text-[10px] text-[#666] mt-1 font-mono uppercase tracking-wide">
              Select key hook to direct target narrative sequence:
            </p>
          </div>
          <div className="space-y-2">
            {research.hooks.map((hook, index) => {
              const isSelected = selectedHookIndex === index;
              return (
                <button
                  key={index}
                  onClick={() => onSelectHook(index)}
                  className={`w-full text-left bg-[#0A0A0A] p-3.5 rounded-none text-xs leading-relaxed flex gap-3 transition-all duration-250 border cursor-pointer group ${
                    isSelected 
                      ? 'border-[#F27D26] bg-[#141414] text-white shadow-sm' 
                      : 'border-[#222] hover:border-[#F27D26]/60 text-zinc-400'
                  }`}
                >
                  <span className={`font-mono font-bold select-none shrink-0 transition-colors ${isSelected ? 'text-[#F27D26]' : 'text-[#444] group-hover:text-[#AAA]'}`}>
                    H0{index + 1}
                  </span>
                  <div className="flex-1">
                    <p className={`font-serif ${isSelected ? 'text-white font-medium' : 'text-[#999] group-hover:text-zinc-100'}`}>{hook}</p>
                    {isSelected && (
                      <span className="inline-block mt-2 text-[9px] bg-[#1A1A1A] px-1.5 py-0.5 border border-[#333] font-bold tracking-widest text-[#F27D26] uppercase">
                        ✓ ACTIVE NARRATIVE ANCHOR
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sources with Citations */}
        <div>
          <h4 className="text-[#666] font-bold text-[10px] uppercase tracking-[0.20em] mb-2.5 flex items-center gap-1.5">
            <span>Verified Sources</span>
          </h4>
          {research.sources.length === 0 ? (
            <p className="text-[#555] text-[10px] uppercase font-mono pl-1">Knowledge synthesis completed via local index.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {research.sources.map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 p-2.5 rounded-none bg-[#0A0A0A] hover:bg-[#141414] border border-[#222] transition-colors group"
                >
                  <span className="text-[11px] font-mono text-[#666] truncate group-hover:text-zinc-200">
                    {source.title}
                  </span>
                  <ExternalLink className="w-3 h-3 text-[#444] group-hover:text-[#F27D26] shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
