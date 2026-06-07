import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Music, 
  Sparkles, 
  Volume2, 
  Zap, 
  Sliders, 
  RefreshCw, 
  Check, 
  AlertTriangle,
  HelpCircle,
  Clock,
  AudioLines
} from 'lucide-react';

interface AudioOrchestratorProps {
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'thinking') => void;
}

export default function AudioOrchestrator({ addLog }: AudioOrchestratorProps) {
  // Web Audio Context reference
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Sequencer playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [volume, setVolume] = useState(70); // 0-100
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [selectedStyle, setSelectedStyle] = useState<string>('lofi');
  
  // Synth Waveform & Filter settings
  const [oscWaveform, setOscWaveform] = useState<'sine' | 'square' | 'sawtooth' | 'triangle'>('sine');
  const [filterFreq, setFilterFreq] = useState(800);
  
  // SFX Synth controls
  const [sfxSweepSpeed, setSfxSweepSpeed] = useState(4.0); // duration in s
  const [sfxDistortion, setSfxDistortion] = useState(10);
  const [sfxFreq, setSfxFreq] = useState(150);

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiOrchestrating, setIsAiOrchestrating] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  // Step sequencer grid representation: 4 tracks (Kick, Snare, Hi-Hat, Synth-Bass) x 8 steps
  const [grid, setGrid] = useState<Record<string, number[]>>({
    kick:  [1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 1, 0, 0, 0, 1, 0],
    hihat: [1, 1, 0, 1, 1, 1, 0, 1],
    bass:  [1, 0, 1, 0, 1, 0, 1, 0],
  });

  // Track label helpers
  const TRACKS = [
    { key: 'kick', name: '🥁 Kick Drum (Analog Synth)', color: '#F27D26' },
    { key: 'snare', name: '💥 Snare Hit (Noise Pop)', color: '#FFAC4D' },
    { key: 'hihat', name: '✨ Hi-Hat Tick (Metal Cap)', color: '#55D282' },
    { key: 'bass', name: '🎸 Synth-Bass (Sub Pulse)', color: '#3BA3FF' },
  ];

  // Clock tracking variables for scheduling
  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const timerIdRef = useRef<number | null>(null);

  // Init Audio Context on first interaction
  const initAudioContext = () => {
    if (!audioCtxRef.current) {
        // Create browser audio context
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtxClass();
        addLog("Web Audio composition engine initialized.", "success");
    }
    if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
    }
  };

  // Preset Beat loader
  const applyPresetBeat = (preset: string) => {
    setSelectedStyle(preset);
    let newGrid = { ...grid };
    let newBpm = 120;
    let newWave: typeof oscWaveform = 'sine';
    let newFreq = 800;

    switch (preset) {
      case 'trap':
        newBpm = 140;
        newWave = 'sawtooth';
        newFreq = 1400;
        newGrid = {
          kick:  [1, 0, 0, 1, 0, 1, 0, 0],
          snare: [0, 0, 1, 0, 0, 0, 1, 0],
          hihat: [1, 1, 1, 1, 1, 1, 1, 1],
          bass:  [1, 0, 0, 1, 0, 0, 1, 0]
        };
        break;
      case 'lofi':
        newBpm = 85;
        newWave = 'sine';
        newFreq = 450;
        newGrid = {
          kick:  [1, 0, 0, 0, 1, 0, 0, 0],
          snare: [0, 0, 1, 0, 0, 0, 1, 0],
          hihat: [1, 0, 1, 0, 1, 0, 1, 0],
          bass:  [1, 0, 1, 0, 0, 1, 0, 1]
        };
        break;
      case 'minimal':
        newBpm = 120;
        newWave = 'triangle';
        newFreq = 650;
        newGrid = {
          kick:  [1, 0, 0, 0, 1, 0, 0, 0],
          snare: [0, 0, 0, 0, 1, 0, 0, 0],
          hihat: [1, 0, 1, 0, 1, 0, 1, 0],
          bass:  [1, 1, 1, 1, 0, 0, 0, 0]
        };
        break;
      case 'suspense':
        newBpm = 100;
        newWave = 'square';
        newFreq = 300;
        newGrid = {
          kick:  [1, 0, 0, 0, 1, 0, 0, 0],
          snare: [0, 0, 0, 1, 0, 0, 0, 0],
          hihat: [1, 0, 0, 0, 1, 0, 0, 0],
          bass:  [1, 1, 0, 0, 1, 1, 0, 0]
        };
        break;
    }

    setGrid(newGrid);
    setBpm(newBpm);
    setOscWaveform(newWave);
    setFilterFreq(newFreq);
    addLog(`Applied sound style archetype: "${preset.toUpperCase()}"`, "info");
  };

  // Toggle interactive grids
  const toggleStep = (trackKey: string, stepIdx: number) => {
    initAudioContext();
    setGrid(prev => {
      const nextArr = [...prev[trackKey]];
      nextArr[stepIdx] = nextArr[stepIdx] === 1 ? 0 : 1;
      return { ...prev, [trackKey]: nextArr };
    });
  };

  // Synthesize instruments dynamically
  const playSynthesizedSound = (instrument: string, time: number) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    
    // Create master volume node
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime((volume / 100) * 0.4, time);
    masterGain.connect(ctx.destination);

    // KICK SYNTHESIZER
    if (instrument === 'kick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);

      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
      
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);

      osc.start(time);
      osc.stop(time + 0.2);
    } 
    
    // SNARE SYNTHESIZER (White Noise simulation)
    else if (instrument === 'snare') {
      // Noise buffer creator
      const bufferSize = ctx.sampleRate * 0.15; // 0.15 seconds
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Add highpass filter to noise source to sound snappy
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      noise.start(time);
      noise.stop(time + 0.16);

      // Add a small synth tone under the snare for punch
      const toneOsc = ctx.createOscillator();
      const toneGain = ctx.createGain();
      toneOsc.frequency.setValueAtTime(180, time);
      toneGain.gain.setValueAtTime(0.3, time);
      toneGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

      toneOsc.connect(toneGain);
      toneGain.connect(masterGain);
      toneOsc.start(time);
      toneOsc.stop(time + 0.09);
    } 
    
    // HI-HAT SYNTHESIZER (Short metallic bandpass pulse)
    else if (instrument === 'hihat') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.value = 8000;

      osc.type = 'square';
      osc.frequency.setValueAtTime(10000, time);

      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(time);
      osc.stop(time + 0.06);
    } 
    
    // DYNAMIC OSC BASS SYNTHESIZER
    else if (instrument === 'bass') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lpFilter = ctx.createBiquadFilter();

      osc.type = oscWaveform;
      // Root C1 = 65.4 Hz or G1 = 49 Hz
      osc.frequency.setValueAtTime(55, time); // A1 note
      
      // Pitch ramp bend
      osc.frequency.linearRampToValueAtTime(55, time + 0.1);

      lpFilter.type = 'lowpass';
      lpFilter.frequency.setValueAtTime(filterFreq, time);

      gain.gain.setValueAtTime(0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

      osc.connect(lpFilter);
      lpFilter.connect(gain);
      gain.connect(masterGain);

      osc.start(time);
      osc.stop(time + 0.28);
    }
  };

  // Sequencer loop Scheduler
  useEffect(() => {
    if (!isPlaying) {
      setActiveStep(-1);
      return;
    }

    const intervalMs = 25; // poll rapidly for scheduler accuracy
    const scheduleAheadTime = 0.1; // 100ms look-ahead

    const scheduleNextNote = () => {
      // Seconds per beat (quarter notes)
      const secondsPerBeat = 60.0 / bpm;
      // Steps are sixteenth notes or eighth notes (we treat 8 steps as 1/8 notes)
      const stepDuration = secondsPerBeat * 0.5;

      while (nextNoteTimeRef.current < audioCtxRef.current!.currentTime + scheduleAheadTime) {
        const schedTime = nextNoteTimeRef.current;
        const currentStep = currentStepRef.current;

        // Play active cells
        if (grid.kick[currentStep] === 1) playSynthesizedSound('kick', schedTime);
        if (grid.snare[currentStep] === 1) playSynthesizedSound('snare', schedTime);
        if (grid.hihat[currentStep] === 1) playSynthesizedSound('hihat', schedTime);
        if (grid.bass[currentStep] === 1) playSynthesizedSound('bass', schedTime);

        // Schedule step state update in react sync with playback clock
        const stepToHighlight = currentStep;
        setTimeout(() => {
          if (isPlaying) {
            setActiveStep(stepToHighlight);
          }
        }, Math.max(0, (schedTime - audioCtxRef.current!.currentTime) * 1000));

        // Advance step
        currentStepRef.current = (currentStep + 1) % 8;
        nextNoteTimeRef.current += stepDuration;
      }
    };

    // Prepare first node time
    nextNoteTimeRef.current = audioCtxRef.current!.currentTime;
    currentStepRef.current = 0;

    const intervalId = setInterval(scheduleNextNote, intervalMs);
    return () => clearInterval(intervalId);
  }, [isPlaying, bpm, grid, oscWaveform, filterFreq, volume]);

  // Handle Play toggle
  const handlePlayToggle = () => {
    initAudioContext();
    if (isPlaying) {
      setIsPlaying(false);
      setActiveStep(-1);
      addLog("Audio composition loop paused.", "info");
    } else {
      setIsPlaying(true);
      addLog("Starting beat orchestrator loop...", "info");
    }
  };

  // SFX Synth Engines (Synthesized sound sweeps on demand)
  const triggerSFX = (type: 'swoosh' | 'riser' | 'bass-drop' | 'chime') => {
    initAudioContext();
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime((volume / 100) * 0.45, now);
    masterGain.connect(ctx.destination);

    addLog(`Synthesizing custom SFX compound: "${type.toUpperCase()}"`, "info");

    switch (type) {
      case 'swoosh': {
        // High tension sweep ideal for instant transition cuts
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(sfxFreq, now);
        osc.frequency.exponentialRampToValueAtTime(12000, now + 0.4 * sfxSweepSpeed);

        filter.type = 'bandpass';
        filter.frequency.value = 1500;
        filter.Q.value = sfxDistortion / 2;

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.8, now + 0.15 * sfxSweepSpeed);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4 * sfxSweepSpeed);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.41 * sfxSweepSpeed);
        break;
      }
      case 'riser': {
        // Dramatic pitch builder to elevate anticipation during dynamic stake-bridges
        const osc = ctx.createOscillator();
        const lp = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.linearRampToValueAtTime(800, now + 2.0 * sfxSweepSpeed);

        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(200, now);
        lp.frequency.exponentialRampToValueAtTime(4000, now + 2.0 * sfxSweepSpeed);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.7, now + 1.8 * sfxSweepSpeed);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0 * sfxSweepSpeed);

        osc.connect(lp);
        lp.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 2.01 * sfxSweepSpeed);
        break;
      }
      case 'bass-drop': {
        // Cinematic subwoofer-rattling drop drop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(sfxFreq + 50, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 1.5 * sfxSweepSpeed);

        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5 * sfxSweepSpeed);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 1.51 * sfxSweepSpeed);
        break;
      }
      case 'chime': {
        // Pleasant digital bells pop
        const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio chord
        chords.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          
          gain.gain.setValueAtTime(0.3, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.6);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.61);
        });
        break;
      }
    }
  };

  // ARPEGGIATOR MELODY COMPOSITION ENGINE (Intros & Outros)
  const triggerArpeggiatorTheme = (preset: 'majesty' | 'tech-noir' | 'retro') => {
    initAudioContext();
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime((volume / 100) * 0.35, now);
    masterGain.connect(ctx.destination);

    addLog(`Composing intro chord arpeggio Theme: "${preset.toUpperCase()}"`, "info");

    let melody: number[] = [];
    let oscType: typeof oscWaveform = 'sine';
    let speed = 0.12;

    if (preset === 'majesty') {
      melody = [220, 277.18, 329.63, 440, 554.37, 659.25, 880]; // A major build-up
      oscType = 'triangle';
    } else if (preset === 'tech-noir') {
      melody = [196, 233.08, 293.66, 392, 466.16, 587.33, 783.99]; // G minor tension chord
      oscType = 'sawtooth';
      speed = 0.15;
    } else {
      melody = [261.63, 311.13, 392, 523.25, 622.25, 783.99]; // C minor 35mm retro aesthetic
      oscType = 'square';
      speed = 0.18;
    }

    melody.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lp = ctx.createBiquadFilter();

      osc.type = oscType;
      osc.frequency.setValueAtTime(freq, now + idx * speed);

      lp.type = 'lowpass';
      lp.frequency.value = filterFreq;

      gain.gain.setValueAtTime(0.4, now + idx * speed);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * speed + 0.8);

      osc.connect(lp);
      lp.connect(gain);
      gain.connect(masterGain);

      osc.start(now + idx * speed);
      osc.stop(now + idx * speed + 0.85);
    });
  };

  // AI Orchestration (Prompters API parsing to sequence state directly)
  const handleAiOrchestration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    initAudioContext();
    setIsAiOrchestrating(true);
    setAiExplanation(null);
    addLog(`Instructing Gemini Synthesizer pilot to arrange recipe for: "${aiPrompt}"`, "thinking");

    try {
      const response = await fetch('/api/generate-music-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim() })
      });

      if (!response.ok) {
        throw new Error(`Synthesizer request throttled with status: ${response.status}`);
      }

      const data = await response.json();
      
      // Load configuration directly to State
      if (data.tempo) setBpm(data.tempo);
      if (data.style) setSelectedStyle(data.style);
      if (data.oscillatorType) setOscWaveform(data.oscillatorType as any);
      if (data.filterCutoff) setFilterFreq(data.filterCutoff);
      if (data.grid) {
        setGrid({
          kick: data.grid.kick || grid.kick,
          snare: data.grid.snare || grid.snare,
          hihat: data.grid.hihat || grid.hihat,
          bass: data.grid.bass || grid.bass
        });
      }
      if (data.explanation) {
        setAiExplanation(data.explanation);
      }

      addLog(`Gemini synthesis structure arranged: "${data.soundDescription || 'Custom layout'}" in ${data.tempo} BPM.`, "success");

    } catch (err: any) {
      addLog(`Failed to compile AI musical notation dynamically: ${err.message}`, "warning");
    } finally {
      setIsAiOrchestrating(false);
    }
  };

  return (
    <div className="bg-[#0A0A0A] border border-[#222] min-h-[450px] overflow-hidden flex flex-col h-full shadow-lg">
      
      {/* Header Info Area */}
      <div className="bg-[#0F0F0F] px-8 py-4 border-b border-[#222] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AudioLines className="w-5 h-5 text-[#F27D26]" />
          <div>
            <h4 className="font-extrabold text-[12px] uppercase text-zinc-100 tracking-widest">04 . Video Sound & Music Orchestrator</h4>
            <p className="text-[10px] text-[#777] uppercase tracking-wide">High-Retention Sound Effects Synth & Interactive Beat Sequencer</p>
          </div>
        </div>

        {/* Global Level Control */}
        <div className="flex items-center gap-3.5 bg-[#0A0A0A] border border-[#222] px-4 py-2">
          <Volume2 className="w-4 h-4 text-[#888]" />
          <span className="text-[10px] font-mono text-zinc-500 font-extrabold uppercase select-none">Volume:</span>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-20 accent-[#F27D26] h-1 bg-[#222] rounded-none appearance-none cursor-pointer"
          />
          <span className="text-[10px] font-mono text-zinc-300 font-extrabold">{volume}%</span>
        </div>
      </div>

      {/* Main Grid panel split side layout */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 overflow-y-auto">
        
        {/* Left Column (8 cols): Step sequencer instruments & Play controllers */}
        <div className="xl:col-span-8 p-6 lg:p-8 border-b xl:border-b-0 xl:border-r border-[#222] space-y-6">
          
          {/* Controls header */}
          <div className="bg-[#0E0E0E] p-4 border border-[#222] flex flex-wrap items-center justify-between gap-4">
            
            {/* Play-Pause controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayToggle}
                className={`flex items-center gap-2 font-extrabold text-[11px] uppercase tracking-widest py-2.5 px-6 rounded-none cursor-pointer select-none transition-all ${
                  isPlaying 
                    ? 'bg-amber-950/30 border border-amber-500/30 text-[#F27D26]' 
                    : 'bg-[#F27D26] hover:bg-white text-black border border-[#F27D26] hover:border-white'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-[#F27D26] stroke-[#F27D26]" /> : <Play className="w-3.5 h-3.5 fill-black" />}
                <span>{isPlaying ? 'Pause Tracker' : 'Play Beat Loop'}</span>
              </button>

              <div className="flex items-center gap-2 bg-[#050505] border border-[#222] px-3.5 py-1.5 h-9">
                <Clock className="w-3.5 h-3.5 text-[#555]" />
                <span className="text-[10px] font-mono text-zinc-500 font-extrabold">Tempo:</span>
                <input 
                  type="range" 
                  min="60" 
                  max="180" 
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="w-16 accent-[#F27D26] h-1 bg-[#222] appearance-none cursor-pointer"
                />
                <span className="text-[10px] font-mono font-black text-white w-8 text-right">{bpm} BPM</span>
              </div>
            </div>

            {/* Presets Archetypes */}
            <div className="flex items-center gap-2 bg-[#050505] border border-[#222] px-3 py-1 bg-opacity-40">
              <span className="text-[9px] font-mono font-extrabold text-[#777] uppercase">PRESETS:</span>
              <select
                value={selectedStyle}
                onChange={(e) => applyPresetBeat(e.target.value)}
                className="bg-[#0A0A0A] border border-[#222] text-[#AAA] hover:text-white text-[9px] font-mono font-extrabold px-3 py-1.5 outline-none cursor-pointer uppercase tracking-wider rounded-none"
              >
                <option value="lofi">🎙️ Docu-Lofi Retro (85 BPM)</option>
                <option value="trap">🔥 Retention Trap Core (140 BPM)</option>
                <option value="minimal">📘 Minimal Swiss Docu (120 BPM)</option>
                <option value="suspense">🌌 Cinematic Science Suspense (100 BPM)</option>
              </select>
            </div>
          </div>

          {/* Step Sequencer Interface */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pointer-events-none pb-1 border-b border-[#222]/30">
              <span className="text-[9px] font-mono font-extrabold text-zinc-500 uppercase">Multi-Track Sequencer</span>
              <div className="flex gap-1.5 pr-2">
                {[...Array(8)].map((_, i) => (
                  <span 
                    key={i} 
                    className={`w-10 text-center font-mono text-[9px] font-extrabold select-none ${
                        activeStep === i ? 'text-[#F27D26] font-black' : 'text-zinc-600'
                    }`}
                  >
                    STEP 0{i + 1}
                  </span>
                ))}
              </div>
            </div>

            {/* Instrument Tracks */}
            <div className="space-y-3">
              {TRACKS.map((track) => {
                const stepHits = grid[track.key] || [];

                return (
                  <div key={track.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0E0E0E]/40 border border-[#222]/60 p-3 hover:border-[#222] transition-colors">
                    
                    {/* Track Labels */}
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full pointer-events-none" 
                        style={{ backgroundColor: track.color }}
                      ></div>
                      <span className="text-[10px] font-serif tracking-wider font-extrabold text-zinc-300">
                        {track.name}
                      </span>
                    </div>

                    {/* Step grid buttons */}
                    <div className="flex gap-1.5">
                      {stepHits.map((hit, stepIdx) => {
                        const isHit = hit === 1;
                        const isCurrent = activeStep === stepIdx;

                        return (
                          <button
                            key={stepIdx}
                            onClick={() => toggleStep(track.key, stepIdx)}
                            className={`w-10 h-10 border transition-all cursor-pointer rounded-none relative flex items-center justify-center ${
                              isHit 
                                ? 'bg-zinc-800 border-zinc-200 hover:bg-zinc-700' 
                                : 'bg-[#050505] border-[#1D1D1D] hover:border-[#333]'
                            }`}
                            style={{
                              borderColor: isCurrent ? track.color : undefined,
                              boxShadow: (isCurrent && isHit) ? `0 0 10px ${track.color}40` : undefined
                            }}
                          >
                            {/* Inner Trigger visual dot */}
                            {isHit && (
                              <div 
                                className="w-3.5 h-3.5 transform rotate-45 border"
                                style={{ 
                                  backgroundColor: isCurrent ? '#FFFFFF' : track.color,
                                  borderColor: isCurrent ? track.color : 'transparent'
                                }}
                              ></div>
                            )}

                            {/* Flash line on beat beat */}
                            {isCurrent && (
                              <div 
                                className="absolute bottom-0 left-0 right-0 h-0.5"
                                style={{ backgroundColor: track.color }}
                              ></div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Synthesis engine params */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3.5 border-t border-[#222]/30">
              
              {/* Oscillator selector */}
              <div className="bg-[#0E0E0E] p-4 border border-[#222]">
                <label className="text-[9px] font-mono font-extrabold text-[#777] uppercase block mb-2.5">
                  🎷 Sub-bass synthesizer wave shape (Continuous)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['sine', 'triangle', 'sawtooth', 'square'] as const).map((wt) => (
                    <button
                      key={wt}
                      onClick={() => {
                        initAudioContext();
                        setOscWaveform(wt);
                      }}
                      className={`py-2 text-[9px] font-mono font-extrabold uppercase border cursor-pointer rounded-none tracking-widest transition-all ${
                        oscWaveform === wt 
                          ? 'bg-zinc-900 border-[#F27D26] text-[#F27D26] font-bold' 
                          : 'border-[#222] text-[#666] hover:text-white'
                      }`}
                    >
                      {wt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lowpass cutoff slider */}
              <div className="bg-[#0E0E0E] p-4 border border-[#222] flex flex-col justify-between">
                <div className="flex justify-between items-center text-[9px] font-mono font-extrabold uppercase">
                  <span className="text-[#777]">⚡ Synth filter cutoff frequency</span>
                  <span className="text-zinc-200">{filterFreq} Hz</span>
                </div>
                <input 
                  type="range" 
                  min="200" 
                  max="2000" 
                  step="50"
                  value={filterFreq}
                  onChange={(e) => {
                    initAudioContext();
                    setFilterFreq(Number(e.target.value));
                  }}
                  className="w-full accent-[#F27D26] h-1 bg-[#222] appearance-none cursor-pointer my-2"
                />
                <p className="text-[9px] text-[#555] uppercase leading-relaxed font-mono">
                  Controls the warmth and brightness of the bass lines during playback loops.
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column (4 cols): Cinematic Sound Effects Composer & AI prompt pilot */}
        <div className="xl:col-span-4 p-6 lg:p-8 space-y-6 bg-[#0B0B0B]/40">
          
          {/* Section: AI Pilot */}
          <div className="space-y-3">
            <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-[#F27D26] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI prompt Sound Orchestrator</span>
            </span>

            <form onSubmit={handleAiOrchestration} className="bg-[#0E0E0E] border border-[#222] p-4 space-y-3">
              <p className="text-[9px] text-[#777] uppercase leading-relaxed font-mono">
                Give Gemini a design direction (e.g., "fast high-retention dark tension suspense" or "lofi organic ticking chill"), and watch it draft beat tracks and synthesis filters dynamically.
              </p>

              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Majestic dark tech theme with punchy snaps and clean low frequency sine bass..."
                disabled={isAiOrchestrating}
                className="w-full bg-[#050505] p-3 text-xs leading-relaxed text-zinc-300 border border-[#222] outline-none focus:border-[#F27D26] min-h-[75px] font-mono uppercase text-[10px]"
              />

              <button
                type="submit"
                disabled={isAiOrchestrating || !aiPrompt.trim()}
                className="w-full py-2.5 bg-[#F27D26] hover:bg-white text-black font-extrabold text-[10px] uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40"
              >
                {isAiOrchestrating ? 'Arranging sound design parameters...' : 'Arrange with AI pilot'}
              </button>
            </form>

            {aiExplanation && (
              <div className="bg-[#101412] p-3.5 border border-emerald-900/30 text-[10px] italic leading-relaxed text-emerald-300 font-mono">
                <strong>Gemini logic:</strong> {aiExplanation}
              </div>
            )}
          </div>

          {/* Section: Sound Effects (SFX) Composition */}
          <div className="space-y-3.5 pt-4 border-t border-[#222]/50">
            <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-zinc-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>High-Retention Video SFX</span>
            </span>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => triggerSFX('swoosh')}
                  className="py-3 bg-[#111] hover:bg-[#1C1C1C] text-zinc-300 font-mono text-[9px] uppercase font-bold border border-[#222] hover:border-[#333] tracking-widest text-center cursor-pointer transition-all"
                  title="Whip transition sound trigger"
                >
                  💨 Whip Swoosh
                </button>
                <button
                  onClick={() => triggerSFX('riser')}
                  className="py-3 bg-[#111] hover:bg-[#1C1C1C] text-zinc-300 font-mono text-[9px] uppercase font-bold border border-[#222] hover:border-[#333] tracking-widest text-center cursor-pointer transition-all"
                  title="Dynamic tension builder"
                >
                  📈 Anticipation Riser
                </button>
                <button
                  onClick={() => triggerSFX('bass-drop')}
                  className="py-3 bg-[#111] hover:bg-[#1C1C1C] text-zinc-300 font-mono text-[9px] uppercase font-bold border border-[#222] hover:border-[#333] tracking-widest text-center cursor-pointer transition-all"
                  title="Deep cinematic rumble"
                >
                  🔊 Sub Bass Drop
                </button>
                <button
                  onClick={() => triggerSFX('chime')}
                  className="py-3 bg-[#111] hover:bg-[#1C1C1C] text-zinc-300 font-mono text-[9px] uppercase font-bold border border-[#222] hover:border-[#333] tracking-widest text-center cursor-pointer transition-all"
                  title="Bright arpeggio notification chord"
                >
                  🔔 Retro Chime
                </button>
              </div>

              {/* Adjust SFX knobs */}
              <div className="bg-[#0E0E0E] p-4.5 border border-[#222] space-y-3.5">
                <span className="text-[8px] font-mono font-extrabold text-[#777] uppercase block border-b border-[#222] pb-1">
                  SFX Composition Controls
                </span>

                <div className="space-y-2">
                  {/* SFX Pitch sweep dial */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[8px] font-mono text-zinc-400 uppercase font-bold">
                      <span>Sweep Duration speed</span>
                      <span className="text-zinc-500 font-mono">{sfxSweepSpeed.toFixed(1)}s</span>
                    </div>
                    <input 
                      type="range" 
                      min="1.0" 
                      max="6.0" 
                      step="0.5"
                      value={sfxSweepSpeed}
                      onChange={(e) => setSfxSweepSpeed(Number(e.target.value))}
                      className="w-full accent-[#F27D26] h-1 bg-[#222] appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Base pitch */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[8px] font-mono text-zinc-400 uppercase font-bold">
                      <span>Root Base Pitch center</span>
                      <span className="text-zinc-500 font-mono">{sfxFreq} Hz</span>
                    </div>
                    <input 
                      type="range" 
                      min="50" 
                      max="350" 
                      step="10"
                      value={sfxFreq}
                      onChange={(e) => setSfxFreq(Number(e.target.value))}
                      className="w-full accent-[#F27D26] h-1 bg-[#222] appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Intro Chord composer presets */}
          <div className="space-y-3 pt-4 border-t border-[#222]/50">
            <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-zinc-400 flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Intro melodies compiler</span>
            </span>
            <div className="space-y-1.5">
              <p className="text-[9px] text-[#666] uppercase leading-relaxed font-mono">
                Click to compose and sample dynamic harmonic background themes for video bumpers or intro logo splash screens:
              </p>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => triggerArpeggiatorTheme('majesty')}
                  className="py-2.5 bg-[#0A0A0A] border border-[#222] hover:border-[#F27D26]/40 hover:text-white text-zinc-400 font-mono text-[9px] uppercase font-bold text-left px-4 cursor-pointer transition-all"
                >
                  🚀 Majestic tech arpeggio (Triangle synth)
                </button>
                <button
                  onClick={() => triggerArpeggiatorTheme('tech-noir')}
                  className="py-2.5 bg-[#0A0A0A] border border-[#222] hover:border-[#F27D26]/40 hover:text-white text-zinc-400 font-mono text-[9px] uppercase font-bold text-left px-4 cursor-pointer transition-all"
                >
                  🌌 Spy documentary dark tension (Sawtooth synth)
                </button>
                <button
                  onClick={() => triggerArpeggiatorTheme('retro')}
                  className="py-2.5 bg-[#0A0A0A] border border-[#222] hover:border-[#F27D26]/40 hover:text-white text-zinc-400 font-mono text-[9px] uppercase font-bold text-left px-4 cursor-pointer transition-all"
                >
                  📀 Warm retro cinema ambient (Square synth)
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Safety warning footer banner */}
      <div className="bg-[#0A0A0A] border-t border-[#222] px-8 py-3.5 flex items-center gap-2.5 pointer-events-none select-none">
        <AlertTriangle className="w-3.5 h-3.5 text-zinc-600 animate-pulse" />
        <span className="text-[8px] font-mono text-[#555] uppercase tracking-wider">
          Synthesizer tracks are calculated live inside your sandbox's Web Audio core. Ensure tab sound permissions are enabled to monitor the output.
        </span>
      </div>

    </div>
  );
}
