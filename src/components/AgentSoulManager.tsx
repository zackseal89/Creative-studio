import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Save, 
  FileCode, 
  FileText, 
  Sliders, 
  Wand2, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Terminal,
  HelpCircle,
  Play,
  RotateCcw,
  Check,
  Flame,
  User,
  Eye,
  Settings,
  Compass
} from 'lucide-react';

interface AgentSoulManagerProps {
  addLog: (message: string, type: 'info' | 'success' | 'warning' | 'thinking') => void;
}

const PRESETS = [
  {
    id: 'swiss-minimal',
    name: '🇨🇭 Swiss Slate Minimalist',
    description: 'Understated, objective, metrics-oriented style focusing are high-contrast Swiss typography grids and severe visual guidelines.',
    alias: 'The Curator',
    niche: 'High-end layout design, Swiss Typography, and architect level automation development.',
    banWords: 'revolutionary, absolute game-changer, crazy, groundbreaking, insane, industry-standard',
    content: `# 🎭 Creator Soul & Workspace Personalization

This file defines your agency credentials, narrative guidelines, video workflows, and AI agent guardrails. The Creator Core Copilot dynamically integrates these instructions to personalize all generated research briefs, storyboard outlines, script copy, and chatbot interactions.

---

## 👤 Channel Profile & Target Audience
- **Primary Niche:** Design aesthetics, Swiss Typography, and architect level automation development.
- **Audience Avatar:** Smart sole creators, professional agencies, and Swiss design enthusiasts.
- **Brand Identity:** High Contrast, Minimalist Swiss Editorial, Swiss Typography, Modern-Industrial Slate tones.
- **Stylistic Ban List:** Avoid low-effort hype vocabulary. Never use: "revolutionary", "game-changer", "groundbreaking", "insane", "absolute game-changer", "crazy". Use objective, structured, and factual phrasing.

## 🎬 Narrative Structuring Guidelines
1. **Physical Hook (0 - 20s):** Avoid talking about abstract code or APIs in the first 15 seconds. Instead, describe a concrete physical analogy (e.g., an empty showroom, a clock mechanics, an old ledger) paired with slow zoom cinematic instructions.
2. **Metric Proof (20s - 45s):** Provide a bold percentage or hard currency target (e.g., "34% higher retention", "$10K per month").
3. **Bento Box Visuals (45s+):** Always describe storyboards as a clean sequence of grid sections or interactive screen layouts with generous letter-spacing.

## 🧠 Personal Custom Directives
- **Host Alias / Signature:** "The Curator"
- **Terminal Execution Footprint:** If recommending automated steps, append a diagnostic identifier label (e.g. \`[SYS_LOAD: CURATOR_ACTIVE]\`).
- **Aesthetic Pairings:** When drafting hooks, always mention bold Space Grotesk headings or high-contrast slate grids.
`
  },
  {
    id: 'viral-aggressive',
    name: '🔥 High-Retention Viral Beast',
    description: 'Fast pacing rules, hyper-compelling retention loops, bold hooks, and extreme audience hooks designed to maximize click-throughs and watch time.',
    alias: 'Chief Attention Officer',
    niche: 'Viral SaaS builders, autonomous AI agency scaling models, and zero-click workflow tricks.',
    banWords: 'welcome to my channel, hit describe, today we will talk, simple introduction, basic overview',
    content: `# 🎭 Creator Soul & Workspace Personalization

This file defines your agency credentials, narrative guidelines, video workflows, and AI agent guardrails. The Creator Core Copilot dynamically integrates these instructions to personalize all generated research briefs, storyboard outlines, script copy, and chatbot interactions.

---

## 👤 Channel Profile & Target Audience
- **Primary Niche:** Viral SaaS builders, autonomous AI agency scaling models, and zero-click workflow tricks.
- **Audience Avatar:** Aggressive solo builders, viral founders, and tech-hustlers after maximum efficiency.
- **Brand Identity:** Bold High-Velocity Cyberpunk, split-screen contrast animations, neon orange accents.
- **Stylistic Ban List:** Avoid starting with general introductions. Never say: "welcome to my channel", "hit subscribe", "today we will talk about", "basic overview", "simple introduction". Start mid-crisis or mid-revelation.

## 🎬 Narrative Structuring Guidelines
1. **The Core Crisis Hook (0 - 15s):** Open immediately with a dramatic truth or high-stakes loss. Describe hyper-detailed terminal layouts or developer contracts.
2. **The Retention Loop (15s - 1m):** Tell the user exactly how their current credentials make them vulnerable in next 90 days.
3. **The Step-by-Step Delivery:** Present the action framework in logical blocks with fast pacing instructions and strict volumetric side-lighting prompts.

## 🧠 Personal Custom Directives
- **Host Alias / Signature:** "Chief Attention Officer"
- **Terminal Execution Footprint:** Append custom high-retention cues to recommendations (e.g. \`[ATTN: LOOP_DETERMINED]\`).
- **Aesthetic Pairings:** Mention high key contrast neon orange lights, fast panning screen crops, and terminal logs.
`
  },
  {
    id: 'technical-deep',
    name: '💻 Engineer & Deep Technical Dev',
    description: 'Highly analytical, command line references, raw variables, and deep architectural considerations suitable for developers and code-first engineers.',
    alias: 'Principal Systems Architect',
    niche: 'Relational database scale, Node.js edge performance, and multi-agent backend state orchestration.',
    banWords: 'easy, basic, simplified, just click here, magic, black box',
    content: `# 🎭 Creator Soul & Workspace Personalization

This file defines your agency credentials, narrative guidelines, video workflows, and AI agent guardrails. The Creator Core Copilot dynamically integrates these instructions to personalize all generated research briefs, storyboard outlines, script copy, and chatbot interactions.

---

## 👤 Channel Profile & Target Audience
- **Primary Niche:** Relational database scale, Node.js edge performance, and multi-agent backend state orchestration.
- **Audience Avatar:** Hardcore backend engineers, software architects, and systems developers.
- **Brand Identity:** Brutalist Industrial Terminal, JetBrains Mono typography, high dark slate matte tones.
- **Stylistic Ban List:** Eliminate hand-wavy explanations. Never use words like: "easy", "basic", "simplified", "magic", "black box", "just click here". Focus on underlying TCP, SQL queries, or CJS bundle characteristics.

## 🎬 Narrative Structuring Guidelines
1. **Raw Variable Entry (0 - 30s):** Describe pure workspace files structure or code configuration files instantly. Showcase standard terminal scripts on black background.
2. **Network Protocol Grounding (30s - 2m):** Explain the network payload and the exact backend route configuration.
3. **The Trace Execution:** Walk through the program loop step-by-step using precise architectural diagram prompts.

## 🧠 Personal Custom Directives
- **Host Alias / Signature:** "Principal Systems Architect"
- **Terminal Execution Footprint:** Attach full diagnostic stamps to messages (e.g. \`[SYSTEM: ARCHITECT_LOAD_STAMP_99]\`).
- **Aesthetic Pairings:** Focus on JetBrains Mono details, monospace printouts, and custom container parameters.
`
  }
];

