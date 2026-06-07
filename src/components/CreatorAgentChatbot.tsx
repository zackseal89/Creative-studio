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
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface CreatorAgentChatbotProps {
  topic: string;
  setTopic: (t: string) => void;
  phase: string;
  setPhase: (p: any) => void;
  activeModule: 'studio' | 'audio' | 'vision';
  setActiveModule: (m: 'studio' | 'audio' | 'vision') => void;
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to latest chats
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Welcome introductory guide on first open
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-1',
          role: 'model',
          content: `### 🤖 Welcome to Creator Core Copilot!
          
I am your **AI Executive Producer and Administrator**. I have **full control** of this app's modules and workspaces!

Here is how I can build and ideate alongside you:
- **Ideate Topics**: *"Suggest 3 controversial hooks for a video about autonomous robots."* or *"What's a high-CPM topic for a tech channel?"*
- **Form Automation**: You can tell me to fill out the form for you: *"Change topic to 'Self-Driving Cars' and start the research!"*
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
  const executeAppAction = async (actionStr: string) => {
    const splitIdx = actionStr.indexOf(' ');
    const type = splitIdx === -1 ? actionStr : actionStr.substring(0, splitIdx).trim();
    const args = splitIdx === -1 ? '' : actionStr.substring(splitIdx + 1).trim();

    addLog(`Creator Copilot triggered action: "${type}"`, 'thinking');

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
          // Wait so changes reflect
          setTimeout(() => {
            handleDeployResearch();
          }, 400);
        }
        break;

      case 'change_tone':
        if (args) {
          addLog(`Copilot switching creative tone directive to: "${args}"`, 'info');
          // If in completed phase, let's auto-rebuild script
          if (phase === 'completed') {
            addLog(`Triggering immediate script refactor script in "${args}" tone...`, 'thinking');
            handleCompileScript(args);
          }
        }
        break;

      case 'navigate_step':
        const stepNum = parseInt(args, 10);
        if (stepNum >= 1 && stepNum <= 3) {
          setActiveStep(stepNum);
          addLog(`Copilot navigated workspace layout to Step 0${stepNum}`, 'success');
        }
        break;

      case 'switch_module':
        if (args === 'studio' || args === 'audio' || args === 'vision') {
          setActiveModule(args);
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
          setScript(args);
          setPhase('completed');
          setActiveStep(3);
          addLog(`Copilot injected high retention screenplay updates.`, 'success');
        }
        break;

      default:
        console.warn('Unknown Copilot action command', type, args);
    }
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

      setMessages(prev => [...prev, modelMsg]);

      // Serialized delay trigger for each actionable command item to keep React happy
      if (actions.length > 0) {
        actions.forEach((actionItem, i) => {
          setTimeout(() => {
            executeAppAction(actionItem);
          }, (i + 1) * 600);
        });
      }

    } catch (err: any) {
      console.error(err);
      addLog(`Chatbot encounter error connecting with Gemini SDK: ${err.message}`, 'warning');
      setAlertText('Failed to transmit context to Gemini proxy. Verify your API Key.');
    } finally {
      setIsLoading(false);
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
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white flex items-center gap-1.5">
                    Creator Core Copilot
                    <span className="text-[7px] text-green-500 font-mono tracking-normal bg-green-500/10 border border-green-500/20 px-1">ACTIVE ADMIN</span>
                  </h3>
                  <p className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest">GEMINI 3.5 FLASH CO-EXECUTION ENGINE</p>
                </div>
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 px-2.5 bg-[#141414] hover:bg-red-950/40 hover:text-red-400 border border-[#222] text-zinc-500 text-[9px] tracking-widest font-bold uppercase transition-all duration-200 cursor-pointer"
              >
                CLOSE [✕]
              </button>
            </div>

            {/* Current Workspace Metrics Bar */}
            <div className="px-4 py-2 bg-[#121212] border-b border-[#222]/40 flex items-center justify-between text-[8px] font-mono uppercase text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f27d26]"></span>
                Step: 0{activeStep}
              </span>
              <span className="truncate max-w-[140px] text-zinc-500">
                Brief: {topic ? `"${topic}"` : 'Empty'}
              </span>
              <span>
                Panel: <span className="text-[#F27D26]">{activeModule}</span>
              </span>
            </div>

            {/* Conversational Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans select-text scrollbar-thin scrollbar-thumb-zinc-800">
              {messages.map((m) => (
                <div 
                  key={m.id} 
                  className={`flex flex-col max-w-[88%] ${
                    m.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                    {m.role === 'model' ? (
                      <>
                        <Bot className="w-3 h-3 text-[#F27D26]" />
                        <span>CO-PILOT AI</span>
                      </>
                    ) : (
                      <>
                        <UserIcon className="w-2.5 h-2.5 text-zinc-400" />
                        <span>CREATOR (YOU)</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{m.timestamp}</span>
                  </div>

                  <div className={`p-3.5 border text-xs leading-relaxed font-sans ${
                    m.role === 'user' 
                      ? 'bg-[#161616] border-[#333] text-zinc-100 rounded-none' 
                      : 'bg-[#0E0E0E] border-[#222] text-zinc-300 rounded-none italic-markdown'
                  }`}>
                    {m.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <div className="prose prose-invert prose-xs max-w-none text-[11px] leading-relaxed select-text tracking-wide space-y-2 markdown-body">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}
                    
                    {/* Visual Command action execution confirmation list */}
                    {m.executedActions && m.executedActions.length > 0 && (
                      <div className="mt-3.5 pt-2 border-t border-[#222] space-y-1">
                        <span className="text-[7.5px] font-mono text-[#F27D26] uppercase tracking-wider block font-black">⚙️ ADMIN WORKFLOW AUTOMATIONS EXECUTED:</span>
                        {m.executedActions.map((act, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[8.5px] font-mono bg-[#160E0A] border border-[#f27d26]/10 text-white px-2 py-1 select-none">
                            <Zap className="w-2.5 h-2.5 text-[#F27D26] animate-pulse" />
                            <span className="font-extrabold text-[#F27D26] truncate">{act.split(' ')[0]}</span>
                            <span className="text-zinc-500 truncate">{act.substring(act.indexOf(' ') + 1)}</span>
                          </div>
                        ))}
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
            <div className="p-3 bg-[#0c0c0c] border-t border-[#222]/40">
              <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block mb-2 font-black">💡 QUICK AUTOMATION DESIGNS</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => executeChipAction(
                    "🤖 Suggest Topics", 
                    "Suggest 3 high-CPM, viral storytelling topics related to AI, creator economy, or automation."
                  )}
                  className="p-1 px-1.5 bg-[#0F0F0F] hover:bg-[#1C130D] border border-[#222] hover:border-[#F27D26]/40 text-zinc-300 hover:text-white text-[9px] font-mono text-left tracking-wide truncate transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Wand2 className="w-2.5 h-2.5 text-[#F27D26]" />
                  <span>💡 Ideate 3 Tech Topics</span>
                </button>
                <button
                  onClick={() => executeChipAction(
                    "🎬 Switc to Synthesizer", 
                    "Switch our focus module panel immediately to the audio composer so I can tune sound profiles."
                  )}
                  className="p-1 px-1.5 bg-[#0F0F0F] hover:bg-[#1C130D] border border-[#222] hover:border-[#F27D26]/40 text-zinc-300 hover:text-white text-[9px] font-mono text-left tracking-wide truncate transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-2.5 h-2.5 text-[#F27D26]" />
                  <span>🔊 Tune Synth Module</span>
                </button>
                <button
                  onClick={() => executeChipAction(
                    "🚀 Ground Self-Driving Cars", 
                    "Let's change focus model topic to 'Self-Driving Autonomous Car Fleets in 2026' and start a grounded real-time research query."
                  )}
                  className="p-1 px-1.5 bg-[#0F0F0F] hover:bg-[#1C130D] border border-[#222] hover:border-[#F27D26]/40 text-zinc-300 hover:text-white text-[9px] font-mono text-left tracking-wide truncate transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Video className="w-2.5 h-2.5 text-[#F27D26]" />
                  <span>⚙️ Run Grounded: Tesla Fleets</span>
                </button>
                <button
                  onClick={() => executeChipAction(
                    "🔥 Enhance prompting b-roll", 
                    "Develop an extremely cinematic, masterfully engineered imagery generation prompt I can use for my futuristic YouTube storyboard visuals."
                  )}
                  className="p-1 px-1.5 bg-[#0F0F0F] hover:bg-[#1C130D] border border-[#222] hover:border-[#F27D26]/40 text-zinc-300 hover:text-white text-[9px] font-mono text-left tracking-wide truncate transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Zap className="w-2.5 h-2.5 text-[#F27D26]" />
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
                  className="flex-grow bg-[#070707] border border-[#222] text-xs py-2 px-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#F27D26] font-mono font-light select-text"
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
