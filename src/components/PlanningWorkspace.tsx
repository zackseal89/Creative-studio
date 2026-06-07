import React from 'react';
import { ContentPlan, ContentPoint } from '../types';
import { Edit3, Sparkles, AlertTriangle, ArrowRight, BookOpen, RefreshCw } from 'lucide-react';

interface PlanningWorkspaceProps {
  plan: ContentPlan | null;
  onUpdatePlan: (updatedPlan: ContentPlan) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  isPlanningLoading: boolean;
  isScriptingLoading: boolean;
}

export default function PlanningWorkspace({
  plan,
  onUpdatePlan,
  onApprove,
  onRegenerate,
  isPlanningLoading,
  isScriptingLoading
}: PlanningWorkspaceProps) {
  if (isPlanningLoading) {
    return (
      <div className="bg-[#0F0F0F] border border-[#222] rounded-none p-8 flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="w-8 h-8 rounded-sm bg-[#F27D26] flex items-center justify-center animate-spin">
          <div className="w-2.5 h-2.5 bg-black transform rotate-45"></div>
        </div>
        <div className="text-center mt-4">
          <p className="text-zinc-300 font-extrabold text-[11px] uppercase tracking-widest">Integrating Narrative Blocks...</p>
          <p className="text-[#666] text-[10px] font-mono uppercase tracking-widest mt-1">Arranging facts, hooks, and milestones</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="bg-[#0F0F0F] border border-[#222] rounded-none p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <span className="text-[#333] text-4xl mb-4 font-mono select-none">Ø</span>
        <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest">Planning Stage Overrides</p>
        <p className="text-[#666] text-[11px] mt-2 max-w-sm leading-relaxed">
          Once the research agent completes its search outputs, the planning strategist will layout the 3-part storyboard blocks here.
        </p>
      </div>
    );
  }

  // Handles updating a specific point's milestone title
  const handleMilestoneChange = (index: number, value: string) => {
    const updatedPoints = [...plan.plan];
    updatedPoints[index] = { ...updatedPoints[index], milestone: value };
    onUpdatePlan({ ...plan, plan: updatedPoints });
  };

  // Handles updating a specific point's narrative/visual description
  const handleDescriptionChange = (index: number, value: string) => {
    const updatedPoints = [...plan.plan];
    updatedPoints[index] = { ...updatedPoints[index], description: value };
    onUpdatePlan({ ...plan, plan: updatedPoints });
  };

  // Handles updating creative brief
  const handleBriefChange = (value: string) => {
    onUpdatePlan({ ...plan, brief: value });
  };

  return (
    <div className="bg-[#0F0F0F] border border-[#222] rounded-none overflow-hidden flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="bg-[#0A0A0A] px-6 py-4 border-b border-[#222] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#F27D26] text-xs">●</span>
          <h3 className="font-extrabold text-[11px] text-zinc-100 uppercase tracking-[0.2em]">02 . Creator Storyboard</h3>
        </div>
        <span className="text-[9px] bg-[#1A1A1A] px-2 py-0.5 rounded-sm border border-[#222] text-[#888] font-bold uppercase tracking-widest">
          HUMAN APPROVED FLOW
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin select-text">
        {/* Warning Badge */}
        <div className="bg-[#141414] border-l-2 border-amber-500/80 p-4 rounded-none text-xs text-[#AAA] leading-relaxed">
          <div>
            <span className="font-bold text-[#F27D26] uppercase tracking-wider text-[10px] block mb-1">Human-in-the-Loop Hold Checklist:</span> Please review and customize the outline or visual cues. The scriptwriter agent will formulate high-retention video script blocks based strictly on this template.
          </div>
        </div>

        {/* Cohesive Brief Editor */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#666]">
            Creative Strategy & Video Persona Brief
          </label>
          <textarea
            value={plan.brief}
            onChange={(e) => handleBriefChange(e.target.value)}
            rows={3}
            className="w-full bg-[#0A0A0A] border border-[#222] hover:border-[#333] focus:border-[#F27D26]/80 rounded-none p-3.5 text-xs text-zinc-200 font-sans leading-relaxed outline-none transition-colors scrollbar-thin"
            placeholder="Edit overall video goals..."
          />
        </div>

        {/* 3 milestones blocks */}
        <div className="space-y-4">
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#666]">
            3-Part Script Roadmap Milestones
          </label>

          {plan.plan.map((point, index) => (
            <div key={index} className="bg-[#0A0A0A] border border-[#222] rounded-none p-4.5 space-y-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono font-extrabold text-[#F27D26]">
                  PART 0{index + 1}
                </span>
                <input
                  type="text"
                  value={point.milestone}
                  onChange={(e) => handleMilestoneChange(index, e.target.value)}
                  className="flex-1 bg-transparent border-b border-[#222] hover:border-[#333] focus:border-[#F27D26] text-sm font-semibold text-zinc-200 px-1 py-1.5 outline-none transition-all font-sans"
                  placeholder="Enter Section Milestone Title..."
                />
              </div>

              <div>
                <textarea
                  value={point.description}
                  onChange={(e) => handleDescriptionChange(index, e.target.value)}
                  rows={3}
                  className="w-full bg-[#111] border border-[#222] hover:border-[#333] focus:border-[#F27D26] rounded-none p-3 text-xs text-[#AAA] font-serif italic leading-relaxed outline-none transition-all scrollbar-thin"
                  placeholder="Enter b-roll visual requirements and key narration themes..."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action footer bar */}
      <div className="bg-[#0A0A0A] px-6 py-4 border-t border-[#222] flex items-center justify-between gap-4">
        <button
          onClick={onRegenerate}
          disabled={isScriptingLoading}
          className="flex items-center gap-1.5 px-4 py-3 bg-[#1A1A1A] border border-[#333] hover:border-zinc-500 hover:text-white text-[#888] rounded-none text-[10px] uppercase font-bold tracking-widest transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
          <span>Regen Plan</span>
        </button>

        <button
          onClick={onApprove}
          disabled={isScriptingLoading}
          className="flex-1 flex items-center justify-center gap-2 bg-[#F27D26] border border-[#F27D26] hover:bg-white hover:text-black hover:border-white text-black font-extrabold text-[10px] uppercase tracking-widest py-3 px-6 rounded-none shadow-sm cursor-pointer transition-all disabled:opacity-50"
        >
          {isScriptingLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>TRANSFORMING STORYBOARD TO SCRIPT...</span>
            </>
          ) : (
            <>
              <span>Compile Narrative & Write Script</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
