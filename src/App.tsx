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
import GoogleDriveExplorer from './components/GoogleDriveExplorer';
import AudioOrchestrator from './components/AudioOrchestrator';
import ImageAnalyst from './components/ImageAnalyst';
import CloudProductionManager from './components/CloudProductionManager';
import CreatorAgentChatbot from './components/CreatorAgentChatbot';
import { Play, Sparkles, BookOpen, FileText, CheckCircle, Flame, Server, Cloud, LogIn, Database, Trash2, ArrowRight, RefreshCw } from 'lucide-react';
import { auth, db, googleSignIn } from './firebase';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';

export default function App() {
  // Topic input text state
  const [topic, setTopic] = useState<string>('');
  
  // User Session Management
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [homeProjects, setHomeProjects] = useState<any[]>([]);
  const [isHomeProjectsLoading, setIsHomeProjectsLoading] = useState<boolean>(false);
  
  // Active dashboard Module
  const [activeModule, setActiveModule] = useState<'studio' | 'audio' | 'vision'>('studio');
  
  // Custom interactive steps control
  const [activeStep, setActiveStep] = useState<number>(1);
  
  // Script Workspace States
  const [phase, setPhase] = useState<WorkflowPhase>('idle');
  const [research, setResearch] = useState<ResearchInsight | null>(null);
  const [selectedHookIndex, setSelectedHookIndex] = useState<number | null>(null);
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isDriveOpen, setIsDriveOpen] = useState<boolean>(false);
  const [isCloudOpen, setIsCloudOpen] = useState<boolean>(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(true);

  // Spinners
  const [isResearchLoading, setIsResearchLoading] = useState<boolean>(false);
  const [isPlanningLoading, setIsPlanningLoading] = useState<boolean>(false);
  const [isScriptingLoading, setIsScriptingLoading] = useState<boolean>(false);

  // Elegant in-app custom confirm modal state (bypasses sandbox iframe blocked popups)
  const [customConfirm, setCustomConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setCustomConfirm({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

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

        if (data.script) {
          setActiveStep(3);
        } else if (data.plan) {
          setActiveStep(2);
        } else if (data.phase && data.phase !== 'idle') {
          setActiveStep(2);
        } else {
          setActiveStep(1);
        }
      }
    } catch (e) {
      console.error("Failed to restore applet state", e);
    }
  }, []);

  // Fetch home projects from Firestore on-demand
  const fetchHomeProjects = async (uid: string) => {
    setIsHomeProjectsLoading(true);
    try {
      const q = query(
        collection(db, "projects"),
        where("ownerId", "==", uid)
      );
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(docSnap.data());
      });
      // Sort newest updated first
      list.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt).getTime();
        const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt).getTime();
        return bTime - aTime;
      });
      setHomeProjects(list);
    } catch (err) {
      console.error("Failed to load home projects list", err);
    } finally {
      setIsHomeProjectsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr);
      if (usr) {
        fetchHomeProjects(usr.uid);
      } else {
        setHomeProjects([]);
      }
    });
    return () => unsubscribe();
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
    setActiveStep(2);

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
  const handleCompileScript = async (tone?: string) => {
    if (!research || !plan) return;

    setPhase('scripting');
    setIsScriptingLoading(true);
    addLog("Human-in-the-Loop approval registered.", "success");
    if (tone) {
      addLog(`Selected tone directive: "${tone}" style matching.`, "info");
    }
    addLog("Bundling selected hooks, dynamic briefs, and structural blocks...", "info");
    addLog(`Instructing Creative Youtube Writer model to write a detailed script with "${tone || 'Informative/Documentary'}" tone and pacing.`, "thinking");

    try {
      const response = await fetch('/api/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, research, plan, tone })
      });

      if (!response.ok) {
        throw new Error(`Script compilation failed: ${response.status}`);
      }

      const data = await response.json();
      setScript(data.script);
      setPhase('completed');
      setActiveStep(3);
      
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

  const handleCancelAndReset = () => {
    if (phase === 'idle') {
      setTopic('');
      return;
    }

    triggerConfirm(
      "Create New Brief?",
      "Are you sure you want to cancel the current session and start a fresh project? Make sure you have backed up your progress to Cloud Backups to save it forever.",
      () => {
        setTopic('');
        setPhase('idle');
        setResearch(null);
        setSelectedHookIndex(0);
        setPlan(null);
        setScript(null);
        setLogs([]);
        setActiveStep(1);
        localStorage.removeItem('studio_agent_state');
        addLog("Workspace progress completely cleared. Project initialized successfully.", "success");
      }
    );
  };

  const handleResetWorkspace = () => {
    handleCancelAndReset();
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

        {/* Workflow indicator interactive layout */}
        <div className="hidden md:flex items-center space-x-5 bg-[#0a0a0a] border border-[#222]/60 px-4 py-1.5 rounded-none font-mono text-[9px] tracking-widest uppercase">
          <span className="text-[#555] font-black mr-1 text-[8px]">STEPS NAVIGATION:</span>
          
          <button
            onClick={() => {
              if (phase !== 'idle') {
                handleCancelAndReset();
              }
            }}
            className={`transition-colors font-extrabold cursor-pointer pr-3 border-r border-[#222] ${
              phase === 'idle' ? 'text-[#F27D26]' : 'text-zinc-500 hover:text-white'
            }`}
            title="Start fresh project setup"
          >
            01. NEW BRIEF {phase === 'idle' && '●'}
          </button>
          
          <button
            onClick={() => {
              if (research || plan) {
                setActiveStep(2);
                setActiveModule('studio');
                addLog('Navigated back to Step 2: Grounded Storyboard.', 'info');
              }
            }}
            disabled={!research && !plan}
            className={`transition-colors font-extrabold cursor-pointer px-3 border-r border-[#222] disabled:opacity-30 disabled:cursor-not-allowed ${
              (phase !== 'idle' && activeStep === 2) ? 'text-[#F27D26] font-black' : 'text-zinc-500 hover:text-white'
            }`}
            title="View or Edit Ground Storyboard blocks"
          >
            02. GROUND REPORT {(phase !== 'idle' && activeStep === 2) && '●'}
          </button>
          
          <button
            onClick={() => {
              if (script) {
                setActiveStep(3);
                setActiveModule('studio');
                addLog('Navigated to Step 3: Core Screen Board screenplay.', 'info');
              }
            }}
            disabled={!script}
            className={`transition-colors font-extrabold cursor-pointer pl-3 disabled:opacity-30 disabled:cursor-not-allowed ${
              (phase !== 'idle' && activeStep === 3) ? 'text-[#F27D26] font-black' : 'text-zinc-500 hover:text-white'
            }`}
            title="View high retention YouTube script draft"
          >
            03. SCRIPT BOARD {(phase !== 'idle' && activeStep === 3) && '●'}
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {phase !== 'idle' && (
            <button 
              type="button"
              id="header-create-new-brief-btn"
              onClick={handleCancelAndReset}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-none border border-[#F27D26]/60 hover:border-[#F27D26] text-white hover:bg-[#F27D26] hover:text-black text-[10px] uppercase tracking-widest font-extrabold cursor-pointer transition-all"
              title="Cancel current workspace and start a fresh brief"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>＋ Create New Brief</span>
            </button>
          )}

          <button 
            type="button"
            onClick={() => {
              setIsDriveOpen(!isDriveOpen);
              setIsCloudOpen(false);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-none border text-[10px] uppercase tracking-widest font-extrabold cursor-pointer transition-all ${
              isDriveOpen ? 'bg-[#F27D26] border-[#F27D26] text-black' : 'border-[#222] text-[#888] hover:text-white hover:border-[#333]'
            }`}
          >
            <Cloud className={`w-3.5 h-3.5 ${isDriveOpen ? 'text-black' : 'text-[#F27D26]'}`} />
            <span>Drive Library</span>
          </button>

          <button 
            type="button"
            onClick={() => {
              setIsCloudOpen(!isCloudOpen);
              setIsDriveOpen(false);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-none border text-[10px] uppercase tracking-widest font-extrabold cursor-pointer transition-all ${
              isCloudOpen ? 'bg-[#F27D26] border-[#F27D26] text-black' : 'border-[#222] text-[#888] hover:text-white hover:border-[#333]'
            }`}
          >
            <Server className={`w-3.5 h-3.5 ${isCloudOpen ? 'text-black' : 'text-[#F27D26]'}`} />
            <span>Cloud Backups</span>
          </button>

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

        {/* Visual Progress Steps representation or Quick Session Actions */}
        <div className="flex items-center space-x-6">
          {phase !== 'idle' ? (
            <div className="flex items-center space-x-3 select-none">
              <button
                type="button"
                onClick={() => {
                  setIsCloudOpen(true);
                  setIsDriveOpen(false);
                }}
                className="px-3.5 py-2 bg-[#121212] hover:bg-[#1A1A1A] border border-[#222] text-zinc-300 hover:text-[#F27D26] font-bold text-[9px] uppercase tracking-widest flex items-center gap-2 cursor-pointer transition-colors"
                title="Open Cloud Saved Sessions & Backups"
              >
                <Server className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Sessions & Backups</span>
              </button>

              <button
                type="button"
                onClick={handleCancelAndReset}
                className="px-3.5 py-2 bg-[#1C1212] hover:bg-[#331818] border border-[#ff4d4d]/30 hover:border-[#ff4d4d]/60 text-[#ff7777] font-bold text-[9px] uppercase tracking-widest flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Cancel current workspace and start a fresh project"
              >
                <span>✕ Cancel & Fresh</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-[#F27D26] font-bold uppercase tracking-tight mb-1 font-mono">STORY ARCH PROGRESS</span>
              <div className="flex space-x-1 select-none">
                <div className="w-8 h-1 bg-[#333]"></div>
                <div className="w-8 h-1 bg-[#333]"></div>
                <div className="w-8 h-1 bg-[#333]"></div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex overflow-hidden relative">
          {phase === 'idle' ? (
            <div className="flex-grow flex flex-col md:flex-row bg-[#0A0A0A] overflow-y-auto w-full">
              {/* Left Side: Create New Brief Panel */}
              <div className="flex-1 p-8 lg:p-12 border-b md:border-b-0 md:border-r border-[#222]/40 flex flex-col justify-center max-w-2xl mx-auto">
                <div className="space-y-6">
                  <div className="inline-flex p-3.5 bg-[#141414] border border-[#222] text-[#F27D26] w-fit">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  
                  <div className="space-y-2">
                    <h1 className="text-2xl lg:text-3xl font-serif text-white tracking-tight italic">
                      "Every great project begins with deep grounding structure"
                    </h1>
                    <p className="text-xs text-[#666] leading-relaxed uppercase tracking-wider font-mono">
                      Formulate YouTube scripts rooted in real-time verified facts. Submit your video topic to initiate the workspace workflow.
                    </p>
                  </div>

                  {/* Built-in Topic Input Form on Home Page */}
                  <form onSubmit={handleDeployResearch} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block font-mono">
                        Primary Topic Brief Input
                      </label>
                      <input 
                        type="text" 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., The Future of Autonomous AI Agents in E-commerce" 
                        className="w-full bg-[#111] border border-[#222] p-3 text-sm text-white focus:outline-none focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] placeholder-[#444] transition-all font-sans"
                      />
                    </div>

                    <button
                      type="submit"
                      id="home-create-new-brief-btn"
                      disabled={!topic.trim() || isResearchLoading}
                      className="w-full py-3.5 bg-[#F27D26] hover:bg-white text-black font-extrabold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200 select-none shadow hover:shadow-orange-500/10 cursor-pointer disabled:opacity-50"
                    >
                      {isResearchLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 fill-black" />
                      )}
                      <span>＋ Create New Brief</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Side: Backups / Previous Sessions Panel */}
              <div className="w-full md:w-[420px] p-8 lg:p-12 bg-[#0C0C0C] flex flex-col justify-start border-t md:border-t-0 md:border-l border-[#222]/40 shrink-0">
                <div className="space-y-6 h-full flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-[#F27D26]" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Previous Sessions</span>
                    </div>
                    {currentUser && homeProjects.length > 0 && (
                      <button
                        onClick={() => fetchHomeProjects(currentUser.uid)}
                        className="text-[9px] text-[#888] hover:text-[#F27D26] transition-colors flex items-center gap-1 uppercase tracking-widest font-mono"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Refresh</span>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 max-h-[360px] md:max-h-none pr-1">
                    {!currentUser ? (
                      <div className="bg-[#0D0D0D] border border-[#222] p-6 text-center space-y-4">
                        <div className="w-8 h-8 bg-[#161616] border border-[#333] rounded-none flex items-center justify-center mx-auto">
                          <Database className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Cloud Storage Offline</h4>
                          <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                            Connect your Google Account to automatically load your previous production sessions and synchronize your storyboard briefs.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              addLog("Opening secure sign-in popup with Google...", "thinking");
                              const response = await googleSignIn();
                              if (response.user) {
                                addLog(`Authenticated successfully as ${response.user.displayName}`, "success");
                              }
                            } catch (err: any) {
                              addLog("Google Auth popup closed or canceled.", "warning");
                            }
                          }}
                          className="w-full py-2 px-3 bg-[#111] hover:bg-[#F27D26] text-[#F27D26] hover:text-black border border-[#F27D26]/40 hover:border-transparent text-[9px] uppercase tracking-widest font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Link Google Credentials</span>
                        </button>
                      </div>
                    ) : isHomeProjectsLoading ? (
                      <div className="py-12 text-center space-y-2">
                        <RefreshCw className="w-6 h-6 text-[#F27D26] animate-spin mx-auto animate-pulse" />
                        <p className="text-[9px] font-mono uppercase text-zinc-600 tracking-widest">Inquiring Database index...</p>
                      </div>
                    ) : homeProjects.length === 0 ? (
                      <div className="border border-dashed border-[#222] p-8 text-center text-zinc-500 text-[10px] uppercase tracking-wider font-mono">
                        No cloud backups found.<br/>
                        Start your first brief to sync progress instantly.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {homeProjects.map((proj) => (
                          <div
                            key={proj.projectId}
                            onClick={() => {
                              // Load the project
                              setTopic(proj.topic || '');
                              setPhase(proj.phase || 'idle');
                              setResearch(proj.research || null);
                              setPlan(proj.plan || null);
                              setScript(proj.script || null);
                              setLogs(proj.logs || []);
                              
                              if (proj.script) {
                                setActiveStep(3);
                              } else if (proj.plan) {
                                setActiveStep(2);
                              } else if (proj.phase && proj.phase !== 'idle') {
                                setActiveStep(2);
                              } else {
                                setActiveStep(1);
                              }

                              localStorage.setItem('studio_agent_state', JSON.stringify({
                                topic: proj.topic || '',
                                phase: proj.phase || 'idle',
                                research: proj.research || null,
                                plan: proj.plan || null,
                                script: proj.script || null,
                                logs: proj.logs || []
                              }));

                              addLog(`Synchronized with cloud project: "${proj.topic}"`, "success");
                            }}
                            className="group bg-[#0E0E0E] hover:bg-[#151515] border border-[#222] hover:border-[#F27D26]/60 p-3 flex items-start justify-between cursor-pointer transition-all duration-200 select-none"
                          >
                            <div className="space-y-1.5 min-w-0 pr-3 flex-1">
                              <h5 className="text-[10px] font-extrabold uppercase tracking-wide text-white group-hover:text-[#F27D26] transition-colors truncate">
                                {proj.topic}
                              </h5>
                              <div className="flex items-center gap-3.5 font-mono text-[8px] text-zinc-500">
                                <span className="bg-[#141414] px-1.5 py-0.5 border border-[#222] text-zinc-400 capitalize">
                                  {proj.phase}
                                </span>
                                <span>
                                  {proj.updatedAt?.toMillis
                                    ? new Date(proj.updatedAt.toMillis()).toLocaleDateString()
                                    : proj.updatedAt
                                      ? new Date(proj.updatedAt).toLocaleDateString()
                                      : 'Recently'}
                                </span>
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerConfirm(
                                  "Delete Saved Concept?",
                                  `Are you sure you want to delete the saved screenplay concept "${proj.topic}" from the cloud archive database?`,
                                  async () => {
                                    try {
                                      await deleteDoc(doc(db, "projects", proj.projectId));
                                      addLog(`Deleted archived concept file: "${proj.topic}"`, "info");
                                      if (currentUser?.uid) {
                                        fetchHomeProjects(currentUser.uid);
                                      }
                                    } catch (err: any) {
                                      addLog(`Deletion failed: ${err.message}`, "warning");
                                    }
                                  }
                                );
                              }}
                              className="text-zinc-600 hover:text-red-400 p-1 transition-colors self-center cursor-pointer"
                              title="Delete Session Backup"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                
                {/* Module switcher tab subnav */}
                <div className="bg-[#0D0D0D] border-b border-[#222] px-6 py-2.5 flex items-center justify-between shrink-0">
                  <div className="flex gap-2.5">
                    <button 
                      onClick={() => setActiveModule('studio')}
                      className={`px-4 py-1.5 text-[10px] font-extrabold tracking-widest uppercase cursor-pointer rounded-none transition-all ${
                        activeModule === 'studio' 
                          ? 'text-[#F27D26] border-b-2 border-[#F27D26] font-black' 
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      📝 Narrative Studio
                    </button>
                    <button 
                      onClick={() => setActiveModule('audio')}
                      className={`px-4 py-1.5 text-[10px] font-extrabold tracking-widest uppercase cursor-pointer rounded-none transition-all ${
                        activeModule === 'audio' 
                          ? 'text-[#F27D26] border-b-2 border-[#F27D26] font-black' 
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      🔊 Sound & SFX Composer
                    </button>
                    <button 
                      onClick={() => setActiveModule('vision')}
                      className={`px-4 py-1.5 text-[10px] font-extrabold tracking-widest uppercase cursor-pointer rounded-none transition-all ${
                        activeModule === 'vision' 
                          ? 'text-[#F27D26] border-b-2 border-[#F27D26] font-black' 
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      👁️ Storyboard Vision Analyst
                    </button>
                  </div>
                </div>

                <div className="flex-grow overflow-hidden">
                  {activeModule === 'audio' ? (
                    <AudioOrchestrator addLog={addLog} />
                  ) : activeModule === 'vision' ? (
                    <ImageAnalyst addLog={addLog} />
                  ) : (activeStep === 2 && plan) ? (
                    <PlanningWorkspace
                      plan={plan}
                      onUpdatePlan={handleUpdatePlan}
                      onApprove={() => {
                        setActiveStep(3);
                        handleCompileScript();
                      }}
                      onRegenerate={handleRegenPlan}
                      isPlanningLoading={isPlanningLoading}
                      isScriptingLoading={isScriptingLoading}
                    />
                  ) : script ? (
                    <ScriptWorkspace
                      script={script}
                      onUpdateScript={handleUpdateScript}
                      onRegenerate={(tone) => {
                        addLog(`Regenerating Cinematic YouTube Script with Gemini in "${tone}" style...`, "thinking");
                        handleCompileScript(tone);
                      }}
                      onReset={handleResetWorkspace}
                      isScriptingLoading={isScriptingLoading}
                      addLog={addLog}
                    />
                  ) : (
                    <PlanningWorkspace
                      plan={plan}
                      onUpdatePlan={handleUpdatePlan}
                      onApprove={() => {
                        setActiveStep(3);
                        handleCompileScript();
                      }}
                      onRegenerate={handleRegenPlan}
                      isPlanningLoading={isPlanningLoading}
                      isScriptingLoading={isScriptingLoading}
                    />
                  )}
                </div>

              </div>
            </div>
          )}
        </div>

        {isDriveOpen && (
          <div className="w-[340px] shrink-0 border-l border-[#222] bg-[#0F0F0F] h-full overflow-hidden relative">
            <GoogleDriveExplorer 
              currentScript={script}
              currentTopic={topic}
              onLoadScript={(derivedTopic, scriptText) => {
                setTopic(derivedTopic);
                setScript(scriptText);
                setPhase('completed');
                addLog(`Loaded production "${derivedTopic}" directly from Google Drive.`, 'success');
              }}
              addLog={addLog}
              onClose={() => setIsDriveOpen(false)}
            />
          </div>
        )}

        {isCloudOpen && (
          <div className="w-[340px] shrink-0 border-l border-[#222] bg-[#0F0F0F] h-full overflow-hidden relative">
            <CloudProductionManager 
              currentTopic={topic}
              currentPhase={phase}
              currentResearch={research}
              currentPlan={plan}
              currentScript={script}
              currentLogs={logs}
              onLoadProject={(state) => {
                setTopic(state.topic || '');
                setPhase(state.phase || 'idle');
                setResearch(state.research || null);
                setPlan(state.plan || null);
                setScript(state.script || null);
                setLogs(state.logs || []);
                if (state.script) {
                  setActiveStep(3);
                } else if (state.plan) {
                  setActiveStep(2);
                } else if (state.phase && state.phase !== 'idle') {
                  setActiveStep(2);
                } else {
                  setActiveStep(1);
                }
                // Update localStorage cache
                localStorage.setItem('studio_agent_state', JSON.stringify(state));
              }}
              onResetWorkspace={() => {
                setTopic('');
                setPhase('idle');
                setResearch(null);
                setSelectedHookIndex(0);
                setPlan(null);
                setScript(null);
                setLogs([]);
                setActiveStep(1);
                localStorage.removeItem('studio_agent_state');
              }}
              addLog={addLog}
              onClose={() => setIsCloudOpen(false)}
            />
          </div>
        )}
      </main>

      {/* Telemetry Console footer pinned strictly at the bottom */}
      <footer className={`${isConsoleOpen ? 'h-56' : 'h-10'} bg-[#000] border-t border-[#222] shrink-0 transition-all duration-300 relative`}>
        <ThinkingConsole 
          logs={logs} 
          onClear={() => setLogs([])} 
          isOpen={isConsoleOpen} 
          onToggleOpen={() => setIsConsoleOpen(!isConsoleOpen)} 
        />
      </footer>

      {/* State-synchronizing AI Core Administrator Copilot */}
      <CreatorAgentChatbot 
        topic={topic}
        setTopic={setTopic}
        phase={phase}
        setPhase={setPhase}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        activeStep={activeStep}
        setActiveStep={setActiveStep}
        script={script}
        setScript={setScript}
        research={research}
        setResearch={setResearch}
        plan={plan}
        setPlan={setPlan}
        addLog={addLog}
        currentUser={currentUser}
        handleDeployResearch={handleDeployResearch}
        handleCompileScript={handleCompileScript}
        handleCancelAndReset={handleCancelAndReset}
        logs={logs}
      />

      {/* Elegant Custom In-App Confirm modal overlay */}
      {customConfirm.isOpen && (
        <div className="fixed inset-0 min-h-screen w-screen z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0F0F0F] border border-[#222] max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#F27D26]">
                <Sparkles className="w-4 h-4 animate-pulse text-[#F27D26]" />
                <h3 className="font-extrabold text-xs uppercase tracking-[0.2em] text-white">{customConfirm.title || "Confirm Action"}</h3>
              </div>
              <p className="text-xs text-zinc-400 font-mono leading-relaxed uppercase tracking-wider">{customConfirm.message}</p>
            </div>
            
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setCustomConfirm(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-400 border border-[#222] text-[10px] tracking-widest font-extrabold uppercase transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  customConfirm.onConfirm();
                  setCustomConfirm(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-4 py-2 bg-[#F27D26] hover:bg-white text-black text-[10px] tracking-widest font-extrabold uppercase transition-all duration-200 cursor-pointer"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
