/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ResearchInsight, 
  ContentPlan, 
  LogLine, 
  WorkflowPhase, 
  ScriptState 
} from './types';
import ThinkingConsole from './components/ThinkingConsole';
import ResearchSidebar from './components/ResearchSidebar';
import PlanningWorkspace from './components/PlanningWorkspace';
import ScriptWorkspace from './components/ScriptWorkspace';
import { Play, Sparkles, BookOpen, FileText, CheckCircle, Flame, Server } from 'lucide-react';

export default function App() {
  // Topic input text state
  const [topic, setTopic] = useState<string>('');
  
  // Script Workspace States
  const [phase, setPhase] = useState<WorkflowPhase>('idle');
  const [research, setResearch] = useState<ResearchInsight | null>(null);
  const [selectedHookIndex, setSelectedHookIndex] = useState<number | null>(null);
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);

  // Spinners
  const [isResearchLoading, setIsResearchLoading] = useState<boolean>(false);
  const [isPlanningLoading, setIsPlanningLoading] = useState<boolean>(false);
  const [isScriptingLoading, setIsScriptingLoading] = useState<boolean>(false);

  // Load state from localStorage on init
  useEffect(() => {
    try {
      const cached = localStorage.getItem('studio_agent_state');
      if (cached) {
        const data = JSON.parse(cached);
        if (data.topic) setTopic(data.topic);
        if (data.phase) setPhase(data.phase);
        if (data.research) setResearch(data.research);
        if (data.selectedHookIndex !== undefined) setSelectedHookIndex(data.selectedHookIndex);
        if (data.plan) setPlan(data.plan);
        if (data.script) setScript(data.script);
        if (data.logs) setLogs(data.logs);
      }
    } catch (e) {
      console.error("Failed to restore applet state", e);
    }
  }, []);

  // Save state helper
  const saveState = (
    currentPhase: WorkflowPhase,
    resData: ResearchInsight | null,
    hookIdx: number | null,
    planData: ContentPlan | null,
    scriptText: string | null,
    currentLogs: LogLine[]
  ) => {
    try {
      localStorage.setItem('studio_agent_state', JSON.stringify({
        topic,
        phase: currentPhase,
        research: resData,
        selectedHookIndex: hookIdx,
        plan: planData,
        script: scriptText,
        logs: currentLogs
      }));
    } catch (e) {
      console.warn("Storage write failed", e);
    }
  };

  // Log helper
  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'thinking' = 'info') => {
    const timeString = new Date().toLocaleTimeString();
    const newLog: LogLine = {
      id: Math.random().toString(36).substring(7),
      timestamp: timeString,
      message,
      type
    };
    setLogs((prev) => {
      const next = [...prev, newLog];
      // Sync on demand
      return next;
    });
  };

  // Run Phase 1: Clear prior state, query Google Search grounded insights
  const handleDeployResearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) return;

    setPhase('researching');
    setIsResearchLoading(true);
    setPlan(null);
    setScript(null);
    setSelectedHookIndex(0); // default to first hook

    const initialLogs: LogLine[] = [];
    const pushLog = (msg: string, type: 'info' | 'success' | 'warning' | 'thinking' = 'info') => {
      const time = new Date().toLocaleTimeString();
      initialLogs.push({ id: Math.random().toString(36).substring(7), timestamp: time, message: msg, type });
    };

    pushLog(`Registering creative vector: "${topic}"`, 'info');
    pushLog(`Establishing server proxy to Gemini 3.5 Flash model...`, 'thinking');
    pushLog(`Activating 'googleSearchRetrieval' tool capabilities as dynamic knowledge ground.`, 'thinking');
    setLogs(initialLogs);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server query failed with status: ${response.status}`);
      }

      const data: ResearchInsight = await response.json();
      setResearch(data);
      
      const successLogs = [...initialLogs];
      const pushSuccessLog = (msg: string, type: 'info' | 'success' | 'warning' | 'thinking') => {
        const time = new Date().toLocaleTimeString();
        successLogs.push({ id: Math.random().toString(36).substring(7), timestamp: time, message: msg, type });
      };

      pushSuccessLog(`Mining complete. Discovered ${data.facts.length} verified trending data points and ${data.hooks.length} tactical script hooks.`, 'success');
      pushSuccessLog(`Formulated global brief synthesis: "${data.rawSummary.substring(0, 100)}..."`, 'success');
      pushSuccessLog(`Citation manager indexed ${data.sources.length} active web domains.`, 'info');
      
      // Auto transition to Phase 2: Generating Content Plan
      pushSuccessLog(`Spinning up Content Strategist Agent to map the 3-part storyboard storyboard...`, 'thinking');
      setLogs(successLogs);
      setIsResearchLoading(false);

      // Trigger automatic story planning pipeline
      await generatePlanningPlan(data, successLogs);

    } catch (error: any) {
      console.error(error);
      setIsResearchLoading(false);
      setPhase('idle');
      addLog(`Failed to compile Research Index signals: ${error.message || 'Unknown network error. Confirm GEMINI_API_KEY is properly initialized.'}`, 'warning');
    }
  };

  // Deploy planning strategist
  const generatePlanningPlan = async (researchData: ResearchInsight, currentLogsState: LogLine[]) => {
    setIsPlanningLoading(true);
    
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic, 
          facts: researchData.facts, 
          hooks: researchData.hooks 
        })
      });

      if (!response.ok) {
        throw new Error(`Storyboard endpoint failed: ${response.status}`);
      }

      const data: ContentPlan = await response.json();
      setPlan(data);
      setPhase('planned');

      const nextLogs = [...currentLogsState];
      const pushLog = (msg: string, type: 'info' | 'success' | 'warning' | 'thinking') => {
        const time = new Date().toLocaleTimeString();
        nextLogs.push({ id: Math.random().toString(36).substring(7), timestamp: time, message: msg, type });
      };

      pushLog("Storyboard outline formatted successfully.", "success");
      pushLog(`- Part 1: ${data.plan[0]?.milestone || 'Intro'}`, "info");
      pushLog(`- Part 2: ${data.plan[1]?.milestone || 'Deep Dive'}`, "info");
      pushLog(`- Part 3: ${data.plan[2]?.milestone || 'Resolution'}`, "info");
      pushLog("Workflow held dynamically. Creator feedback required to write script.", "warning");

      setLogs(nextLogs);
      setIsPlanningLoading(false);
      saveState('planned', researchData, selectedHookIndex, data, null, nextLogs);

    } catch (e: any) {
      console.error(e);
      setIsPlanningLoading(false);
      addLog(`Failed to build content plan storyboard: ${e.message}`, 'warning');
    }
  };

  // Triggers regeneration of planning blocks
  const handleRegenPlan = () => {
    if (!research) return;
    addLog("Regenerating Content Storyboard based on updated research...", "thinking");
    generatePlanningPlan(research, logs);
  };

  // Run Phase 3: Compile Approved story outlines, write high retention full script
  const handleCompileScript = async () => {
    if (!research || !plan) return;

    setPhase('scripting');
    setIsScriptingLoading(true);
    addLog("Human-in-the-Loop approval registered.", "success");
    addLog("Bundling selected hooks, dynamic briefs, and structural blocks...", "info");
    addLog("Instructing Creative Youtube Writer model to write a detailed script incorporating High-Retention Frameworks.", "thinking");

    try {
      const response = await fetch('/api/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, research, plan })
      });

      if (!response.ok) {
        throw new Error(`Script compilation failed: ${response.status}`);
      }

      const data = await response.json();
      setScript(data.script);
      setPhase('completed');
      
      const nextLogs = [...logs];
      const pushLog = (msg: string, type: 'info' | 'success' | 'warning' | 'thinking') => {
        const time = new Date().toLocaleTimeString();
        nextLogs.push({ id: Math.random().toString(36).substring(7), timestamp: time, message: msg, type });
      };

      pushLog("Cinema grade script written and vetted successfully.", "success");
      pushLog("Included components: Hook (0-15s), Stake Bridge, 3 Strategic Explainer Modules, Call-To-Action, Watch Loop.", "success");
      pushLog("Ready for Studio production export.", "success");

      setLogs(nextLogs);
      setIsScriptingLoading(false);
      saveState('completed', research, selectedHookIndex, plan, data.script, nextLogs);

    } catch (e: any) {
      console.error(e);
      setPhase('planned');
      setIsScriptingLoading(false);
      addLog(`Failed to compile YouTube retention script: ${e.message}`, 'warning');
    }
  };

  const handleUpdateScript = (newScript: string) => {
    setScript(newScript);
    saveState(phase, research, selectedHookIndex, plan, newScript, logs);
  };

  const handleUpdatePlan = (newPlan: ContentPlan) => {
    setPlan(newPlan);
    saveState(phase, research, selectedHookIndex, newPlan, script, logs);
  };

  const handleResetWorkspace = () => {
    if (confirm("Reset layout workspace? All non-exported script progress will be cleared.")) {
      setTopic('');
      setPhase('idle');
      setResearch(null);
      setSelectedHookIndex(0);
      setPlan(null);
      setScript(null);
      setLogs([]);
      localStorage.removeItem('studio_agent_state');
    }
  };

  return (
    <div className="h-screen w-full bg-[#0A0A0A] text-[#E0E0E0] flex flex-col font-sans overflow-hidden select-none">
      {/* Editorial Nav Header */}
      <nav className="h-16 border-b border-[#222] flex items-center justify-between px-8 bg-[#0F0F0F] shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-6.5 h-6.5 bg-[#F27D26] rounded-none flex items-center justify-center select-none shadow">
            <div className="w-2 h-2 bg-black transform rotate-45"></div>
          </div>
          <span className="font-extrabold tracking-tight text-lg uppercase text-white">Studio.Agent</span>
        </div>

        {/* Workflow indicator layout */}
        <div className="hidden md:flex space-x-12 text-[10px] font-bold tracking-[0.2em] uppercase text-[#555]">
          <div className={`${phase === 'idle' ? 'text-[#F27D26]' : 'text-zinc-500'}`}>01 . Topic Deployed</div>
          <div className={`${phase === 'researching' || phase === 'planned' ? 'text-[#F27D26]' : 'text-zinc-500'}`}>02 . Grounded Report</div>
          <div className={`${phase === 'scripting' || phase === 'completed' ? 'text-[#F27D26]' : 'text-zinc-500'}`}>03 . Retention Studio</div>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-[9px] bg-[#1A1A1A] px-2.5 py-1 rounded-none text-[#888] border border-[#222] uppercase tracking-widest font-mono select-none">
            GEMINI 3.5 FLASH DEPLOYED
          </span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        </div>
      </nav>

      {/* Dynamic Header Input Area */}
      <header className="h-24 px-8 flex items-center justify-between bg-[#0A0A0A] border-b border-[#222]/40 shrink-0">
        <form onSubmit={handleDeployResearch} className="w-2/3 flex items-center gap-4">
          <div className="relative flex-1">
            <input 
              type="text" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={phase !== 'idle' && phase !== 'researching'}
              placeholder="e.g., The Future of Autonomous AI Agents in E-commerce" 
              className="w-full bg-transparent border-b border-[#333] py-2.5 text-xl font-light text-white focus:outline-none focus:border-[#F27D26] transition-colors placeholder-[#333] select-text font-sans"
            />
            <span className="absolute right-0 bottom-3 text-[9px] text-[#555] font-mono uppercase tracking-widest pointer-events-none select-none">Topic Context</span>
          </div>
          
          {(phase === 'idle') && (
            <button
              type="submit"
              disabled={!topic.trim() || isResearchLoading}
              className="px-6 py-3 bg-[#F27D26] text-black font-extrabold text-[10px] uppercase tracking-widest hover:bg-white transition-all duration-200 select-none shadow hover:shadow-orange-500/10 cursor-pointer disabled:opacity-50"
            >
              Start Research
            </button>
          )}
        </form>

        {/* Visual Progress Steps representation */}
        <div className="flex items-center space-x-6 text-[10px] uppercase font-bold tracking-widest">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-[#F27D26] font-bold uppercase tracking-tight mb-1">STORY ARCH PROGRESS</span>
            <div className="flex space-x-1 select-none">
              <div className={`w-8 h-1 transition-all ${phase !== 'idle' ? 'bg-[#F27D26]' : 'bg-[#333]'}`}></div>
              <div className={`w-8 h-1 transition-all ${phase === 'planned' || phase === 'completed' || phase === 'scripting' ? 'bg-[#F27D26]' : 'bg-[#333]'}`}></div>
              <div className={`w-8 h-1 transition-all ${phase === 'completed' ? 'bg-[#F27D26]' : 'bg-[#333]'}`}></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 flex overflow-hidden">
        {phase === 'idle' ? (
          <div className="flex-1 bg-[#0A0A0A] flex flex-col justify-center items-center p-8 text-center select-none">
            <div className="max-w-md space-y-6">
              <div className="inline-block p-4 bg-[#141414] border border-[#222]">
                <Sparkles className="w-8 h-8 text-[#F27D26]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-serif text-white tracking-wide italic">"Every great project begins with deep grounding structure"</h2>
                <p className="text-xs text-[#666] leading-relaxed max-w-sm mx-auto uppercase tracking-wide">
                  Formulate YouTube scripts rooted in real-time verified facts. Submit your video topic above to initiate the intelligence workflow.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex overflow-hidden">
            {/* Split layout: 1. Research Sidebar left (approx 400px width) */}
            <div className="w-[380px] shrink-0 border-r border-[#222] bg-[#0F0F0F] overflow-hidden">
              <ResearchSidebar 
                research={research}
                isLoading={isResearchLoading}
                selectedHookIndex={selectedHookIndex}
                onSelectHook={(idx) => {
                  setSelectedHookIndex(idx);
                  addLog(`Narrative anchor updated to Hook H0${idx + 1}.`, 'info');
                }}
              />
            </div>

            {/* Split layout: 2. Core approved script blocks / planner workspaces on the right (flexible) */}
            <div className="flex-1 bg-[#0A0A0A] flex flex-col overflow-hidden">
              {script ? (
                <ScriptWorkspace
                  script={script}
                  onUpdateScript={handleUpdateScript}
                  onRegenerate={() => {
                    addLog("Regenerating Cinematic YouTube Script text with Gemini API...", "thinking");
                    handleCompileScript();
                  }}
                  onReset={handleResetWorkspace}
                  isScriptingLoading={isScriptingLoading}
                />
              ) : (
                <PlanningWorkspace
                  plan={plan}
                  onUpdatePlan={handleUpdatePlan}
                  onApprove={handleCompileScript}
                  onRegenerate={handleRegenPlan}
                  isPlanningLoading={isPlanningLoading}
                  isScriptingLoading={isScriptingLoading}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Telemetry Console footer pinned strictly at the bottom */}
      <footer className="h-56 bg-[#000] border-t border-[#222] shrink-0">
        <ThinkingConsole logs={logs} onClear={() => setLogs([])} />
      </footer>
    </div>
  );
}
