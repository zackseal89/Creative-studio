import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Eye, 
  Code, 
  Download, 
  RefreshCw, 
  Check, 
  Sparkles, 
  Copy, 
  Film, 
  HelpCircle, 
  Image as ImageIcon, 
  ChevronRight, 
  Layers, 
  Monitor, 
  Smartphone, 
  Tv,
  Volume2,
  Play,
  Square
} from 'lucide-react';

interface ScriptWorkspaceProps {
  script: string | null;
  onUpdateScript: (updatedScript: string) => void;
  onRegenerate: (tone: string) => void;
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
  const [viewMode, setViewMode] = useState<'preview' | 'raw' | 'prompts'>('preview');
  const [isCopied, setIsCopied] = useState(false);
  const [selectedTone, setSelectedTone] = useState<string>('Informative/Documentary');
  
  // TTS State variables
  const [playingDialogueIdx, setPlayingDialogueIdx] = useState<number | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('Zephyr'); // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleSpeakDialogue = async (text: string, index: number) => {
    // If already playing this line, stop or pause it
    if (playingDialogueIdx === index) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      window.speechSynthesis.cancel();
      setPlayingDialogueIdx(null);
      return;
    }

    // Stop current animations or voices
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }
    window.speechSynthesis.cancel();
    setPlayingDialogueIdx(index);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: selectedVoice })
      });
      
      const data = await res.json();
      if (!res.ok || data.useBrowserSpeech || data.error) {
        throw new Error(data.error || "Engagement limit reached - engaging browser speech synthesized engine.");
      }

      // Base64 audio playback
      const base64Audio = data.audio;
      const binary = atob(base64Audio);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const blobUrl = URL.createObjectURL(blob);

      const audio = new Audio(blobUrl);
      activeAudioRef.current = audio;
      audio.play();

      audio.onended = () => {
        setPlayingDialogueIdx(null);
        URL.revokeObjectURL(blobUrl);
      };
      audio.onerror = () => {
        setPlayingDialogueIdx(null);
        URL.revokeObjectURL(blobUrl);
      };

    } catch (err) {
      console.warn("Server TTS redirected to speech synthesis: ", err);
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        if (selectedVoice === 'Puck' || selectedVoice === 'Charon') {
          const maleVoice = voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('google us english') || v.name.toLowerCase().includes('microsoft david'));
          if (maleVoice) utterance.voice = maleVoice;
        } else {
          const femaleVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('google uk english female') || v.name.toLowerCase().includes('zira'));
          if (femaleVoice) utterance.voice = femaleVoice;
        }
      }
      
      utterance.rate = 1.05;
      utterance.pitch = selectedVoice === 'Puck' ? 0.9 : selectedVoice === 'Kore' ? 1.15 : 1.0;
      
      utterance.onend = () => {
        setPlayingDialogueIdx(null);
      };
      utterance.onerror = () => {
        setPlayingDialogueIdx(null);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Clean play on unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) activeAudioRef.current.pause();
      window.speechSynthesis.cancel();
    };
  }, []);
  
  // States for Prompt Hub
  const [enhancedPrompts, setEnhancedPrompts] = useState<Record<string, string>>({});
  const [enhancingStatus, setEnhancingStatus] = useState<Record<string, boolean>>({});
  const [styleModifiers, setStyleModifiers] = useState<Record<string, string>>({});
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // Parse visuals dynamically
  const extractedVisuals = useMemo(() => {
    if (!script) return [];
    const lines = script.split('\n');
    const list: { id: string; originalText: string; index: number }[] = [];
    let idx = 1;
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.includes('[Visual:') || trimmed.includes('(Visual:') || trimmed.startsWith('Visual:')) {
        const clean = trimmed.replace(/\[Visual:|\]|\(Visual:|\)/gi, '').trim();
        if (clean && clean.length > 0) {
          list.push({
            id: `V0${idx}`,
            originalText: clean,
            index: idx,
          });
          idx++;
        }
      }
    });
    return list;
  }, [script]);

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

  // Enhance a single visual instruction via Backend Gemini API
  const handleEnhancePrompt = async (vId: string, originalText: string) => {
    const modifier = styleModifiers[vId] || 'cinematic';
    setEnhancingStatus(prev => ({ ...prev, [vId]: true }));
    try {
      const response = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          promptText: modifier !== 'none' 
            ? `[Style: ${modifier}] ${originalText}` 
            : originalText 
        })
      });
      const data = await response.json();
      if (data.enhancedPrompt) {
        setEnhancedPrompts(prev => ({ ...prev, [vId]: data.enhancedPrompt }));
      }
    } catch (err) {
      console.error("Enhancement failure:", err);
    } finally {
      setEnhancingStatus(prev => ({ ...prev, [vId]: false }));
    }
  };

  const handleCopyPromptText = (vId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptId(vId);
    setTimeout(() => setCopiedPromptId(null), 2500);
  };

  // Pre-expand all prompts in one batch
  const handleEnhanceAll = async () => {
    extractedVisuals.forEach(async (v) => {
      if (!enhancedPrompts[v.id]) {
        await handleEnhancePrompt(v.id, v.originalText);
      }
    });
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
        const dialogText = trimmed.replace(/Speaker:|Narrator:/i, '').trim();
        const isCurrentlyPlaying = playingDialogueIdx === index;

        return (
          <div key={index} className="bg-[#050505]/40 p-4 border border-[#222] rounded-none my-3 text-sm leading-relaxed text-zinc-300 select-text flex flex-col gap-2.5 shadow-sm relative group">
            <div className="flex items-center justify-between pointer-events-none select-none">
              <span className="text-[9px] font-bold tracking-widest text-[#F27D26] uppercase">VOICEOVER DIALOGUE (HIGH RETENTION DRIVEN)</span>
              
              {/* Animated Waveform when playing line */}
              {isCurrentlyPlaying && (
                <div className="flex items-center gap-0.5 h-3">
                  <div className="w-[1.5px] bg-[#F27D26] h-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.6s' }}></div>
                  <div className="w-[1.5px] bg-[#F27D26] h-[60%] animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.5s' }}></div>
                  <div className="w-[1.5px] bg-[#F27D26] h-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.7s' }}></div>
                  <div className="w-[1.5px] bg-[#F27D26] h-[30%] animate-bounce" style={{ animationDelay: '450ms', animationDuration: '0.4s' }}></div>
                </div>
              )}
            </div>

            <div className="flex items-start justify-between gap-4">
              <span className="text-[13px] text-zinc-100 leading-relaxed font-serif flex-1">{dialogText}</span>
              
              {/* Trigger TTS voice */}
              <button
                onClick={() => handleSpeakDialogue(dialogText, index)}
                className={`py-1.5 px-3 border border-[#222] group-hover:border-[#F27D26]/40 hover:border-[#F27D26] bg-[#0A0A0A] text-[9px] font-mono font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer text-[#888] hover:text-white transition-colors shrink-0 ${
                  isCurrentlyPlaying ? 'border-[#F27D26] text-[#F27D26]' : ''
                }`}
                title="Synthesize and play speech narration"
              >
                {isCurrentlyPlaying ? (
                  <>
                    <Square className="w-2.5 h-2.5 fill-[#F27D26] text-[#F27D26]" />
                    <span>Mute</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3 text-[#555] group-hover:text-[#F27D26]" />
                    <span>Speak Line</span>
                  </>
                )}
              </button>
            </div>
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
    <div className="bg-[#0A0A0A] border border-[#222] rounded-none overflow-hidden flex flex-col h-full shadow-sm relative">
      {/* Tab Header with dynamic switches */}
      <div className="bg-[#0F0F0F] px-6 py-3 border-b border-[#222] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#F27D26] text-xs animate-pulse">●</span>
            <h3 className="font-extrabold text-[11px] text-zinc-100 uppercase tracking-widest">03 . Script Board</h3>
          </div>
          
          {/* Main Toggles */}
          <div className="bg-[#0A0A0A] p-0.5 rounded-none border border-[#222] flex items-center gap-0.5">
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold tracking-widest uppercase rounded-none transition-all cursor-pointer ${
                viewMode === 'preview' 
                  ? 'bg-[#F27D26] text-black font-extrabold' 
                  : 'text-[#666] hover:text-[#AAA]'
              }`}
            >
              <span>Studio View</span>
            </button>
            
            <button
              onClick={() => setViewMode('prompts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold tracking-widest uppercase rounded-none transition-all cursor-pointer relative ${
                viewMode === 'prompts' 
                  ? 'bg-[#F27D26] text-black font-extrabold' 
                  : 'text-[#666] hover:text-[#AAA]'
              }`}
            >
              <span>Image Prompts</span>
              {extractedVisuals.length > 0 && (
                <span className={`text-[8px] font-mono px-1 rounded-sm ml-1 ${viewMode === 'prompts' ? 'bg-black text-[#F27D26]' : 'bg-[#222] text-[#888]'}`}>
                  {extractedVisuals.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setViewMode('raw')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold tracking-widest uppercase rounded-none transition-all cursor-pointer ${
                viewMode === 'raw' 
                  ? 'bg-[#F27D26] text-black font-extrabold' 
                  : 'text-[#666] hover:text-[#AAA]'
              }`}
            >
              <span>Markdown Source</span>
            </button>
          </div>

          {/* Unified Voice Selection Mode */}
          <div className="flex items-center gap-2 bg-[#0A0A0A]/60 border border-[#222]/80 px-2.5 py-1 text-[9px] font-mono">
            <Volume2 className="w-3.5 h-3.5 text-[#F27D26]" />
            <span className="text-[#666] uppercase font-bold">Voice:</span>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="bg-transparent text-zinc-300 font-extrabold text-[9px] outline-none border-none cursor-pointer uppercase tracking-widest"
            >
              <option value="Zephyr" className="bg-[#0A0A0A]">Zephyr (Spirited Lady)</option>
              <option value="Kore" className="bg-[#0A0A0A]">Kore (Professional Reporter)</option>
              <option value="Puck" className="bg-[#0A0A0A]">Puck (Fast Tech Vlog)</option>
              <option value="Charon" className="bg-[#0A0A0A]">Charon (Deep Documentary)</option>
              <option value="Fenrir" className="bg-[#0A0A0A]">Fenrir (High-Impact Epic)</option>
            </select>
          </div>
        </div>

        {/* Copy / Export controls */}
        <div className="flex items-center gap-2">
          {viewMode === 'prompts' && extractedVisuals.length > 0 && (
            <button
              onClick={handleEnhanceAll}
              className="flex items-center gap-1.5 border border-[#333] hover:border-[#F27D26] text-[#A0A0A0] hover:text-white font-extrabold text-[10px] uppercase tracking-widest py-1.5 px-3 rounded-none cursor-pointer transition-all"
              title="Expand all visual placeholders in background"
            >
              <Sparkles className="w-3 h-3 text-[#F27D26]" />
              <span>Enhance All</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-none border text-[10px] uppercase tracking-widest font-extrabold cursor-pointer transition-all ${
              isCopied ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'border-[#222] text-[#666] hover:text-white hover:border-[#333]'
            }`}
          >
            <span>{isCopied ? 'Copied' : 'Copy Script'}</span>
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
      <div className="flex-1 p-5 md:p-8 overflow-y-auto bg-[#0A0A0A] scrollbar-thin">
        {viewMode === 'raw' ? (
          <textarea
            value={script}
            onChange={(e) => onUpdateScript(e.target.value)}
            className="w-full h-full min-h-[400px] bg-[#050505] border border-[#222] rounded-none p-5 text-xs font-mono text-[#AAA] leading-relaxed outline-none focus:border-[#F27D26] transition-colors scrollbar-thin"
            placeholder="Edit script in raw markdown format..."
          />
        ) : viewMode === 'preview' ? (
          <div className="max-w-2xl mx-auto space-y-5 select-text font-serif leading-relaxed text-[#CCC]">
            {renderParsedMarkdown(script)}
          </div>
        ) : (
          /* Visual Prompts Manager Hub */
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Promo Header banner */}
            <div className="bg-[#111] border border-[#222] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#F27D26]" />
                  <h4 className="font-extrabold text-xs uppercase tracking-widest text-zinc-100">Cinematic Image Prompt Enhancer</h4>
                </div>
                <p className="text-[10px] text-[#777] uppercase tracking-wide leading-relaxed">
                  We scanned your script and isolated <strong className="text-zinc-300 font-bold">{extractedVisuals.length} visual cues</strong>. Use the selectors below to choose an aesthetic modifier and compile elite direct image prompts for Midjourney / DALL-E / Imagen.
                </p>
              </div>
            </div>

            {extractedVisuals.length === 0 ? (
              <div className="border border-dashed border-[#222] p-12 text-center text-zinc-600 space-y-3">
                <ImageIcon className="w-8 h-8 text-[#444] mx-auto animate-pulse" />
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#888]">No standard `[Visual: ...]` tags found in script.</p>
                <p className="text-[9px] uppercase tracking-wider text-[#555]">
                  Make sure visual placeholders are framed with square brackets or prefixed with "Visual:" in raw editor so they index properly.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {extractedVisuals.map((visual) => {
                  const modifier = styleModifiers[visual.id] || 'cinematic';
                  const enhancedText = enhancedPrompts[visual.id];
                  const isEnhancing = enhancingStatus[visual.id];
                  const hasCopied = copiedPromptId === visual.id;

                  return (
                    <div 
                      key={visual.id} 
                      className="bg-[#0E0E0E] border border-[#222] hover:border-[#333] transition-colors p-5 flex flex-col gap-4 relative"
                    >
                      {/* Card meta row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#222]/50">
                        <div className="flex items-center gap-2">
                          <span className="w-10 h-5 bg-[#1F1F1F] text-zinc-400 font-mono text-[9px] flex items-center justify-center font-bold tracking-widest pointer-events-none uppercase">
                            {visual.id}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase">
                            SCENE SEGMENT #{visual.index}
                          </span>
                        </div>

                        {/* Style Select Mode */}
                        <div className="flex items-center gap-2">
                          <label className="text-[9px] font-mono font-extrabold text-[#666] uppercase">MODIFIER:</label>
                          <select 
                            value={modifier}
                            onChange={(e) => setStyleModifiers(prev => ({ ...prev, [visual.id]: e.target.value }))}
                            className="bg-[#050505] border border-[#222] text-[#999] hover:text-white text-[9px] font-mono font-extrabold px-2 py-1 outline-none transition-colors cursor-pointer uppercase tracking-wider rounded-none"
                          >
                            <option value="cinematic">🎬 Photorealistic Film (85mm)</option>
                            <option value="chiaroscuro">🌗 Dark Chiaroscuro (Volumetric)</option>
                            <option value="cyber">🪐 Neon Cyberpunk Noir</option>
                            <option value="vector">📐 Minimal Swiss Vector Art</option>
                            <option value="macro">🔍 Extreme Macro Detail (Tactile)</option>
                            <option value="warm-retro">🎞️ Warm Retro Film (35mm Grain)</option>
                            <option value="none">⚙️ Raw (No Style Filter)</option>
                          </select>
                        </div>
                      </div>

                      {/* Content side-by-side or stacked split */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left: Original Instruction from Storyboard */}
                        <div className="space-y-1 bg-[#050505] p-3 border border-[#1A1A1A]">
                          <span className="text-[8px] font-mono text-[#F27D26] uppercase font-bold tracking-widest block">Original Script visual</span>
                          <p className="text-xs text-zinc-400 leading-relaxed font-serif italic select-text select-all">
                            "{visual.originalText}"
                          </p>
                        </div>

                        {/* Right: Enhanced Promption Space */}
                        <div className="space-y-1.5 relative min-h-[90px] flex flex-col justify-between">
                          <div className="space-y-1">
                            <span className="text-[8px] font-mono text-[#55D282] uppercase font-bold tracking-widest flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-[#55D282]" />
                              <span>Image Generation Prompt (Ready for Copy)</span>
                            </span>
                            
                            {isEnhancing ? (
                              <div className="py-4 flex flex-col items-center justify-center gap-1">
                                <RefreshCw className="w-4 h-4 text-[#F27D26] animate-spin" />
                                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-extrabold animate-pulse">Expanding sensory detail...</span>
                              </div>
                            ) : enhancedText ? (
                              <p className="text-xs text-zinc-200 leading-relaxed font-mono select-text select-all bg-[#080B09]/80 border border-emerald-950/40 p-3 rounded-none">
                                {enhancedText}
                              </p>
                            ) : (
                              <p className="text-[11px] text-zinc-500 leading-relaxed font-mono italic p-3">
                                Detailed b-roll directions have been set in background settings. Click "Enhance" to expand into an ultra-realistic cinematic render prompt.
                              </p>
                            )}
                          </div>

                          {/* Quick copy controls */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222]/30">
                            {enhancedText ? (
                              <button
                                onClick={() => handleCopyPromptText(visual.id, enhancedText)}
                                className={`flex items-center gap-1 px-3 py-1 text-[9px] font-mono uppercase font-bold border cursor-pointer transition-all rounded-none ${
                                  hasCopied 
                                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                                    : 'border-[#222] text-zinc-400 hover:text-white hover:bg-zinc-900'
                                }`}
                              >
                                {hasCopied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3 text-zinc-500" />}
                                <span>{hasCopied ? 'COPIED TO CLIPBOARD' : 'COPY COMPOSITE PROMPT'}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEnhancePrompt(visual.id, visual.originalText)}
                                className="flex items-center gap-1.5 px-3 py-1 border border-[#F27D26]/40 hover:border-[#F27D26] text-[#F27D26] hover:text-white bg-[#F27D26]/5 font-mono text-[9px] uppercase font-bold cursor-pointer transition-all rounded-none"
                              >
                                <Sparkles className="w-3 h-3 animate-pulse" />
                                <span>ENHANCE WITH GEMINI</span>
                              </button>
                            )}

                            {/* Option to copy raw anyway if not enhanced */}
                            {!enhancedText && (
                              <button
                                onClick={() => handleCopyPromptText(visual.id, visual.originalText)}
                                className="flex items-center gap-1 px-2.5 py-1 border border-[#222] text-zinc-500 hover:text-zinc-300 font-mono text-[9px] uppercase font-bold cursor-pointer transition-all rounded-none"
                                title="Copy original raw instruction text"
                              >
                                <Copy className="w-3 h-3 text-zinc-600" />
                                <span>COPY RAW</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Prompting instruction sheet */}
            <div className="bg-[#0A0A0A] border border-[#222] p-5 space-y-3.5">
              <div className="flex items-center gap-1.5 border-b border-[#222] pb-2">
                <HelpCircle className="w-4 h-4 text-zinc-400" />
                <h5 className="font-extrabold text-[10px] uppercase text-zinc-300 tracking-widest font-sans">Aesthetic Aspect Ratio & Engine Cheat Sheet</h5>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[9px] text-zinc-500">
                <div className="space-y-1.5 p-3 bg-[#0E0E0E] border border-[#1C1C1C]">
                  <div className="flex items-center gap-2 text-zinc-400 font-extrabold pb-1 border-b border-[#222]">
                    <Tv className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>YOUTUBE (16:9)</span>
                  </div>
                  <p className="leading-relaxed uppercase">
                    Add parameter <strong className="text-zinc-300">`--ar 16:9`</strong> at the end of your prompt for standard widescreen b-roll video graphics.
                  </p>
                </div>

                <div className="space-y-1.5 p-3 bg-[#0E0E0E] border border-[#1C1C1C]">
                  <div className="flex items-center gap-2 text-zinc-400 font-extrabold pb-1 border-b border-[#222]">
                    <Smartphone className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>SHORTS & REELS (9:16)</span>
                  </div>
                  <p className="leading-relaxed uppercase">
                    Add parameter <strong className="text-zinc-300">`--ar 9:16`</strong> for vertical smartphone layouts, optimized for scroll-friendly platforms.
                  </p>
                </div>

                <div className="space-y-1.5 p-3 bg-[#0E0E0E] border border-[#1C1C1C]">
                  <div className="flex items-center gap-2 text-zinc-400 font-extrabold pb-1 border-b border-[#222]">
                    <Layers className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>ENGINE VERSIONING</span>
                  </div>
                  <p className="leading-relaxed uppercase">
                    Append <strong className="text-zinc-300">`--v 6.0`</strong> or specify <strong className="text-zinc-300">`raw`</strong> mode to trigger cinematic realism engines natively.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reset & Regen footer */}
      <div className="bg-[#0F0F0F] px-6 py-4 border-t border-[#222] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button
          onClick={onReset}
          className="text-[#555] hover:text-[#CCC] text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-colors"
        >
          <span>← Reset Workspace</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-extrabold text-[#666] uppercase">Script Tone:</span>
            <select
              value={selectedTone}
              onChange={(e) => setSelectedTone(e.target.value)}
              className="bg-[#050505] border border-[#222] text-[#AAA] hover:text-white text-[10px] font-mono font-extrabold px-3 py-2 outline-none transition-colors cursor-pointer uppercase tracking-wider rounded-none"
            >
              <option value="Informative/Documentary">📘 Informative / Documentary</option>
              <option value="Aggressive/Viral">🔥 Aggressive / Viral</option>
              <option value="Casual/Vlog">🎙️ Casual / Vlog</option>
            </select>
          </div>

          <button
            onClick={() => onRegenerate(selectedTone)}
            className="flex items-center gap-2 bg-[#1A1A1A] border border-[#222] hover:border-[#F27D26]/70 hover:text-white text-[#999] hover:bg-[#222] font-extrabold text-[10px] uppercase tracking-widest py-2.5 px-4 rounded-none cursor-pointer transition-all"
            title="Re-run generation with the selected tone"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-pulse text-[#F27D26]" />
            <span>Regen Script with Tone</span>
          </button>
        </div>
      </div>
    </div>
  );
}
