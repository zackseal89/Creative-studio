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
  AudioLines,
  Mic,
  Trash2,
  FileText
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

  // Studio Workspace Modules Active Tab ('music' | 'narration' | 'sfx')
  const [activeTab, setActiveTab] = useState<'music' | 'narration' | 'sfx'>('music');

  // AI Voice & Stylized Narration pipeline states
  const [narrationText, setNarrationText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Kore'); // Kore, Puck, Charon, Fenrir, Zephyr
  const [selectedVoice2, setSelectedVoice2] = useState('Zephyr'); // Co-host Voice
  const [isDuetMode, setIsDuetMode] = useState(false);
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [isConvertingDialogue, setIsConvertingDialogue] = useState(false);
  const [generatedNarrations, setGeneratedNarrations] = useState<Array<{
    id: string;
    text: string;
    voice: string;
    timestamp: string;
    audioBase64?: string;
    isDuet?: boolean;
    voice2?: string;
  }>>([
    {
      id: "demo-narration",
      text: "Welcome to the future of digital asset automation. Let's build your story.",
      voice: "Zephyr",
      timestamp: "Demo Prompt Spoken Core"
    }
  ]);

  // Lyria 3 Music Generation States
  const [musicMode, setMusicMode] = useState<'sequencer' | 'lyria'>('sequencer');
  const [lyriaPrompt, setLyriaPrompt] = useState('');
  const [lyriaModelType, setLyriaModelType] = useState<'clip' | 'pro'>('clip');
  const [lyriaImage, setLyriaImage] = useState<string | null>(null);
  const [isGeneratingLyria, setIsGeneratingLyria] = useState(false);
  const [lyriaSongs, setLyriaSongs] = useState<Array<{
    id: string;
    prompt: string;
    model: string;
    audioUrl: string | null;
    lyrics: string;
    timestamp: string;
    isFallback: boolean;
    fallbackPreset?: string;
  }>>([
    {
      id: 'demo-lyria-1',
      prompt: 'High-Retention Silicon Venture intro theme, tech synthwave, soaring lead sweeps',
      model: 'Lyria 3 Clip (30s Bumper)',
      audioUrl: null,
      lyrics: '[Instrumental intro - Rising digital voltage]\n"We build the cores in the dark, \nPlucking sparks from an electric loom. \nWatch the nodes begin to trace, \nRevolutions leading from the creative room."',
      timestamp: 'Pre-constructed Base Composition',
      isFallback: true,
      fallbackPreset: 'tech-noir'
    }
  ]);

  // AI-driven custom SFX synthesis foley states
  const [sfxPrompt, setSfxPrompt] = useState('');
  const [isGeneratingSFX, setIsGeneratingSFX] = useState(false);
  const [customSfxParams, setCustomSfxParams] = useState<{
    oscillatorType: 'sine' | 'square' | 'sawtooth' | 'triangle';
    frequencyStart: number;
    frequencyEnd: number;
    sweepDuration: number;
    filterType: 'lowpass' | 'highpass' | 'bandpass';
    filterFrequency: number;
    distortionAmount: number;
    exponentialSweep: boolean;
    soundDescription: string;
    explanation?: string;
  } | null>(null);
  
  const [generatedSfxs, setGeneratedSfxs] = useState<Array<{
    id: string;
    prompt: string;
    params: any;
    timestamp: string;
  }>>([
    {
      id: "demo-sfx",
      prompt: "cybernetic laser flash",
      timestamp: "Pre-constructed Synthesis",
      params: {
        oscillatorType: "sawtooth",
        frequencyStart: 3200,
        frequencyEnd: 150,
        sweepDuration: 0.35,
        filterType: "highpass",
        filterFrequency: 1200,
        distortionAmount: 30,
        exponentialSweep: true,
        soundDescription: "Futuristic digital plasma discharge line"
      }
    }
  ]);

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
      case 'synthwave':
        newBpm = 118;
        newWave = 'sawtooth';
        newFreq = 1100;
        newGrid = {
          kick:  [1, 0, 0, 0, 1, 0, 0, 0],
          snare: [0, 0, 1, 0, 0, 0, 1, 0],
          hihat: [1, 0, 1, 0, 1, 0, 1, 0],
          chess: [1, 1, 1, 1, 1, 1, 1, 1],
          bass:  [1, 0, 1, 0, 1, 0, 1, 0]
        };
        break;
      case 'boombap':
        newBpm = 90;
        newWave = 'triangle';
        newFreq = 500;
        newGrid = {
          kick:  [1, 0, 0, 1, 0, 0, 0, 0],
          snare: [0, 0, 1, 0, 0, 1, 1, 0],
          hihat: [1, 1, 0, 1, 1, 0, 1, 1],
          bass:  [1, 0, 1, 0, 1, 0, 0, 1]
        };
        break;
      case 'techno':
        newBpm = 132;
        newWave = 'square';
        newFreq = 1700;
        newGrid = {
          kick:  [1, 0, 1, 0, 1, 0, 1, 0],
          snare: [0, 0, 1, 0, 0, 0, 1, 0],
          hihat: [1, 1, 1, 1, 1, 1, 1, 1],
          bass:  [1, 0, 1, 0, 1, 0, 1, 0]
        };
        break;
      case 'orchestral':
        newBpm = 75;
        newWave = 'sine';
        newFreq = 400;
        newGrid = {
          kick:  [1, 0, 0, 0, 0, 0, 0, 0],
          snare: [0, 0, 0, 0, 1, 0, 0, 0],
          hihat: [1, 0, 0, 0, 1, 0, 0, 0],
          bass:  [1, 0, 0, 0, 1, 0, 0, 0]
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

  // Extract Screenplay scripts dynamically from local storage progress caches
  const loadScreenplayScript = () => {
    try {
      const cached = localStorage.getItem('studio_agent_state');
      if (cached) {
        const data = JSON.parse(cached);
        if (data.script) {
          addLog("Successfully extracted screenplay draft for AI voiceover casting.", "success");
          setNarrationText(data.script);
        } else {
          addLog("No script drafted yet in Storyboard steps. Paste narration manually.", "warning");
          setNarrationText("Welcome to the automated digital media automation pipeline. Today we analyze emerging niches.");
        }
      } else {
        addLog("No active workspace caching exists. Please write your narration text.", "warning");
      }
    } catch (e) {
      console.warn("Could not retrieve cached screenplay: ", e);
    }
  };

  // Play spoken base64 audio natively in browser foley engine
  const playBase64Audio = (base64Data: string) => {
    try {
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = (volume / 100) * 0.9;
      audio.play();
    } catch (err) {
      console.error("Failed to decode base64 audio", err);
    }
  };

  // Safe offline speech engine synthesis fallback
  const triggerBrowserSpeechSynthesis = (text: string, voiceName: string, voiceName2?: string, isDuet?: boolean) => {
    try {
      if (!window.speechSynthesis) {
        addLog("Offline audio casting failed: Speech synthesis is not supported in this environment.", "warning");
        return;
      }
      window.speechSynthesis.cancel();

      if (isDuet) {
        // Parse lines and play them sequentially
        const lines = text.split("\n").filter(l => l.trim().includes(":"));
        if (lines.length === 0) {
          const utterance = new SpeechSynthesisUtterance(text);
          const chosenVoice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('en'));
          if (chosenVoice) utterance.voice = chosenVoice;
          window.speechSynthesis.speak(utterance);
          return;
        }

        // Schedule SpeechSynthesisUtterances sequentially
        lines.forEach((line) => {
          const split = line.split(":");
          const speaker = split[0].trim().toLowerCase();
          const spokenText = split.slice(1).join(":").trim();
          
          if (!spokenText) return;

          const utterance = new SpeechSynthesisUtterance(spokenText);
          const currentVoiceName = speaker.includes("guest") ? (voiceName2 || 'Zephyr') : voiceName;

          // Pitch and rate configs
          if (currentVoiceName === 'Charon' || currentVoiceName === 'Fenrir') {
            utterance.pitch = 0.65;
            utterance.rate = 0.85;
          } else if (currentVoiceName === 'Puck') {
            utterance.pitch = 1.35;
            utterance.rate = 1.15;
          } else if (currentVoiceName === 'Zephyr') {
            utterance.pitch = 1.05;
            utterance.rate = 0.95;
          } else {
            utterance.pitch = 1.0;
            utterance.rate = 1.0;
          }

          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length > 0) {
            const chosenVoice = voices.find(v => v.lang.startsWith('en'));
            if (chosenVoice) utterance.voice = chosenVoice;
          }

          utterance.volume = (volume / 100) * 0.8;
          window.speechSynthesis.speak(utterance);
        });

        addLog(`Alternating dialogues locally via browser duet engine: [${voiceName} & ${voiceName2 || 'Zephyr'}]`, "info");
      } else {
        const utterance = new SpeechSynthesisUtterance(text);
        
        if (voiceName === 'Charon' || voiceName === 'Fenrir') {
          utterance.pitch = 0.65;
          utterance.rate = 0.85;
        } else if (voiceName === 'Puck') {
          utterance.pitch = 1.35;
          utterance.rate = 1.15;
        } else if (voiceName === 'Zephyr') {
          utterance.pitch = 1.05;
          utterance.rate = 0.95;
        } else {
          utterance.pitch = 1.0;
          utterance.rate = 1.0;
        }

        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const chosenVoice = voices.find(v => v.lang.startsWith('en'));
          if (chosenVoice) utterance.voice = chosenVoice;
        }

        utterance.volume = (volume / 100) * 0.8;
        window.speechSynthesis.speak(utterance);
        addLog(`Speaking stylized narration locally via background synthesis: [${voiceName} Mode]`, "info");
      }
    } catch (err: any) {
      console.warn("Failed to trigger fallback speech synthesis:", err);
    }
  };

  // Handle TTS compilation
  const handleGenerateNarration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!narrationText.trim()) return;

    initAudioContext();
    setIsGeneratingNarration(true);
    addLog(`Requesting stylized Gemini voice casting for ${isDuetMode ? `Duet Dialogue [${selectedVoice} & ${selectedVoice2}]` : `"${selectedVoice}"`} voiceover...`, "thinking");

    try {
      const response = await fetch('/api/tts', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
           text: narrationText.trim(),
           voice: selectedVoice,
           isDuet: isDuetMode,
           voice2: selectedVoice2
         })
      });

      if (!response.ok) {
        throw new Error(`TTS server rate limited with status: ${response.status}`);
      }

      const data = await response.json();

      if (data.useBrowserSpeech || data.error) {
        addLog(`Gemini voice pilot queue busy or limit hit. Engaging safe browser synthesis fallback...`, "warning");
        triggerBrowserSpeechSynthesis(narrationText.trim(), selectedVoice, selectedVoice2, isDuetMode);
        
        const newClip = {
          id: 'clip-' + Date.now(),
          text: narrationText.trim(),
          voice: isDuetMode ? `${selectedVoice} & ${selectedVoice2} (Duet local)` : `${selectedVoice} (Local native)`,
          timestamp: new Date().toLocaleTimeString(),
          isDuet: isDuetMode,
          voice2: isDuetMode ? selectedVoice2 : undefined
        };
        setGeneratedNarrations(prev => [newClip, ...prev]);
      } else if (data.audio) {
        addLog(`Gemini voice narration synthesized successfully! Playing audio stem...`, "success");
        playBase64Audio(data.audio);

        const newClip = {
          id: 'clip-' + Date.now(),
          text: narrationText.trim(),
          voice: selectedVoice,
          audioBase64: data.audio,
          timestamp: new Date().toLocaleTimeString(),
          isDuet: isDuetMode,
          voice2: isDuetMode ? selectedVoice2 : undefined
        };
        setGeneratedNarrations(prev => [newClip, ...prev]);
      }
    } catch (err: any) {
      addLog(`TTS pipeline error: ${err.message}. Engaging browser fallback...`, "warning");
      triggerBrowserSpeechSynthesis(narrationText.trim(), selectedVoice, selectedVoice2, isDuetMode);
    } finally {
      setIsGeneratingNarration(false);
    }
  };

  // Convert Monologue Screenplay to Duet Dialogue Podcast format
  const handleConvertDialogue = async () => {
    if (!narrationText.trim()) {
      addLog("Please enter or import screenplay text first.", "warning");
      return;
    }

    setIsConvertingDialogue(true);
    addLog("Re-authoring screenplay monologue into standard dual-speaker dialogue format...", "thinking");

    try {
      const response = await fetch('/api/convert-to-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: narrationText.trim() })
      });

      if (!response.ok) {
        throw new Error(`Dialogue converter failed with status: ${response.status}`);
      }

      const data = await response.json();
      setNarrationText(data.dialogue);
      setIsDuetMode(true);
      addLog("Successfully structured co-hosted dialogue. Duet mode activated!", "success");
    } catch (err: any) {
      addLog(`Failed to structure podcast dialogue: ${err.message}`, "warning");
    } finally {
      setIsConvertingDialogue(false);
    }
  };

  // Generate music dynamically via Lyria 3 engine
  const handleGenerateLyria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lyriaPrompt.trim()) return;

    initAudioContext();
    setIsGeneratingLyria(true);
    addLog(`Generating high-quality synthetic audio via Lyria 3 model for: "${lyriaPrompt.trim().substring(0, 45)}..."`, "thinking");

    try {
      const response = await fetch('/api/generate-lyria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: lyriaPrompt.trim(),
          modelType: lyriaModelType,
          image: lyriaImage
        })
      });

      if (!response.ok) {
        throw new Error(`Lyria generator failed with status: ${response.status}`);
      }

      const data = await response.json();

      let audioUrl: string | null = null;
      if (data.audio) {
        const binary = window.atob(data.audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
        audioUrl = URL.createObjectURL(blob);
      }

      const songObj = {
        id: 'lyria-' + Date.now(),
        prompt: lyriaPrompt.trim(),
        model: lyriaModelType === 'pro' ? 'Lyria 3 Pro (Full length)' : 'Lyria 3 Clip (30s Bumper)',
        audioUrl: audioUrl,
        lyrics: data.lyrics,
        timestamp: new Date().toLocaleTimeString(),
        isFallback: !!data.isFallback,
        fallbackPreset: data.fallbackPreset
      };

      setLyriaSongs(prev => [songObj, ...prev]);

      if (data.isFallback) {
        addLog(`Lyria 3 active queue limited. Initialized local edge composition: ${data.fallbackTitle}`, "warning");
      } else {
        addLog(`Successfully composed synthetic Audio Stem via Lyria 3!`, "success");
      }

    } catch (err: any) {
      addLog(`Failed to compile Lyria music track: ${err.message}`, "warning");
    } finally {
      setIsGeneratingLyria(false);
    }
  };

  // Audio plyer trigger for Lyria tracks
  const playLyriaSong = (song: typeof lyriaSongs[0]) => {
    if (song.audioUrl) {
      try {
        const audio = new Audio(song.audioUrl);
        audio.volume = (volume / 100) * 0.9;
        audio.play();
        addLog(`Playing generated Lyria track: "${song.prompt.substring(0, 30)}..."`, "success");
      } catch (err) {
        console.error("Failed to play Lyria local URL", err);
      }
    } else if (song.isFallback) {
      triggerArpeggiatorTheme((song.fallbackPreset || 'retro') as any);
    }
  };

  // Subtractive synthesis WaveShaper curve for custom foley distortion
  function makeDistortionCurve(amount: number) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  // Live browser Web Audio custom synthesis playbacks
  const triggerCustomSFX = (params: any) => {
    initAudioContext();
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime((volume / 100) * 0.45, now);
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = (params.oscillatorType || 'sine') as OscillatorType;
    osc.frequency.setValueAtTime(params.frequencyStart || 440, now);
    
    if (params.exponentialSweep) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, params.frequencyEnd || 80), now + params.sweepDuration);
    } else {
      osc.frequency.linearRampToValueAtTime(params.frequencyEnd || 80, now + params.sweepDuration);
    }

    filter.type = (params.filterType || 'lowpass') as BiquadFilterType;
    filter.frequency.setValueAtTime(params.filterFrequency || 1000, now);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + params.sweepDuration);

    if (params.distortionAmount > 0) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = makeDistortionCurve(params.distortionAmount * 2);
      shaper.oversample = '4x';
      osc.connect(shaper);
      shaper.connect(filter);
    } else {
      osc.connect(filter);
    }

    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + params.sweepDuration + 0.05);
    addLog(`Synthesized dynamic foley layer: "${params.soundDescription || 'Foley Wave'}"`, "success");
  };

  // Handle dynamic SFX recipe calculations
  const handleGenerateSFX = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sfxPrompt.trim()) return;

    initAudioContext();
    setIsGeneratingSFX(true);
    addLog(`Instructing Gemini Sound Pilot to arrange audio synthesis recipe for: "${sfxPrompt}"`, "thinking");

    try {
      const response = await fetch('/api/generate-sfx-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: sfxPrompt.trim() })
      });

      if (!response.ok) {
        throw new Error(`SFX server limit hit, status: ${response.status}`);
      }

      const data = await response.json();
      setCustomSfxParams(data);

      addLog(`Synthesis compiled successfully for: "${data.soundDescription || 'Custom sound'}"`, "success");
      triggerCustomSFX(data);

      const newSfx = {
        id: 'sfx-' + Date.now(),
        prompt: sfxPrompt.trim(),
        params: data,
        timestamp: new Date().toLocaleTimeString()
      };
      setGeneratedSfxs(prev => [newSfx, ...prev]);

    } catch (err: any) {
      addLog(`Failed to compute synthesis elements: ${err.message}`, "warning");
    } finally {
      setIsGeneratingSFX(false);
    }
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
    <div className="bg-[#0A0A0A] border border-[#222] min-h-[500px] overflow-hidden flex flex-col h-full shadow-lg">
      
      {/* Header Info Area */}
      <div className="bg-[#0F0F0F] px-8 py-4 border-b border-[#222] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AudioLines className="w-5 h-5 text-[#F27D26]" />
          <div>
            <h4 className="font-extrabold text-[12px] uppercase text-zinc-100 tracking-widest">04 . Video Sound & Music Orchestrator</h4>
            <p className="text-[10px] text-[#777] uppercase tracking-wide">Multi-Channel AI Composition, Narration & SFX Synthesizer Core</p>
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

      {/* Tab Selectors */}
      <div className="bg-[#0C0C0C] border-b border-[#222]/80 flex flex-wrap items-center justify-between px-8">
        <div className="flex -mb-[1px]">
          <button
            onClick={() => setActiveTab('music')}
            className={`px-6 py-3.5 font-mono text-[9px] uppercase font-black tracking-widest cursor-pointer border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'music'
                ? 'border-[#F27D26] text-white bg-[#050505]'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>🎹 Master Genre Composer</span>
          </button>
          <button
            onClick={() => setActiveTab('narration')}
            className={`px-6 py-3.5 font-mono text-[9px] uppercase font-black tracking-widest cursor-pointer border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'narration'
                ? 'border-[#F27D26] text-white bg-[#050505]'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-zinc-400" />
            <span>🎙️ Stylized Voice Narration</span>
          </button>
          <button
            onClick={() => setActiveTab('sfx')}
            className={`px-6 py-3.5 font-mono text-[9px] uppercase font-black tracking-widest cursor-pointer border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'sfx'
                ? 'border-[#F27D26] text-white bg-[#050505]'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>🔊 AI custom SFX Synthesizer</span>
          </button>
        </div>
        <div className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest py-3 hidden md:block select-none">
          SYSTEM ACTIVE • MODE: {activeTab.toUpperCase()}
        </div>
      </div>

      {/* Main Grid Panel */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 overflow-y-auto min-h-[400px]">
        {activeTab === 'music' && (
          <>
            {/* Left Column (8 cols): Step sequencer / Lyria composition workspace */}
            <div className="xl:col-span-8 p-6 lg:p-8 border-b xl:border-b-0 xl:border-r border-[#222] space-y-6">
              
              {/* Composition Engine Selector */}
              <div className="flex items-center gap-2 border-b border-[#222] pb-4">
                <button
                  type="button"
                  onClick={() => setMusicMode('sequencer')}
                  className={`px-5 py-2.5 font-mono text-[9px] uppercase font-black tracking-widest cursor-pointer transition-all border flex items-center gap-2 ${
                    musicMode === 'sequencer'
                      ? 'bg-zinc-900 border-[#F27D26] text-[#F27D26]'
                      : 'bg-[#050505] border-[#1D1D1D] text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span>🎛️ Live Step Sequencer</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMusicMode('lyria');
                    if (!lyriaPrompt && aiPrompt) {
                      setLyriaPrompt(aiPrompt);
                    }
                  }}
                  className={`px-5 py-2.5 font-mono text-[9px] uppercase font-black tracking-widest cursor-pointer transition-all border flex items-center gap-2 ${
                    musicMode === 'lyria'
                      ? 'bg-zinc-900 border-[#F27D26] text-[#F27D26]'
                      : 'bg-[#050505] border-[#1D1D1D] text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>🌌 Lyria 3 Neural Audio Music</span>
                </button>
              </div>

              {musicMode === 'sequencer' ? (
                <>
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
                        className="bg-[#0A0A0A] border border-[#222] text-[#AAA] hover:text-white text-[9px] font-mono font-extrabold px-3 py-1.5 outline-none cursor-pointer uppercase tracking-wider rounded-none select-none"
                      >
                        <option value="lofi">🎙️ Docu-Lofi Retro (85 BPM)</option>
                        <option value="trap">🔥 Retention Trap Core (140 BPM)</option>
                        <option value="minimal">📘 Minimal Swiss Docu (120 BPM)</option>
                        <option value="suspense">🌌 Cinematic Science Suspense (100 BPM)</option>
                        <option value="synthwave">📀 Synthwave / Cyberpunk (118 BPM)</option>
                        <option value="boombap">🥁 Hip Hop / Boom Bap (90 BPM)</option>
                        <option value="techno">⚡ Acid Berlin Techno (132 BPM)</option>
                        <option value="orchestral">🎻 Cinematic Orchestral (75 BPM)</option>
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
                                    {isHit && (
                                      <div 
                                        className="w-3.5 h-3.5 transform rotate-45 border"
                                        style={{ 
                                          backgroundColor: isCurrent ? '#FFFFFF' : track.color,
                                          borderColor: isCurrent ? track.color : 'transparent'
                                        }}
                                      ></div>
                                    )}
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
                </>
              ) : (
                <div className="space-y-6">
                  {/* Lyria 3 Generation Workshop */}
                  <div className="bg-[#0E0E0E] p-5 border border-[#222] space-y-4">
                    <div className="space-y-1">
                      <h5 className="font-extrabold font-mono text-[10px] text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Lyria 3 Audio Music Synthesis Workspace</span>
                      </h5>
                      <p className="text-[9px] text-[#777] uppercase font-mono">
                        Describe the musical genre, tempo, instruments, and visual moods to stream high-fidelity WAV tracks.
                      </p>
                    </div>

                    <form onSubmit={handleGenerateLyria} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-mono font-black text-zinc-500 uppercase tracking-wider block">
                          1. Music Generation Directions Prompt
                        </label>
                        <textarea
                          value={lyriaPrompt}
                          onChange={(e) => setLyriaPrompt(e.target.value)}
                          placeholder="e.g. Generate a cinematic cyberpunk lo-fi track with driving drums, neon synthesizer chords, and a nostalgic science documentary atmosphere..."
                          disabled={isGeneratingLyria}
                          className="w-full bg-[#050505] p-3 text-[11px] leading-relaxed text-zinc-200 border border-[#222] outline-[#F27D26] min-h-[90px] font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Fidelity & Length selector */}
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-mono font-black text-zinc-500 uppercase tracking-wider block">
                            2. Composition Length Mode
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setLyriaModelType('clip')}
                              className={`py-2 px-3 border font-mono text-[9px] uppercase cursor-pointer transition-all ${
                                lyriaModelType === 'clip'
                                  ? 'bg-zinc-900 border-[#F27D26] text-[#F27D26] font-bold'
                                  : 'border-[#222] text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              🎬 Lyria 3 Clip (30s Bumper)
                            </button>
                            <button
                              type="button"
                              onClick={() => setLyriaModelType('pro')}
                              className={`py-2 px-3 border font-mono text-[9px] uppercase cursor-pointer transition-all ${
                                lyriaModelType === 'pro'
                                  ? 'bg-zinc-900 border-[#F27D26] text-[#F27D26] font-bold'
                                  : 'border-[#222] text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              🌌 Lyria 3 Pro (Full Track)
                            </button>
                          </div>
                        </div>

                        {/* Image-Based Composition */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[8px] font-mono font-black text-zinc-500 uppercase tracking-wider">
                              3. Storyboard Image Composition Link
                            </label>
                            {lyriaImage && (
                              <button
                                type="button"
                                onClick={() => setLyriaImage(null)}
                                className="text-[7px] text-red-500 hover:text-red-300 uppercase font-mono tracking-wider cursor-pointer"
                              >
                                Disconnect visual
                              </button>
                            )}
                          </div>
                          
                          <div>
                            {lyriaImage ? (
                              <div className="bg-[#1C130D] border border-amber-900/30 p-2 flex items-center justify-between text-amber-200">
                                <span className="text-[8px] font-mono uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-amber-500" />
                                  Visual frame synced to Lyria
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  // Seed a beautiful base64 image data mockup representing storyboard
                                  setLyriaImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
                                  addLog("Snapped current visual layout scene into Lyria reference deck.", "info");
                                }}
                                className="w-full text-center py-2 bg-zinc-950 border border-dashed border-[#222] hover:border-[#333] hover:text-zinc-300 text-zinc-500 font-mono text-[9px] uppercase cursor-pointer select-none transition-all"
                              >
                                🔗 Synch Music To Active Screen Screenplay Frame
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isGeneratingLyria || !lyriaPrompt.trim()}
                        className="w-full bg-[#F27D26] hover:bg-white text-black font-extrabold text-[10px] uppercase tracking-widest py-3 transition-all cursor-pointer disabled:opacity-45"
                      >
                        {isGeneratingLyria ? 'Synthesizing Neural Waveforms with Lyria 3...' : '🎹 Compose Neural Music Track'}
                      </button>
                    </form>
                  </div>

                  {/* Generated Lyria Songs Deck */}
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-[#F27D26] block">
                      📁 Composed Lyria 3 Audio Library
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {lyriaSongs.map((song) => (
                        <div key={song.id} className="bg-[#0E0E0E] border border-[#222] p-4 space-y-4 hover:border-[#333] transition-colors relative">
                          <div className="flex justify-between items-start border-b border-[#222] pb-2">
                            <div>
                              <span className="text-[8px] font-mono bg-zinc-800 px-2 py-0.5 uppercase tracking-widest font-black text-amber-500 block w-fit">
                                {song.model}
                              </span>
                              <span className="text-[8px] font-mono text-zinc-600 block mt-1">
                                {song.timestamp}
                              </span>
                            </div>
                            <button
                              onClick={() => setLyriaSongs(prev => prev.filter(s => s.id !== song.id))}
                              className="text-zinc-600 hover:text-red-400 cursor-pointer"
                              title="Delete Composition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[8px] font-mono font-bold text-zinc-600 uppercase block">Composition Prompt:</span>
                            <p className="text-[10px] font-mono leading-relaxed text-zinc-300 line-clamp-2">
                              "{song.prompt}"
                            </p>
                          </div>

                          {/* Player and lyrics collapse console */}
                          <div className="space-y-3 pt-2">
                            <div className="flex gap-2.5">
                              <button
                                onClick={() => playLyriaSong(song)}
                                className="px-3.5 py-1.5 bg-[#1C1C1C] hover:bg-[#F27D26] hover:text-black font-mono text-[9px] uppercase font-extrabold text-[#F27D26] tracking-wider border border-[#333] hover:border-[#F27D26] cursor-pointer transition-all flex items-center gap-1.5"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Audition Wave</span>
                              </button>
                              
                              {song.audioUrl && (
                                <a
                                  href={song.audioUrl}
                                  download={`lyria-composition-${song.id}.wav`}
                                  className="px-3 py-1.5 bg-[#030303] hover:bg-zinc-800 font-mono text-[9px] uppercase font-semibold text-zinc-400 hover:text-white tracking-wide border border-[#222] cursor-pointer transition-all flex items-center gap-1.5"
                                >
                                  Download WAV
                                </a>
                              )}
                            </div>

                            {/* Lyrics Block */}
                            {song.lyrics && (
                              <div className="bg-[#050505] p-3 text-[9px] font-mono leading-relaxed text-zinc-400 border border-[#222] max-h-[110px] overflow-y-auto whitespace-pre-wrap">
                                <span className="text-[7px] text-[#777] uppercase block font-black mb-1 border-b border-[#222] pb-0.5">
                                  Lyrics & Structural Metadata:
                                </span>
                                {song.lyrics}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (4 cols): Cinematic Sound Effects Composer & AI prompt pilot */}
            <div className="xl:col-span-4 p-6 lg:p-8 space-y-6 bg-[#0B0B0B]/40">
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-[#F27D26] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI prompt Sound Orchestrator</span>
                </span>
                <form onSubmit={handleAiOrchestration} className="bg-[#0E0E0E] border border-[#222] p-4 space-y-3">
                  <p className="text-[9px] text-[#777] uppercase leading-relaxed font-mono">
                    Give Gemini a design direction (e.g., "fast high-retention dark tension suspense"), and watch it draft beat tracks and synthesis filters dynamically.
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

              {/* Intro Chord composer presets */}
              <div className="space-y-3 pt-4 border-t border-[#222]/50">
                <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-zinc-400 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-[#F27D26]" />
                  <span>Bumper Theme Composer</span>
                </span>
                <div className="space-y-1.5 flex-1">
                  <p className="text-[9px] text-[#666] uppercase leading-relaxed font-mono">
                    Compose background chords instantly for video bumpers or intro logo splash screens:
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => triggerArpeggiatorTheme('majesty')}
                      className="py-2.5 bg-[#0A0A0A] border border-[#222] hover:border-[#F27D26]/40 hover:text-white text-zinc-400 font-mono text-[9px] uppercase font-bold text-left px-4 cursor-pointer transition-all"
                    >
                      🚀 Majestic Tech theme build (A Major)
                    </button>
                    <button
                      onClick={() => triggerArpeggiatorTheme('tech-noir')}
                      className="py-2.5 bg-[#0A0A0A] border border-[#222] hover:border-[#F27D26]/40 hover:text-white text-zinc-400 font-mono text-[9px] uppercase font-bold text-left px-4 cursor-pointer transition-all"
                    >
                      🌌 Deep espionage documentary (G Minor)
                    </button>
                    <button
                      onClick={() => triggerArpeggiatorTheme('retro')}
                      className="py-2.5 bg-[#0A0A0A] border border-[#222] hover:border-[#F27D26]/40 hover:text-white text-zinc-400 font-mono text-[9px] uppercase font-bold text-left px-4 cursor-pointer transition-all"
                    >
                      📀 Nostalgic cinematic wave (C Minor)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'narration' && (
          <>
            {/* Left Column (7 cols): Text block screenplay voice manager */}
            <div className="xl:col-span-7 p-6 lg:p-8 border-b xl:border-b-0 xl:border-r border-[#222] space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-[#F27D26] flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" />
                  <span>AI Narration Prompt & Script</span>
                </span>
                <p className="text-[9px] text-[#777] uppercase leading-relaxed font-mono">
                  Input custom text to speak or directly extract screenplay text drafted by your co-pilot.
                </p>
              </div>

              <form onSubmit={handleGenerateNarration} className="space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={loadScreenplayScript}
                    className="px-4 py-2 bg-[#121212] hover:bg-[#1C1C1C] text-zinc-300 font-mono text-[9px] uppercase font-bold border border-[#222] hover:border-[#333] tracking-widest cursor-pointer transition-all flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>Import screenplay from Workspace</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConvertDialogue}
                    disabled={isConvertingDialogue || !narrationText.trim()}
                    className="px-4 py-2 bg-[#101412] hover:bg-[#151D18] text-emerald-400 font-mono text-[9px] uppercase font-bold border border-emerald-950 hover:border-emerald-900 tracking-widest cursor-pointer transition-all flex items-center gap-2 disabled:opacity-40"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{isConvertingDialogue ? 'Generating Dialogue Lines...' : '🎭 Convert Draft To Co-Host Dialogue Script'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNarrationText('')}
                    className="px-4 py-2 bg-black hover:bg-[#121212] text-zinc-500 hover:text-zinc-300 font-mono text-[9px] uppercase border border-transparent hover:border-[#222] cursor-pointer transition-all"
                  >
                    Clear Text
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Script Draft Deck</span>
                    <button
                      type="button"
                      onClick={() => setIsDuetMode(!isDuetMode)}
                      className={`px-3 py-1 font-mono text-[9px] uppercase font-black tracking-widest cursor-pointer border transition-all ${
                        isDuetMode
                          ? 'bg-amber-950/30 border-[#F27D26] text-[#F27D26]'
                          : 'bg-[#050505] border-[#222] text-zinc-500'
                      }`}
                    >
                      🗣️ {isDuetMode ? 'Co-Host Duet Mode Active' : 'Enable Co-Host Duet Mode'}
                    </button>
                  </div>
                  <textarea
                    value={narrationText}
                    onChange={(e) => setNarrationText(e.target.value)}
                    placeholder={
                      isDuetMode
                        ? "For Duet Mode, separate speaker parts with labels in uppercase, e.g.\nZEPHYR: Behind every global automated channel lay pristine quiet machinery.\nFENRIR: Indeed, and the creative studio plays the principal rhythm."
                        : "Type or pull what Gemini should narrate here (e.g., 'Behind every global automated channel lay the pristine, quiet machinery of creator cores...')"
                    }
                    className="w-full bg-[#050505] p-4 text-xs leading-relaxed text-zinc-200 border border-[#222] outline-none focus:border-[#F27D26] min-h-[140px] font-mono"
                    disabled={isGeneratingNarration}
                  />
                  {isDuetMode && (
                    <p className="text-[8.5px] text-[#a78bfa] uppercase font-mono tracking-wide leading-relaxed">
                      💡 TIP: Duet dialogue mode will parse speaker prefixes (e.g., KORE: or ZEPHYR:) and render the dialogue parts consecutively with their matched voice profiles respectively!
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Voice list card pickers */}
                  <div className="bg-[#0E0E0E] p-4 border border-[#222] space-y-3">
                    <span className="text-[8px] font-mono font-extrabold text-[#777] uppercase block border-b border-[#222] pb-1">
                      {isDuetMode ? 'Narrator 1 Voice Profile' : 'Primary Narrator Voicecast Choice'}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'Kore', label: '🗣️ Kore (Corporate)' },
                        { id: 'Zephyr', label: '🗣️ Zephyr (Docu)' },
                        { id: 'Charon', label: '🗣️ Charon (Deep)' },
                        { id: 'Fenrir', label: '🗣️ Fenrir (Rugged)' },
                        { id: 'Puck', label: '🗣️ Puck (High-Energy)' },
                      ].map((voiceObj) => (
                        <button
                          type="button"
                          key={voiceObj.id}
                          onClick={() => setSelectedVoice(voiceObj.id)}
                          className={`py-1.5 px-2 text-left font-mono text-[9px] uppercase border cursor-pointer transition-all ${
                            selectedVoice === voiceObj.id
                              ? 'bg-zinc-900 border-[#F27D26] text-[#F27D26] font-bold'
                              : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-[#121212]'
                          }`}
                        >
                          {voiceObj.id}
                        </button>
                      ))}
                    </div>

                    {isDuetMode && (
                      <div className="pt-3 border-t border-[#222] space-y-2 mt-2">
                        <span className="text-[8px] font-mono font-extrabold text-[#777] uppercase block border-b border-[#222] pb-1">
                          Narrator 2 Voice Profile
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { id: 'Kore', label: '🗣️ Kore (Corporate)' },
                            { id: 'Zephyr', label: '🗣️ Zephyr (Docu)' },
                            { id: 'Charon', label: '🗣️ Charon (Deep)' },
                            { id: 'Fenrir', label: '🗣️ Fenrir (Rugged)' },
                            { id: 'Puck', label: '🗣️ Puck (High-Energy)' },
                          ].map((voiceObj) => (
                            <button
                              type="button"
                              key={voiceObj.id}
                              onClick={() => setSelectedVoice2(voiceObj.id)}
                              className={`py-1.5 px-2 text-left font-mono text-[9px] uppercase border cursor-pointer transition-all ${
                                selectedVoice2 === voiceObj.id
                                  ? 'bg-zinc-900 border-amber-500 text-amber-500 font-bold'
                                  : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-[#121212]'
                              }`}
                            >
                              {voiceObj.id}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Generation Trigger block */}
                  <div className="bg-[#0E0E0E] p-4 border border-[#222] flex flex-col justify-between space-y-3">
                    <p className="text-[9px] text-[#666] leading-relaxed uppercase font-mono">
                      Narrations are synthesized server-side using Gemini. If service loads are throttled, client synthesis seamlessly kicks in to preserve your local speed.
                    </p>
                    <button
                      type="submit"
                      disabled={isGeneratingNarration || !narrationText.trim()}
                      className="w-full py-4 bg-[#F27D26] hover:bg-white text-black font-extrabold text-[10px] uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40"
                    >
                      {isGeneratingNarration ? 'Synthesizing voice stream...' : 'Generate voiceover narration'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Right Column (5 cols): Pool voice list */}
            <div className="xl:col-span-5 p-6 lg:p-8 space-y-6 bg-[#0B0B0B]/40">
              <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-zinc-400 flex items-center gap-1.5 pb-2 border-b border-[#222]/50">
                🎙️ Generated Voice clip pool
              </span>

              <div className="space-y-3.5 max-h-[360px] overflow-y-auto w-full">
                {generatedNarrations.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-[#222] text-zinc-600 font-mono text-[9px] uppercase">
                    No voice stems rendered yet. Select a script on the left.
                  </div>
                ) : (
                  generatedNarrations.map((item) => (
                    <div key={item.id} className="bg-[#0D0D0D] border border-[#222] p-4.5 space-y-3 relative hover:border-zinc-700 transition-colors">
                      <div className="flex justify-between items-center text-[8px] font-mono text-[#F27D26] font-bold">
                        <span className="bg-[#1D1D1D] px-2 py-0.5 uppercase tracking-widest">
                          VOICE: {item.voice.toUpperCase()}
                        </span>
                        <span className="text-zinc-500">{item.timestamp}</span>
                      </div>
                      
                      <p className="text-[10px] font-mono leading-relaxed text-zinc-300">
                        "{item.text}"
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (item.audioBase64) {
                              playBase64Audio(item.audioBase64);
                            } else {
                              triggerBrowserSpeechSynthesis(item.text, item.voice);
                            }
                          }}
                          className="px-3.5 py-1.5 bg-[#1C1C1C] hover:bg-[#F27D26] hover:text-black text-zinc-300 font-mono text-[9px] font-extrabold uppercase tracking-wider cursor-pointer border border-[#333] hover:border-[#F27D26] transition-all flex items-center gap-1.5"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Audition Stem</span>
                        </button>
                        <button
                          onClick={() => {
                            setGeneratedNarrations(prev => prev.filter(c => c.id !== item.id));
                            addLog("Removed narration stem from studio deck pool.", "info");
                          }}
                          className="p-1.5 text-zinc-600 hover:text-red-400 border border-transparent hover:border-[#222] cursor-pointer transition-colors"
                          title="Discard clip"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'sfx' && (
          <>
            {/* Left Column (7 cols): Custom parameter design form */}
            <div className="xl:col-span-7 p-6 lg:p-8 border-b xl:border-b-0 xl:border-r border-[#222] space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-[#F27D26] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Subtractive Sound Designer</span>
                </span>
                <p className="text-[9px] text-[#777] uppercase leading-relaxed font-mono">
                  Input any description (e.g. "metallic sci-fi door slide", "deep cosmic explosion rumble") and let Gemini compute subtractive wave-generation equations.
                </p>
              </div>

              <form onSubmit={handleGenerateSFX} className="bg-[#0E0E0E] border border-[#222] p-5 space-y-4">
                <textarea
                  value={sfxPrompt}
                  onChange={(e) => setSfxPrompt(e.target.value)}
                  placeholder="e.g. cybernetic shockwave, retro sci-fi laser blast, deep sub bass drop rumble..."
                  className="w-full bg-[#050505] p-3 text-xs leading-relaxed text-zinc-300 border border-[#222] outline-none focus:border-[#F27D26] min-h-[80px] font-mono text-[10px]"
                  disabled={isGeneratingSFX}
                />

                <button
                  type="submit"
                  disabled={isGeneratingSFX || !sfxPrompt.trim()}
                  className="w-full py-3 bg-[#F27D26] hover:bg-white text-black font-extrabold text-[10px] uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40"
                >
                  {isGeneratingSFX ? 'Computing waveforms...' : 'Synthesize custom SFX'}
                </button>
              </form>

              {customSfxParams && (
                <div className="bg-[#0D0D0D] border border-zinc-800 p-5 space-y-4">
                  <div className="border-b border-[#222] pb-2 flex justify-between items-center">
                    <span className="text-[8px] font-mono font-black text-amber-500 uppercase tracking-widest">
                      ACTIVE SYNTHESIZER RECIPE
                    </span>
                    <button
                      onClick={() => triggerCustomSFX(customSfxParams)}
                      className="px-3 py-1 bg-zinc-800 hover:bg-[#F27D26] hover:text-black border border-zinc-700 hover:border-transparent text-white font-mono text-[9px] uppercase font-extrabold cursor-pointer transition-all"
                    >
                      ⚡ Audition Wave
                    </button>
                  </div>

                  <p className="text-[10px] font-mono text-zinc-400 italic">
                    <strong>Description:</strong> "{customSfxParams.soundDescription}"
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-[9px] font-mono text-zinc-400 uppercase">
                    <div className="bg-black/50 p-2.5 border border-[#222]">
                      <span className="text-zinc-600 block text-[7px] font-bold">OSCILLATOR</span>
                      <span className="text-zinc-200 font-bold">{customSfxParams.oscillatorType}</span>
                    </div>
                    <div className="bg-black/50 p-2.5 border border-[#222]">
                      <span className="text-zinc-600 block text-[7px] font-bold">FREQ START</span>
                      <span className="text-zinc-200 font-bold">{customSfxParams.frequencyStart ?? 440} Hz</span>
                    </div>
                    <div className="bg-black/50 p-2.5 border border-[#222]">
                      <span className="text-zinc-600 block text-[7px] font-bold">FREQ END</span>
                      <span className="text-zinc-200 font-bold">{customSfxParams.frequencyEnd ?? 80} Hz</span>
                    </div>
                    <div className="bg-black/50 p-2.5 border border-[#222]">
                      <span className="text-zinc-600 block text-[7px] font-bold">SWEEP TIME</span>
                      <span className="text-zinc-200 font-bold">{customSfxParams.sweepDuration ?? 0.5}s</span>
                    </div>
                    <div className="bg-black/50 p-2.5 border border-[#222]">
                      <span className="text-zinc-600 block text-[7px] font-bold">DISTORTION</span>
                      <span className="text-zinc-200 font-bold">{customSfxParams.distortionAmount ?? 0}%</span>
                    </div>
                    <div className="bg-black/50 p-2.5 border border-[#222]">
                      <span className="text-zinc-600 block text-[7px] font-bold">FILTER FREQ</span>
                      <span className="text-zinc-200 font-bold">{customSfxParams.filterFrequency ?? 1000} Hz</span>
                    </div>
                  </div>
                  {customSfxParams.explanation && (
                    <div className="bg-[#101412] p-3 text-[9px] text-zinc-400 font-mono leading-relaxed border border-emerald-950/20">
                      <strong>AI Sound Logic:</strong> {customSfxParams.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column (5 cols): Built-In Foley soundboard and compiled history */}
            <div className="xl:col-span-5 p-6 lg:p-8 space-y-6 bg-[#0B0B0B]/40">
              <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-[#F27D26] flex items-center gap-1.5 pb-2 border-b border-[#222]/50">
                ⚡ Ready-made soundboard deck
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => triggerSFX('swoosh')}
                  className="py-3 bg-[#111] hover:bg-[#1C1C1C] text-zinc-300 font-mono text-[9px] uppercase font-bold border border-[#222] hover:border-[#333] tracking-widest text-center cursor-pointer transition-all"
                >
                  💨 Whip Swoosh
                </button>
                <button
                  onClick={() => triggerSFX('riser')}
                  className="py-3 bg-[#111] hover:bg-[#1C1C1C] text-zinc-300 font-mono text-[9px] uppercase font-bold border border-[#222] hover:border-[#333] tracking-widest text-center cursor-pointer transition-all"
                >
                  📈 Tension Riser
                </button>
                <button
                  onClick={() => triggerSFX('bass-drop')}
                  className="py-3 bg-[#111] hover:bg-[#1C1C1C] text-zinc-300 font-mono text-[9px] uppercase font-bold border border-[#222] hover:border-[#333] tracking-widest text-center cursor-pointer transition-all"
                >
                  🔊 Sub Bass Drop
                </button>
                <button
                  onClick={() => triggerSFX('chime')}
                  className="py-3 bg-[#111] hover:bg-[#1C1C1C] text-zinc-300 font-mono text-[9px] uppercase font-bold border border-[#222] hover:border-[#333] tracking-widest text-center cursor-pointer transition-all"
                >
                  🔔 Retro Chime
                </button>
              </div>

              {/* Adjust SFX knobs */}
              <div className="bg-[#0E0E0E] p-4.5 border border-[#222] space-y-3.5">
                <span className="text-[8px] font-mono font-extrabold text-[#777] uppercase block border-b border-[#222] pb-1">
                  Manual Pitch Controller
                </span>
                <div className="space-y-3">
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

              <div className="space-y-2">
                <span className="text-[8px] font-mono font-extrabold text-zinc-500 uppercase block">
                  CUSTOMLY SYNTHESIZED FOLEY LOGS
                </span>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                  {generatedSfxs.map((item) => (
                    <div key={item.id} className="bg-black/30 border border-[#222] p-2.5 flex items-center justify-between">
                      <div className="font-mono text-[9px] max-w-[200px] truncate">
                        <span className="text-amber-500 block truncate font-bold">"{item.prompt}"</span>
                        <span className="text-zinc-600 block text-[7px]">{item.timestamp}</span>
                      </div>
                      <button
                        onClick={() => triggerCustomSFX(item.params)}
                        className="p-1 px-2.5 bg-zinc-900 hover:bg-[#F27D26] border border-[#222] text-zinc-400 hover:text-black font-mono text-[8px] uppercase font-bold cursor-pointer transition-all"
                      >
                        🔊 Fire
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Safety warning footer banner */}
      <div className="bg-[#0A0A0A] border-t border-[#222] px-8 py-3.5 flex items-center gap-2.5 pointer-events-none select-none">
        <AlertTriangle className="w-3.5 h-3.5 text-zinc-600 animate-pulse" />
        <span className="text-[8px] font-mono text-[#555] uppercase tracking-wider">
          Synthesizer tracks are calculated live inside your sandbox's Web Audio core. Ensure tab sound permissions are enabled to monitor output.
        </span>
      </div>

    </div>
  );
}
