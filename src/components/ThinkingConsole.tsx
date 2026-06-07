import React, { useEffect, useRef } from 'react';
import { LogLine } from '../types';
import { Terminal, Copy, Shield, Sparkles } from 'lucide-react';

interface ThinkingConsoleProps {
  logs: LogLine[];
  onClear: () => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

export default function ThinkingConsole({ logs, onClear, isOpen = true, onToggleOpen }: ThinkingConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const copyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-[#0A0A0A] border border-[#222] rounded-none overflow-hidden flex flex-col h-full font-mono shadow-sm">
      {/* Console Header */}
      <div className="bg-[#0F0F0F] px-4 py-2.5 flex items-center justify-between border-b border-[#222] text-[10px] tracking-widest uppercase">
        <div className="flex items-center gap-2 text-[#888]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F27D26] animate-pulse"></span>
          <span className="font-extrabold text-[#F27D26]">live-agent-thinking.log</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={copyLogs}
            className="text-[#666] hover:text-white transition-colors uppercase font-bold tracking-widest cursor-pointer"
            title="Copy Logs"
          >
            Copy
          </button>
          <span className="text-[#333]">|</span>
          <button 
            onClick={onClear}
            className="text-[#666] hover:text-white transition-colors uppercase font-bold tracking-widest cursor-pointer"
          >
            Clear
          </button>
          {onToggleOpen && (
            <>
              <span className="text-[#333]">|</span>
              <button 
                onClick={onToggleOpen}
                className="text-[#F27D26] hover:text-white transition-colors uppercase font-black tracking-widest cursor-pointer select-none"
                title={isOpen ? "Collapse console" : "Expand console"}
              >
                {isOpen ? '[ COLLAPSE − ]' : '[ EXPAND + ]'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Log Output Area */}
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-1.5 text-[11px] leading-relaxed scrollbar-thin select-text text-[#AAA]"
      >
        {logs.length === 0 ? (
          <div className="text-[#555] italic h-full flex items-center justify-center gap-2">
            <span className="text-[#F27D26] animate-pulse">●</span>
            <span className="text-[10px] uppercase font-bold tracking-widest">Console idle. Awaiting topic context deployment.</span>
          </div>
        ) : (
          logs.map((log) => {
            let typeColor = "text-[#666]";
            let typePrefix = "INFO";

            if (log.type === "success") {
              typeColor = "text-emerald-500 font-bold uppercase tracking-wider";
              typePrefix = "SUCCESS";
            } else if (log.type === "warning") {
              typeColor = "text-amber-500 font-bold uppercase tracking-wider";
              typePrefix = "WARN";
            } else if (log.type === "thinking") {
              typeColor = "text-[#F27D26] font-bold uppercase tracking-wider";
              typePrefix = "THINK";
            }

            return (
              <div key={log.id} className="flex items-start gap-2.5 py-1 border-b border-[#111] last:border-0 hover:bg-[#111]/40 px-1 rounded transition-colors">
                <span className="text-[#444] select-none shrink-0 font-bold">[{log.timestamp}]</span>
                <span className={`text-[9px] uppercase tracking-widest shrink-0 w-16 select-none ${typeColor}`}>
                  {typePrefix}
                </span>
                <span className="text-[#E0E0E0] font-mono whitespace-pre-wrap flex-1">
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