export default function AgentSoulManager({ addLog }: AgentSoulManagerProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'structured' | 'help'>('editor');
  const [markdownContent, setMarkdownContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Structured Form States (dynamically synchronizable)
  const [formAlias, setFormAlias] = useState('The Architect');
  const [formNiche, setFormNiche] = useState('Tech-forward development and creator automation.');
  const [formBanWords, setFormBanWords] = useState('revolutionary, game-changer, insane, groundbreaking');
  const [formIdentity, setFormIdentity] = useState('Minimalist Swiss Editorial Slate Theme');

  // Load soul.md from API
  useEffect(() => {
    const fetchSoul = async () => {
      setIsLoading(true);
      setErrorStatus(null);
      try {
        const res = await fetch('/api/soul');
        if (!res.ok) {
          throw new Error(`API returned error code ${res.status}`);
        }
        const data = await res.json();
        setMarkdownContent(data.content || '');
        
        // Try parsing fields for the structured editor block
        parseFieldsFromMarkdown(data.content || '');
      } catch (err: any) {
        console.error(err);
        setErrorStatus(`Failed to read soul.md from workspace: ${err.message}`);
        addLog("Failed to sync agency soul config", "warning");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSoul();
  }, []);

  // Helper to extract values from markdown to populate structured form
  const parseFieldsFromMarkdown = (md: string) => {
    try {
      // Find Niche
      const nicheMatch = md.match(/- \*\*Primary Niche:\*\* (.*)/i);
      if (nicheMatch) setFormNiche(nicheMatch[1].trim());

      // Find Ban list
      const banMatch = md.match(/- \*\*Stylistic Ban List:\*\* (.*)/i) || md.match(/Never use: (.*)\. Use/i);
      if (banMatch) setFormBanWords(banMatch[1].replace(/["'\[\]]/g, '').trim());

      // Find Identity
      const idMatch = md.match(/- \*\*Brand Identity:\*\* (.*)/i);
      if (idMatch) setFormIdentity(idMatch[1].trim());

      // Find Alias
      const aliasMatch = md.match(/- \*\*Host Alias \/ Signature:\*\* "(.*)"/i) || md.match(/- \*\*Host Alias:\*\* "(.*)"/i);
      if (aliasMatch) setFormAlias(aliasMatch[1].trim());
    } catch (e) {
      console.warn("Could not parse all structured variables out of markdown soul:", e);
    }
  };

  // Preset Applicator
  const applyPreset = (preset: typeof PRESETS[0]) => {
    setMarkdownContent(preset.content);
    setFormAlias(preset.alias);
    setFormNiche(preset.niche);
    setFormBanWords(preset.banWords);
    setHasChanges(true);
    setSuccessMessage(`Preset "${preset.name}" loaded into editor buffers!`);
    addLog(`Loaded agent custom workspace preset: "${preset.name}"`, "info");
    
    // Auto-timeout success message
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Regress all modifications back to default loaded file
  const handleReset = async () => {
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorStatus(null);
    try {
      const res = await fetch('/api/soul');
      const data = await res.json();
      setMarkdownContent(data.content || '');
      parseFieldsFromMarkdown(data.content || '');
      setHasChanges(false);
      addLog("Reverted soul editor back to file state.", "info");
    } catch (err: any) {
      setErrorStatus(`Failed to reset: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-assemble markdown content based on structured form inputs
  const compileStructuredToMarkdown = () => {
    const formatted = `# 🎭 Creator Soul & Workspace Personalization

This file defines your agency credentials, narrative guidelines, video workflows, and AI agent guardrails. The Creator Core Copilot dynamically integrates these instructions to personalize all generated research briefs, storyboard outlines, script copy, and chatbot interactions.

---

## 👤 Channel Profile & Target Audience
- **Primary Niche:** ${formNiche}
- **Audience Avatar:** Smart professional creators, technical builders, and visual agency operators.
- **Brand Identity:** ${formIdentity}
- **Stylistic Ban List:** Avoid low-effort hype vocabulary. Never use: "${formBanWords}". Use objective, structured, and factual phrasing.

## 🎬 Narrative Structuring Guidelines
1. **Physical Hook (0 - 20s):** Avoid talking about abstract code or APIs in the first 15 seconds. Instead, describe a concrete physical analogy (e.g., an empty showroom, a clock mechanics, an old ledger) paired with slow zoom cinematic instructions.
2. **Metric Proof (20s - 45s):** Provide a bold percentage or hard currency target (e.g., "34% higher retention", "$10K per month").
3. **Bento Box Visuals (45s+):** Always describe storyboards as a clean sequence of grid sections or interactive screen layouts with generous letter-spacing.

## 🧠 Personal Custom Directives
- **Host Alias / Signature:** "${formAlias}"
- **Terminal Execution Footprint:** If recommending automated steps, append a diagnostic identifier label (e.g. \`[SYS_LOAD: ${formAlias.toUpperCase().replace(/\s+/g, '_')}_ACTIVE]\`).
- **Aesthetic Pairings:** When drafting hooks, always mention bold Space Grotesk headings or high-contrast slate grids.
`;
    setMarkdownContent(formatted);
    setHasChanges(true);
    setSuccessMessage("Form variables Compiled successfully into soul.md markdown!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Commit changes live on filesystem
  const handleSaveSoul = async () => {
    if (!markdownContent.trim()) return;
    setIsSaving(true);
    setErrorStatus(null);
    setSuccessMessage(null);
    
    addLog("Compiling and writing new personalized soul.md instructions...", "thinking");
    try {
      const res = await fetch('/api/soul', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: markdownContent })
      });

      if (!res.ok) {
        throw new Error(`Write endpoint returned status code ${res.status}`);
      }

      setHasChanges(false);
      setSuccessMessage("soul.md settings compiled and saved successfully!");
      addLog("Successfully initialized the new AI Agent Soul guidelines", "success");
      
      // Auto pulse off success message
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(`Failed to persist changes to disk: ${err.message}`);
      addLog("Save aborted: filesystem permission error", "warning");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#0A0A0A] text-[#E0E0E0] select-none font-sans overflow-hidden">
      
      {/* Left Column: Preset Templates & Quick Injectors */}
      <div className="w-full md:w-[380px] p-6 border-b md:border-b-0 md:border-r border-[#222]/40 overflow-y-auto h-full scrollbar-none flex flex-col justify-start">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#F27D26]/10 border border-[#F27D26]/35 flex items-center justify-center text-[#F27D26] rounded-none">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">AI Agents Prompt & Soul System</h2>
              <p className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">Configure system workflows and presets</p>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] p-4 p-y-3 space-y-2 text-left">
            <h3 className="text-[10px] font-extrabold text-[#F27D26] uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>What is a soul.md configuration?</span>
            </h3>
            <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
              It is a localized micro-profile that the AI Co-pilot loads dynamically before generating any suggestions or screenplays. By editing this file, you define:
            </p>
            <ul className="text-[9px] font-mono text-zinc-500 space-y-1 list-disc pl-3 leading-normal">
              <li>Your channels specific programming goals & niche</li>
              <li>A <strong className="text-zinc-300">Stylistic Ban List</strong> (e.g. no AI slogans)</li>
              <li>Custom Host Alias signatures for cinematic scripts</li>
              <li>Narrative timing benchmarks (e.g. hook specs)</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-[9px] font-black text-white uppercase tracking-wider font-mono text-left">🎭 Select Agent soul template</h3>
            <div className="grid grid-cols-1 gap-2.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="p-3 text-left bg-[#0E0E0E] hover:bg-[#141414] border border-[#222]/60 hover:border-[#F27D26]/40 transition-all duration-300 rounded-none cursor-pointer flex flex-col gap-1 items-start text-xs group"
                >
                  <p className="font-extrabold text-white group-hover:text-[#F27D26] uppercase text-[10.5px] tracking-wide leading-none">{preset.name}</p>
                  <p className="text-[9px] text-[#888] font-mono uppercase leading-tight line-clamp-1 italic">{preset.alias} • {preset.niche.split(',')[0]}...</p>
                  <p className="text-[9px] text-zinc-500 font-sans leading-normal mt-1 line-clamp-2">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[#222]/30 pt-4 flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 py-1.5 bg-[#141414] hover:bg-neutral-900 border border-[#222] text-zinc-400 hover:text-white font-bold text-[9px] uppercase tracking-widest transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Revert buffers to loaded disk files"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Revert Files</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Code Editor Space and form settings */}
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto h-full scrollbar-thin flex flex-col justify-start">
        <div className="space-y-6 h-full flex flex-col">
          
          {/* Editor Header Navigation */}
          <div className="flex items-center justify-between border-b border-[#222] pb-3 shrink-0">
            <div className="flex items-center gap-4 text-xs font-mono font-extrabold text-left select-none">
              <button 
                onClick={() => setActiveTab('editor')}
                className={`py-1 px-1 flex items-center gap-1.5 uppercase transition-colors relative cursor-pointer ${
                  activeTab === 'editor' ? 'text-[#F27D26]' : 'text-zinc-500 hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Raw soul.md Markdown</span>
                {activeTab === 'editor' && <div className="absolute -bottom-3.5 left-0 w-full h-0.5 bg-[#F27D26]"></div>}
              </button>

              <button 
                onClick={() => setActiveTab('structured')}
                className={`py-1 px-1 flex items-center gap-1.5 uppercase transition-colors relative cursor-pointer ${
                  activeTab === 'structured' ? 'text-[#F27D26]' : 'text-zinc-500 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Structured Form Variables</span>
                {activeTab === 'structured' && <div className="absolute -bottom-3.5 left-0 w-full h-0.5 bg-[#F27D26]"></div>}
              </button>

              <button 
                onClick={() => setActiveTab('help')}
                className={`py-1 px-1 flex items-center gap-1.5 uppercase transition-colors relative cursor-pointer ${
                  activeTab === 'help' ? 'text-[#F27D26]' : 'text-zinc-500 hover:text-white'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Agent CLI Commands Help</span>
                {activeTab === 'help' && <div className="absolute -bottom-3.5 left-0 w-full h-0.5 bg-[#F27D26]"></div>}
              </button>
            </div>

            {/* Quick Status indicators */}
            <div className="flex items-center gap-3">
              {hasChanges && (
                <span className="text-[8px] font-mono text-[#F27D26] tracking-widest uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#F27D26] animate-ping rounded-full"></span>
                  <span>Unsaved buffers</span>
                </span>
              )}
              <button
                onClick={handleSaveSoul}
                disabled={isSaving || isLoading}
                className="py-1 px-3.5 bg-[#F27D26] hover:bg-white text-black font-extrabold text-[10px] uppercase tracking-widest transition-all duration-300 border border-[#F27D26] hover:border-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Writing...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3" />
                    <span>Deploy Soul.md</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback Area */}
          {errorStatus && (
            <div className="bg-red-950/45 border border-red-500/35 p-3 rounded-none flex items-start gap-2 text-red-300 shrink-0 select-text">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
              <div className="font-mono text-[9px] uppercase tracking-wider leading-relaxed">{errorStatus}</div>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-none flex items-start gap-2 text-emerald-300 shrink-0">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div className="font-mono text-[9px] uppercase tracking-wider leading-normal">{successMessage}</div>
            </div>
          )}

          {/* Core Layout Tabs Content */}
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 bg-[#0E0E0E]/50 border border-[#222]">
              <RefreshCw className="w-8 h-8 text-[#F27D26] animate-spin mb-3" />
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Querying live workspace file system...</p>
            </div>
          ) : activeTab === 'editor' ? (
            <div className="flex-1 flex flex-col bg-[#050505] border border-[#222] min-h-[380px] overflow-hidden group/editor">
              <div className="p-2 bg-[#0F0F0F] border-b border-[#222]/80 flex justify-between items-center text-[8px] font-mono text-zinc-550 select-none">
                <span className="uppercase font-bold text-zinc-400">📝 Live Interactive File Editor: /src/soul.md</span>
                <span>MARKDOWN COMPATIBLE • PRESS SAVES TO COMPILE</span>
              </div>
              <div className="flex-1 flex relative">
                {/* Simulated line counts to make it feel extremely customized and high quality */}
                <div className="w-10 bg-[#080808] border-r border-[#222]/40 p-3 text-[10px] font-mono select-none text-zinc-650 text-right font-extrabold flex flex-col leading-relaxed space-y-0.5 shrink-0 select-none">
                  {[...Array(26)].map((_, i) => (
                    <span key={i} className="block">{i + 1}</span>
                  ))}
                </div>
                <textarea
                  value={markdownContent}
                  onChange={(e) => {
                    setMarkdownContent(e.target.value);
                    setHasChanges(true);
                  }}
                  className="flex-1 p-3 bg-transparent text-[#E0E0E0] text-xs font-mono leading-relaxed outline-none focus:ring-0 overflow-y-auto scrollbar-thin resize-none h-full select-text selection:bg-[#F27D26]/30"
                  placeholder="# 🎭 Custom Persona Guidelines..."
                />
              </div>
            </div>
          ) : activeTab === 'structured' ? (
            <div className="flex-1 bg-[#0E0E0E]/40 border border-[#222] p-5 space-y-6 text-left">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#F27D26]">Personalized Form Fields Generator</h3>
                <p className="text-[10px] text-zinc-500 font-mono uppercase leading-normal mt-0.5">Edit inputs to instantly compile structured code onto your soul.md markdown sheet.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Field 1: Host Alias */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#888] font-black uppercase tracking-wider font-mono">Host Alias / Executive Name</label>
                  <input
                    type="text"
                    value={formAlias}
                    onChange={(e) => setFormAlias(e.target.value)}
                    className="w-full bg-[#111] border border-[#222] p-2 text-xs text-white focus:outline-none focus:border-[#F27D26] font-mono"
                  />
                  <span className="text-[8px] text-zinc-500 font-mono tracking-wider block">Default signature used to sign off cinematic narration scripts.</span>
                </div>

                {/* Field 2: Target Brand / Niche */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#888] font-black uppercase tracking-wider font-mono">Content Niche / Profile Theme</label>
                  <input
                    type="text"
                    value={formNiche}
                    onChange={(e) => setFormNiche(e.target.value)}
                    className="w-full bg-[#111] border border-[#222] p-2 text-xs text-white focus:outline-none focus:border-[#F27D26] font-mono"
                  />
                  <span className="text-[8px] text-zinc-500 font-mono tracking-wider block">Your channels specific expertise and delivery parameters.</span>
                </div>

                {/* Field 3: Banned Words */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#888] font-black uppercase tracking-wider font-mono">Stylistic Ban List (Comma separated)</label>
                  <input
                    type="text"
                    value={formBanWords}
                    onChange={(e) => setFormBanWords(e.target.value)}
                    className="w-full bg-[#111] border border-[#222] p-2 text-xs text-white focus:outline-none focus:border-[#F27D26] font-mono"
                  />
                  <span className="text-[8px] text-zinc-500 font-mono tracking-wider block">Explicit tokens the generator will aggressively avoid to omit low-effort slop.</span>
                </div>

                {/* Field 4: Brand Identity layout */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#888] font-black uppercase tracking-wider font-mono">Visual Brand Custom Aesthetics</label>
                  <input
                    type="text"
                    value={formIdentity}
                    onChange={(e) => setFormIdentity(e.target.value)}
                    className="w-full bg-[#111] border border-[#222] p-2 text-xs text-white focus:outline-none focus:border-[#F27D26] font-mono"
                  />
                  <span className="text-[8px] text-zinc-500 font-mono tracking-wider block">Typography fonts, visual contrast parameters, or storyboard bento frames.</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#222]/50 flex justify-end">
                <button
                  type="button"
                  onClick={compileStructuredToMarkdown}
                  className="py-2.5 px-6 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] hover:border-[#F27D26] text-[10px] text-white hover:text-white font-mono font-extrabold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1"
                >
                  <Wand2 className="w-3.5 h-3.5 text-[#F27D26]" />
                  <span>Compile and Sync inputs</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-[#0E0E0E]/40 border border-[#222] p-6 space-y-6 text-left overflow-y-auto select-text">
              <div className="space-y-1">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#F27D26]">Creator Core Copilot - Action Automation CLI</h3>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest font-extrabold leading-none mt-1">Harness advanced assistant control commands</p>
              </div>

              <div className="text-[10.5px] text-zinc-300 font-sans leading-relaxed space-y-5">
                <p>
                  Because the Creator Core Copilot is configured with supreme administrator permissions over your active dashboard layout, you can instruct it inside the chat to dynamically change steps, write scripts, perform real-time search research, modify writing tones, and swap boards.
                </p>

                <p>
                  When sending statements in the chat panel, the agent will internally parse targets and append strict <strong className="text-white">ACTION</strong> parameters. The supported actions defined inside your server system are:
                </p>

                <div className="space-y-3 font-mono text-[9px] uppercase">
                  <div className="p-3 bg-black border border-[#222] space-y-1.5">
                    <p className="text-[#F27D26] font-extrabold">1. Fill Topics and start grounding search</p>
                    <p className="text-zinc-400">Syntax: <span className="text-white">"Change the topic to [topic] and start research"</span></p>
                    <p className="text-zinc-500">Resulting CMD: [ACTION: start_research Autonomous Coding Agents]</p>
                  </div>

                  <div className="p-3 bg-black border border-[#222] space-y-1.5">
                    <p className="text-[#F27D26] font-extrabold">2. Swap Screen Module Tabs</p>
                    <p className="text-zinc-400">Syntax: <span className="text-white">"Switch tabs to sound composer or vision analyst board"</span></p>
                    <p className="text-zinc-500">Resulting CMD: [ACTION: switch_module audio] or [ACTION: switch_module vision]</p>
                  </div>

                  <div className="p-3 bg-black border border-[#222] space-y-1.5">
                    <p className="text-[#F27D26] font-extrabold">3. Jump workflow process step</p>
                    <p className="text-zinc-400">Syntax: <span className="text-white">"Take me to the final scripting workspace sheet"</span></p>
                    <p className="text-zinc-500">Resulting CMD: [ACTION: navigate_step 3]</p>
                  </div>
                </div>

                <div className="p-3 bg-[#111] border border-[#222] flex items-start gap-2.5">
                  <Terminal className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                  <p className="text-[9px] leading-relaxed text-zinc-400 font-mono">
                    PRO-TIP: Try instructing the Copilot floating bubble: <strong className="text-zinc-200">"Switch board focus to raw audio loop board, then set the active topic keyword to Artificial Intelligence Agents"</strong> to witness multi-step layout transitions!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
