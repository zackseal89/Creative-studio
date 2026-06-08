import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  X, 
  Bot, 
  Sparkles, 
  Zap, 
  Terminal, 
  HelpCircle,
  TrendingDown,
  Wand2,
  RefreshCw,
  Video,
  User as UserIcon,
  Play,
  Check,
  PlayCircle,
  Sparkle,
  ArrowRight,
  Info,
  Layers,
  CornerDownRight,
  Loader
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface CreatorAgentChatbotProps {
  topic: string;
  setTopic: (t: string) => void;
  phase: string;
  setPhase: (p: any) => void;
  activeModule: 'home' | 'studio' | 'audio' | 'vision' | 'calendar' | 'soul';
  setActiveModule: (m: 'home' | 'studio' | 'audio' | 'vision' | 'calendar' | 'soul') => void;
  activeStep: number;
  setActiveStep: (s: number) => void;
  script: string | null;
  setScript: (s: string | null) => void;
  research: any;
  setResearch: (r: any) => void;
  plan: any;
  setPlan: (p: any) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'thinking') => void;
  currentUser: any;
  handleDeployResearch: (e?: React.FormEvent) => Promise<void>;
  handleCompileScript: (tone?: string) => Promise<void>;
  handleCancelAndReset: () => void;
  logs: any[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  executedActions?: string[];
}

interface StreamingMessageProps {
  content: string;
  onComplete: () => void;
}

// Highly stylized markdown renderer for streaming content
function StreamingMessage({ content, onComplete }: StreamingMessageProps) {
  const [displayedText, setDisplayedText] = useState('');
  const completeRef = useRef(false);
  const wordsRef = useRef<string[]>([]);
  
  useEffect(() => {
    wordsRef.current = content.split(' ');
    setDisplayedText('');
    completeRef.current = false;
    
    let index = 0;
    let current = '';
    
    const interval = setInterval(() => {
      const words = wordsRef.current;
      if (index >= words.length) {
        clearInterval(interval);
        if (!completeRef.current) {
          completeRef.current = true;
          onComplete();
        }
        return;
      }
      current += (index === 0 ? '' : ' ') + words[index];
      setDisplayedText(current);
      index++;
    }, 22);

    return () => clearInterval(interval);
  }, [content]);

  const handleSkip = () => {
    setDisplayedText(content);
    if (!completeRef.current) {
      completeRef.current = true;
      onComplete();
    }
  };

  const isComplete = displayedText.length === content.length;

  return (
    <div className="relative group/stream text-left w-full select-text">
      <div className="prose prose-invert prose-xs max-w-none text-[11px] leading-relaxed tracking-wide space-y-2 select-text">
        <ReactMarkdown
          components={{
            h1: (props) => <h1 className="text-xs font-sans font-black text-[#F27D26] mt-3.5 mb-1.5 uppercase tracking-wider block" {...props} />,
            h2: (props) => <h2 className="text-[10.5px] font-mono font-black text-white mt-2.5 mb-1 uppercase tracking-widest pl-1.5 border-l-2 border-[#F27D26]" {...props} />,
            h3: (props) => <h3 className="text-[10px] font-mono font-bold text-zinc-300 mt-2.5 mb-1 uppercase tracking-widest pl-1 border-l border-zinc-500" {...props} />,
            p: (props) => <p className="text-[11px] leading-relaxed text-zinc-200 mb-2 font-sans" {...props} />,
            ul: (props) => <ul className="list-disc pl-4 mb-2.5 space-y-1.5 text-zinc-400 text-[11px]" {...props} />,
            ol: (props) => <ol className="list-decimal pl-4 mb-2.5 space-y-1.5 text-zinc-400 text-[11px]" {...props} />,
            li: (props) => <li className="text-zinc-300 hover:text-white transition-colors" {...props} />,
            pre: (props) => <pre className="bg-[#050505] border border-[#222] p-2.5 my-3 overflow-x-auto text-[10px] font-mono text-zinc-400 select-all scrollbar-thin rounded-none" {...props} />,
            code: (props) => <code className="bg-[#181818] px-1.5 py-0.5 border border-[#252525] text-[#F27D26] text-[10px] font-mono" {...props} />,
            strong: (props) => <strong className="text-white font-extrabold" {...props} />,
            blockquote: (props) => <blockquote className="border-l-2 border-zinc-700 pl-3.5 italic text-zinc-400 my-2 text-[11px]" {...props} />,
          }}
        >
          {displayedText}
        </ReactMarkdown>
        {!isComplete && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-[#F27D26] animate-pulse align-middle" />
        )}
      </div>

      {!isComplete && (
        <button
          type="button"
          onClick={handleSkip}
          className="absolute -top-7 right-0 bg-[#111] hover:bg-neutral-900 border border-[#222] text-[#F27D26]/80 hover:text-white text-[8px] font-mono py-0.5 px-1.5 tracking-widest uppercase transition-colors rounded-none cursor-pointer select-none"
        >
          Skip Stream ▶▶
        </button>
      )}
    </div>
  );
}

export default function CreatorAgentChatbot({
  topic,
  setTopic,
  phase,
  setPhase,
  activeModule,
  setActiveModule,
  activeStep,
  setActiveStep,
  script,
  setScript,
  research,
  setResearch,
  plan,
  setPlan,
  addLog,
  currentUser,
  handleDeployResearch,
  handleCompileScript,
  handleCancelAndReset,
  logs
}: CreatorAgentChatbotProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [alertText, setAlertText] = useState<string | null>(null);

  // States for streaming and dynamic action checking pipelines
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [pendingActionsMap, setPendingActionsMap] = useState<Record<string, string[]>>({});
  const [executingActions, setExecutingActions] = useState<Record<string, boolean>>({});
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to latest chats
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, activeStreamId]);

  // Welcome introductory guide on first open
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-1',
          role: 'model',
          content: `### 🤖 Welcome to Creator Core Copilot!
          
I am your **AI Executive Producer and Administrator**. I have **full control** over this app's modules and workspaces!

Here is how I can build and ideate alongside you:
- **Ideate Topics**: *"Suggest 3 controversial hooks for a video about autonomous robots."* or *"What's a high-CPM topic for a tech channel?"*
- **Form Automation**: You can tell me to fill out forms: *"Change topic to 'Self-Driving Cars' and start research!"*
- **Aesthetics & Tone**: *"Set tone to Aggressive/Viral and compile the script."*
- **Workspace Navigation**: *"Switch to the Synthesizer board"* or *"Open visual Vision analyst"*

Click any of the **Quick Assist Chips** below to explore my workspace automation features!`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    }
  }, []);

  // Parses command tokens out of model replies
  const parseAndExecuteActions = (text: string): { cleanText: string; actions: string[] } => {
    const actionRegex = /\[ACTION:\s*([a-zA-Z0-9_]+)\s*(.*?)\]/g;
    let match;
    const actions: string[] = [];
    let cleanText = text;

    while ((match = actionRegex.exec(text)) !== null) {
      const type = match[1].toLowerCase();
      const args = match[2]?.trim();
      actions.push(`${type} ${args}`);
    }

    // Strip actions from clean text to keep layout immaculate
    cleanText = cleanText.replace(/\[ACTION:\s*[a-zA-Z0-9_]+\s*.*?\]/g, '').trim();

    return { cleanText, actions };
  };

  // Execution engine to drive app layout on client side
  const executeAppAction = async (actionStr: string, actionIndex: string) => {
    const splitIdx = actionStr.indexOf(' ');
    const type = splitIdx === -1 ? actionStr : actionStr.substring(0, splitIdx).trim();
    const args = splitIdx === -1 ? '' : actionStr.substring(splitIdx + 1).trim();

    setExecutingActions(prev => ({ ...prev, [actionIndex]: true }));
    addLog(`Creator Copilot executing: "${type}"...`, 'thinking');

    // Artificial short wait to simulate pipeline triggers beautifully
    await new Promise(resolve => setTimeout(resolve, 800));

    switch (type) {
      case 'set_topic':
        if (args) {
          setTopic(args);
          addLog(`Copilot configured primary topic input: "${args}"`, 'success');
        }
        break;
      
      case 'start_research':
        if (args) {
          setTopic(args);
          addLog(`Copilot starting search grounding pipeline for: "${args}"...`, 'thinking');
          setTimeout(() => {
            handleDeployResearch();
          }, 400);
        }
        break;

      case 'change_tone':
        if (args) {
          addLog(`Copilot switching creative tone directive to: "${args}"`, 'info');
          if (phase === 'completed') {
            addLog(`Triggering immediate script refactor in "${args}" tone...`, 'thinking');
            handleCompileScript(args);
          }
        }
        break;

      case 'navigate_step':
        const stepNum = parseInt(args, 10);
        if (stepNum >= 1 && stepNum <= 3) {
          setActiveStep(stepNum);
          addLog(`Copilot navigated workspace layout to Step 0{stepNum}`, 'success');
        }
        break;

      case 'switch_module':
        if (args === 'home' || args === 'studio' || args === 'audio' || args === 'vision' || args === 'calendar' || args === 'soul') {
          setActiveModule(args as any);
          addLog(`Copilot switched tab focus to: "${args.toUpperCase()}" Board`, 'success');
        }
        break;

      case 'print_log':
        if (args) {
          addLog(`🤖 CO-PILOT: ${args}`, 'success');
        }
        break;

      case 'reset_workspace':
        handleCancelAndReset();
        addLog(`Copilot executed complete workspace reset.`, 'warning');
        break;

      case 'update_script':
        if (args) {
          // Replace escaped newlines if any
          const formatted = args.replace(/\\n/g, '\n');
          setScript(formatted);
          setPhase('completed');
          setActiveStep(3);
          addLog(`Copilot injected high retention screenplay updates.`, 'success');
        }
        break;

      default:
        console.warn('Unknown Copilot action command', type, args);
    }

    setExecutingActions(prev => ({ ...prev, [actionIndex]: false }));
    setCompletedActions(prev => ({ ...prev, [actionIndex]: true }));
  };

  const handleSendChat = async (inputStr: string) => {
    if (!inputStr.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: inputStr,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);
    setAlertText(null);

    // Build current workspace context for state awareness
    const workspaceContext = {
      topic,
      phase,
      activeModule,
      activeStep,
      hasScript: !!script,
      hasPlan: !!plan,
      hasResearch: !!research,
      isLoggedIn: !!currentUser,
      userEmail: currentUser?.email || ''
    };

    // Prepare full conversation history (keep latest 12 messages to respect token usage)
    const history = [...messages, userMsg].slice(-12).map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const res = await fetch('/api/chat-capability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: history,
          workspaceContext
        })
      });

      if (!res.ok) {
        throw new Error('Chat service responded with failure.');
      }

      const rawData = await res.json();
      const rawText = rawData.reply || '';

      // Parse actions from text payload safely
      const { cleanText, actions } = parseAndExecuteActions(rawText);

      const modelMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'model',
        content: cleanText,
        timestamp: new Date().toLocaleTimeString(),
        executedActions: actions
      };

      // Set the active stream and stash actions until completion
      setActiveStreamId(modelMsg.id);
      setPendingActionsMap(prev => ({ ...prev, [modelMsg.id]: actions }));
      setMessages(prev => [...prev, modelMsg]);

    } catch (err: any) {
      console.error(err);
      addLog(`Chatbot encountered error: ${err.message}`, 'warning');
      setAlertText('Failed to transmit context to Gemini proxy. Verify your API Key.');
    } finally {
      setIsLoading(false);
    }
  };

  // Triggers when stream typewriter finishes
  const triggerQueuedActions = (msgId: string) => {
    const actions = pendingActionsMap[msgId];
    if (actions && actions.length > 0) {
      actions.forEach((act, idx) => {
        const actionIndex = `${msgId}-${idx}`;
        setTimeout(() => {
          executeAppAction(act, actionIndex);
        }, idx * 1100);
      });
    }
  };

  const executeChipAction = (chipText: string, instruction: string) => {
    handleSendChat(instruction);
  };

  return (
    <>
      {/* Floating Toggle Icon Bubble */}
      <div className="fixed bottom-14 right-8 z-[200] select-none">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-3.5 rounded-none flex items-center justify-center border-2 shadow-2xl transition-all duration-300 ${
            isOpen 
              ? 'bg-[#121212] border-[#222] text-[#F27D26]' 
              : 'bg-[#F27D26] hover:bg-white border-black text-black scale-105 active:scale-95'
          } cursor-pointer`}
          whileHover={{ y: -2 }}
          title="Open AI Core Administrator Assistant Panel"
          id="toggle-copilot-panel-btn"
        >
          {isOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <div className="flex items-center gap-1.5 px-0.5">
              <span className="text-[10px] tracking-widest font-extrabold uppercase font-mono mr-1">Co-Pilot</span>
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
          )}
          {/* Active status pulse */}
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-black animate-pulse"></span>
        </motion.button>
      </div>

      {/* Slide-out Sidebar Chat Component */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 420 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 420 }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className="fixed top-0 right-0 h-screen w-full sm:w-[420px] bg-[#0A0A0A]/95 backdrop-blur-md border-l border-[#222] flex flex-col z-[190] shadow-2xl"
          >
            {/* Header Area */}
            <div className="p-4 bg-[#0F0F0F] border-b border-[#222]/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#222]/40 border border-[#F27D26]/60 text-[#F27D26]">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white flex items-center gap-1.5">
                    Creator Core Copilot
                    <span className="text-[7px] text-green-500 font-mono tracking-normal bg-green-500/10 border border-green-500/20 px-1">ACTIVE ADMIN</span>
                  </h3>
                  <p className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest">GEMINI 3.5 FLASH CO-EXECUTION ENGINE</p>
                </div>
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 px-2.5 bg-[#141414] hover:bg-neutral-900 border border-[#222] text-zinc-500 hover:text-white text-[9px] tracking-widest font-bold uppercase transition-all duration-200 cursor-pointer"
              >
                CLOSE [✕]
              </button>
            </div>

            {/* Current Workspace Metrics Bar */}
            <div className="px-4 py-2 bg-[#121212] border-b border-[#222]/40 grid grid-cols-3 gap-2 text-[8px] font-mono uppercase text-zinc-400 text-left select-none">
              <span className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f27d26] animate-pulse"></span>
                <span>STEP: 0{activeStep}</span>
              </span>
              <span className="truncate text-zinc-300 border-x border-[#222]/80 px-2 text-center">
                {topic ? `${topic}` : 'NO TOPIC BRIEF'}
              </span>
              <span className="text-right">
                PANEL: <span className="text-[#F27D26] font-extrabold">{activeModule}</span>
              </span>
            </div>

            {/* Conversational Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 font-sans select-text scrollbar-thin scrollbar-thumb-zinc-800">
              {messages.map((m) => (
                <div 
                  key={m.id} 
                  className={`flex flex-col max-w-[92%] ${
                    m.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5 text-[8px] font-mono text-zinc-400 uppercase tracking-widest">
                    {m.role === 'model' ? (
                       <>
                         <Bot className="w-3 h-3 text-[#F27D26]" />
                         <span className="font-extrabold text-zinc-300">CO-PILOT AI</span>
                       </>
                     ) : (
                       <>
                         <UserIcon className="w-2.5 h-2.5 text-zinc-400" />
                         <span className="font-extrabold text-zinc-400">CREATOR (YOU)</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{m.timestamp}</span>
                  </div>

                  <div className={`p-4 border text-xs leading-relaxed font-sans w-full text-left transition-all ${
                    m.role === 'user' 
                      ? 'bg-[#161616] border-[#333] text-zinc-100 rounded-none' 
                      : 'bg-[#0E0E0E] border-[#222] text-zinc-300 rounded-none'
                  }`}>
                    {m.role === 'user' ? (
                      <p className="whitespace-pre-wrap select-text">{m.content}</p>
                    ) : m.id === activeStreamId ? (
                      <StreamingMessage 
                        content={m.content} 
                        onComplete={() => triggerQueuedActions(m.id)} 
                      />
                    ) : (
                      /* Fully stylized Markdown rendering for non-streaming messages */
                      <div className="prose prose-invert prose-xs max-w-none text-[11px] leading-relaxed select-text tracking-wide space-y-2">
                        <ReactMarkdown
                          components={{
                            h1: (props) => <h1 className="text-xs font-sans font-black text-[#F27D26] mt-3.5 mb-1.5 uppercase tracking-wider block" {...props} />,
                            h2: (props) => <h2 className="text-[10px] font-mono font-black text-white mt-2.5 mb-1 uppercase tracking-widest pl-1.5 border-l-2 border-[#F27D26]" {...props} />,
                            h3: (props) => <h3 className="text-[9.5px] font-mono font-bold text-zinc-300 mt-2.5 mb-1.5 uppercase tracking-widest pl-1 border-l border-zinc-500" {...props} />,
                            p: (props) => <p className="text-[11px] leading-relaxed text-zinc-200 mb-2 font-sans" {...props} />,
                            ul: (props) => <ul className="list-disc pl-4 mb-2.5 space-y-1 text-zinc-400 text-[11px]" {...props} />,
                            ol: (props) => <ol className="list-decimal pl-4 mb-2.5 space-y-1 text-zinc-400 text-[11px]" {...props} />,
                            li: (props) => <li className="text-zinc-300 hover:text-white transition-colors" {...props} />,
                            pre: (props) => <pre className="bg-[#050505] border border-[#222] p-2.5 my-3 overflow-x-auto text-[10px] font-mono text-zinc-400 select-all scrollbar-thin rounded-none" {...props} />,
                            code: (props) => <code className="bg-[#181818] px-1.5 py-0.5 border border-[#252525] text-[#F27D26] text-[10px] font-mono" {...props} />,
                            strong: (props) => <strong className="text-white font-extrabold" {...props} />,
                            blockquote: (props) => <blockquote className="border-l-2 border-zinc-700 pl-3.5 italic text-zinc-400 my-2 text-[11px]" {...props} />,
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    
                    {/* Visual Command action execution confirmation list */}
                    {m.executedActions && m.executedActions.length > 0 && (
                      <div className="mt-4 pt-3.5 border-t border-[#222] space-y-1.5 text-left w-full select-none">
                        <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-widest block font-black mb-1">⚙️ ACTIVE ADMINISTRATIVE PIPELINE ACTIONS</span>
                        {m.executedActions.map((act, i) => {
                          const actionIndex = `${m.id}-${i}`;
                          const isPending = m.id === activeStreamId;
                          const isRunning = executingActions[actionIndex];
                          const isDone = completedActions[actionIndex];

                          return (
                            <div key={i} className="flex items-center justify-between text-[8px] font-mono bg-[#0B0B0B] border border-[#1C1C1C] text-white px-2.5 py-1.5">
                              <div className="flex items-center gap-2 truncate flex-1 pr-2">
                                <Zap className={`w-3 h-3 shrink-0 ${isRunning ? 'text-[#F27D26] animate-spin' : isDone ? 'text-green-500' : 'text-zinc-500'}`} />
                                <span className={`font-extrabold truncate ${isDone ? 'text-zinc-400' : 'text-[#F27D26]'}`}>{act.split(' ')[0]}</span>
                                <span className="text-zinc-500 truncate">{act.substring(act.indexOf(' ') + 1)}</span>
                              </div>
                              <div className="shrink-0">
                                {isPending ? (
                                  <span className="text-[7px] text-zinc-400 tracking-wider font-bold">⏳ IN QUEUE</span>
                                ) : isRunning ? (
                                  <span className="text-[7px] text-[#F27D26] animate-pulse tracking-wider">▲ RUNNING</span>
                                ) : isDone ? (
                                  <span className="text-[7px] text-green-500 font-extrabold bg-green-950/20 border border-green-500/20 px-1 py-0.5">✓ READY</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => executeAppAction(act, actionIndex)}
                                    className="px-1.5 py-0.5 bg-[#1C130D] text-[#F27D26] text-[7px] uppercase font-bold tracking-widest hover:bg-[#F27D26] hover:text-black transition-colors border border-[#F27D26]/20"
                                  >
                                    RE-RUN
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex flex-col items-start max-w-[80%]">
                  <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-1">CO-PILOT IS DRAFTING STRATEGIES...</span>
                  <div className="p-3 bg-[#0E0E0E] border border-[#222] rounded-none flex items-center space-x-2.5">
                    <LoaderPulse />
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Inquiring context indexes</span>
                  </div>
                </div>
              )}

              {alertText && (
                <div className="p-3 bg-red-950/20 border border-red-900/40 text-red-500 text-[10px] font-mono uppercase tracking-wider leading-relaxed">
                  ⚠️ {alertText}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Ideation & Automation Assist Chips */}
            <div className="p-3 bg-[#0c0c0c] border-t border-[#222]/40 select-none">
              <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block mb-1.5 font-black text-left">💡 QUICK AUTOMATION DESIGNS</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => executeChipAction(
                    "🤖 Suggest Topics", 
                    "Suggest 3 high-CPM, viral storytelling topics related to AI, creator economy, or automation."
                  )}
                  className="p-1.5 px-2 bg-[#0F0F0F] hover:bg-[#1C130D] border border-[#222] hover:border-[#F27D26]/40 text-zinc-300 hover:text-white text-[9px] font-mono text-left tracking-wide truncate transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Wand2 className="w-3 h-3 text-[#F27D26]" />
                  <span>💡 Ideate 3 Tech Topics</span>
                </button>
                <button
                  onClick={() => executeChipAction(
                    "🎬 Switc to Synthesizer", 
                    "Switch our focus module panel immediately to the audio composer so I can tune sound profiles."
                  )}
                  className="p-1.5 px-2 bg-[#0F0F0F] hover:bg-[#1C130D] border border-[#222] hover:border-[#F27D26]/40 text-zinc-300 hover:text-white text-[9px] font-mono text-left tracking-wide truncate transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-[#F27D26]" />
                  <span>🔊 Tune Synth Module</span>
                </button>
                <button
                  onClick={() => executeChipAction(
                    "🚀 Ground Self-Driving Cars", 
                    "Let's change focus model topic to 'Self-Driving Autonomous Car Fleets in 2026' and start a grounded real-time research query."
                  )}
                  className="p-1.5 px-2 bg-[#0F0F0F] hover:bg-[#1C130D] border border-[#222] hover:border-[#F27D26]/40 text-zinc-300 hover:text-white text-[9px] font-mono text-left tracking-wide truncate transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Video className="w-3 h-3 text-[#F27D26]" />
                  <span>⚙️ Run Grounded: Tesla Fleets</span>
                </button>
                <button
                  onClick={() => executeChipAction(
                    "🔥 Enhance prompting b-roll", 
                    "Develop an extremely cinematic, masterfully engineered imagery generation prompt I can use for my futuristic YouTube storyboard visuals."
                  )}
                  className="p-1.5 px-2 bg-[#0F0F0F] hover:bg-[#1C130D] border border-[#222] hover:border-[#F27D26]/40 text-zinc-300 hover:text-white text-[9px] font-mono text-left tracking-wide truncate transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-[#F27D26]" />
                  <span>🔥 Build Visual Prompt</span>
                </button>
              </div>
            </div>

            {/* Input Submission Footer Form */}
            <div className="p-3 bg-[#0F0F0F] border-t border-[#222]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat(inputMessage);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isLoading}
                  placeholder="Ask me to ideate, write, or automate..."
                  className="flex-grow bg-[#070707] border border-[#222] text-xs py-2 px-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#F27D26] font-mono font-light select-text"
                />
                
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="p-2.5 bg-[#F27D26] hover:bg-white text-black disabled:opacity-30 disabled:hover:bg-[#F27D26] transition-colors cursor-pointer flex items-center justify-center rounded-none"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function LoaderPulse() {
  return (
    <div className="flex space-x-1 items-center h-3">
      <div className="w-1.5 h-1.5 bg-[#F27D26] animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-1.5 h-1.5 bg-[#F27D26] animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-1.5 h-1.5 bg-[#F27D26] animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}
