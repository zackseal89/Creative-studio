import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Eye, 
  Sparkles, 
  Copy, 
  Check, 
  FileText, 
  X, 
  Image, 
  ArrowRight,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ImageAnalystProps {
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'thinking') => void;
}

export default function ImageAnalyst({ addLog }: ImageAnalystProps) {
  const [imageBuffer, setImageBuffer] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [customPrompt, setCustomPrompt] = useState<string>('Analyze composition, lighting physics, and style. Recommend a Midjourney v6 b-roll text prompt.');
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preset question prompt options
  const ANALYSIS_PRESETS = [
    { text: 'Analyze composition, lighting physics, and style. Recommend a Midjourney v6 b-roll text prompt.', label: '🎬 Cinematic B-roll Prompt Extraction' },
    { text: 'Deconstruct color palettes and recommend a consistent video color-grading theme coordinate.', label: '🎨 Color Palette & Grade Theme' },
    { text: 'Suggest extreme high-retention YouTube thumbnail hook designs based on this visual anchor.', label: '🎯 YouTube Thumbnail Layout Strategy' },
    { text: 'Evaluate this image as a technical storyboard sketch. Suggest pacing edits and script triggers.', label: '📊 Storyboard-to-Script Analysis' },
  ];

  // Manual Trigger files selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  // Drag over handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Loader reading local image data to Base64
  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addLog("Invalid uploaded item. Content must be an image format (PNG, JPEG).", "warning");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImageBuffer(reader.result as string);
      addLog(`Loaded storyboard reference: "${file.name}" (${(file.size / 1024).toFixed(1)} KB).`, "success");
    };
    reader.readAsDataURL(file);
  };

  // Clear current upload buffer
  const handleClearImage = () => {
    setImageBuffer(null);
    setImageFile(null);
    setReportResult(null);
    addLog("Reference image buffer cleared.", "info");
  };

  // Submit base64 to Gemini Visual Analyst route
  const handleInspectImage = async () => {
    if (!imageBuffer) return;

    setIsAnalyzing(true);
    setReportResult(null);
    addLog("Publishing payload coordinates to Gemini multimodal pipeline...", "info");
    addLog("Instructing Vision decoder to inspect colors, lighting depth, and visual structures...", "thinking");

    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBuffer,
          prompt: customPrompt
        })
      });

      if (!response.ok) {
        throw new Error(`Visual analysis throttled with status: ${response.status}`);
      }

      const data = await response.json();
      setReportResult(data.report);
      addLog("Multimodal visual audit compile success.", "success");

    } catch (err: any) {
      addLog(`Failed to analyze reference artwork: ${err.message}`, "warning");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Copy result text code
  const handleCopyReport = () => {
    if (!reportResult) return;
    navigator.clipboard.writeText(reportResult);
    setHasCopied(true);
    addLog("Copied image analysis report with prompts to clipboard.", "success");
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div className="bg-[#0A0A0A] border border-[#222] min-h-[450px] overflow-hidden flex flex-col h-full shadow-lg">
      
      {/* Title Header area */}
      <div className="bg-[#0F0F0F] px-8 py-4 border-b border-[#222] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image className="w-5 h-5 text-[#F27D26]" />
          <div>
            <h4 className="font-extrabold text-[12px] uppercase text-zinc-100 tracking-widest">05 . Visage Image Analyst Hub</h4>
            <p className="text-[10px] text-[#777] uppercase tracking-wide">Upload storyboards, reference visuals, or thumbnail sketches to extract cinematic prompts</p>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 overflow-y-auto">
        
        {/* Left column (5 cols): Upload zone and queries config */}
        <div className="xl:col-span-5 p-6 lg:p-8 border-b xl:border-b-0 xl:border-r border-[#222] flex flex-col justify-between gap-6">
          
          <div className="space-y-4">
            <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-[#F27D26] flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4" />
              <span>Grounded reference upload</span>
            </span>

            {/* Drag & Drop Upload Space */}
            {!imageBuffer ? (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-none p-10 text-center flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-[#F27D26] bg-amber-950/10' 
                    : 'border-[#222] bg-[#0E0E0E] hover:border-[#333]'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="p-3.5 bg-[#050505] border border-[#222]">
                  <Image className="w-6 h-6 text-zinc-500 animate-pulse" />
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-300">Drag & drop your reference artwork</p>
                  <p className="text-[9px] text-[#555] uppercase tracking-wide mt-1.5">or click to browse filesystem</p>
                </div>
                <div className="bg-[#151515] px-3 py-1 text-[8px] font-mono text-zinc-500 uppercase tracking-widest border border-[#222]">
                  PNG, JPEG / MAX 5MB
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border border-[#222] bg-[#0E0E0E] p-4 relative flex items-center justify-center">
                  <button
                    onClick={handleClearImage}
                    className="absolute top-2 right-2 p-1 bg-black/60 border border-[#222] hover:border-red-500 text-[#777] hover:text-white transition-colors cursor-pointer"
                    title="Remove reference"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <img 
                    src={imageBuffer} 
                    alt="Uploaded Board" 
                    className="max-h-[220px] object-contain border border-[#111] bg-black shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex items-center justify-between text-[9px] font-mono text-[#555] uppercase">
                  <span>NAME: {imageFile?.name.substring(0, 20)}...</span>
                  <span>SIZE: {((imageFile?.size || 0) / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            )}

            {/* Prompt Selector & Tuning Area */}
            {imageBuffer && (
              <div className="space-y-3.5 pt-2">
                <label className="text-[9px] font-mono font-extrabold text-[#777] uppercase block">
                  Select Visual Analysis Directive
                </label>
                <div className="flex flex-col gap-1.5">
                  {ANALYSIS_PRESETS.map((preset) => (
                    <button
                      key={preset.text}
                      onClick={() => setCustomPrompt(preset.text)}
                      className={`text-left text-[9px] py-2 px-3 border transition-colors outline-none cursor-pointer uppercase font-mono tracking-wider ${
                        customPrompt === preset.text 
                          ? 'bg-zinc-900 border-[#F27D26] text-[#F27D26] font-bold' 
                          : 'bg-[#0E0E0E] border-[#222] text-[#888] hover:text-zinc-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <span className="text-[8px] font-mono text-zinc-500 font-extrabold uppercase">Custom Question Outline:</span>
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Ask specific focus directives..."
                    className="w-full bg-[#050505] p-2.5 text-[10px] font-mono text-zinc-300 border border-[#222] outline-none focus:border-[#F27D26] uppercase"
                  />
                </div>
              </div>
            )}

          </div>

          {/* Master trigger buttons */}
          {imageBuffer && (
            <button
              onClick={handleInspectImage}
              disabled={isAnalyzing}
              className="w-full py-3 bg-[#F27D26] hover:bg-white text-black font-extrabold text-[10px] uppercase tracking-widest transition-all cursor-pointer select-none border border-[#F27D26] hover:border-white disabled:opacity-40"
            >
              {isAnalyzing ? (
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>DECODING VISUALS WITH GEMINI...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 fill-black" />
                  <span>Execute Visual Audit</span>
                </div>
              )}
            </button>
          )}

        </div>

        {/* Right column (7 cols): Generated markdown visual report */}
        <div className="xl:col-span-7 bg-[#050505] flex flex-col overflow-hidden border-t xl:border-t-0 border-[#222]">
          
          {/* Output controller header */}
          <div className="bg-[#0A0A0A] px-6 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <span className="text-[9px] font-mono font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-600" />
              <span>Intelligence visual audit report</span>
            </span>
            
            {reportResult && (
              <button
                onClick={handleCopyReport}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#222] text-[#AAA] hover:text-white uppercase font-mono text-[9px] cursor-pointer select-none hover:border-[#F27D26] transition-colors"
              >
                {hasCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{hasCopied ? 'Copied Report' : 'Copy Prompt / Text'}</span>
              </button>
            )}
          </div>

          {/* Results Canvas */}
          <div className="flex-grow p-6 lg:p-8 overflow-y-auto select-text font-serif">
            {isAnalyzing ? (
              <div className="h-full flex flex-col justify-center items-center text-center space-y-4">
                <div className="p-4 bg-[#111] border border-[#222]">
                  <Sparkles className="w-6 h-6 text-[#F27D26] animate-pulse" />
                </div>
                <div className="space-y-1 select-none">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#F27D26]">Running Decoupled Multimodal Pass</p>
                  <p className="text-[9px] text-[#777] uppercase tracking-widest max-w-[280px]">Comparing shapes, ambient lighting paths, and stylistic weights with Youtube high-retention indexes.</p>
                </div>
              </div>
            ) : reportResult ? (
              <div className="prose prose-invert max-w-none text-zinc-300 text-xs leading-relaxed font-sans prose-headings:font-serif prose-headings:italic">
                <div className="markdown-body">
                  <ReactMarkdown>{reportResult}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center space-y-4 select-none">
                <div className="p-3 bg-[#0E0E0E] border border-[#222]/50 text-zinc-500">
                  <Eye className="w-6 h-6 text-[#444]" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Awaiting Visual reference</p>
                  <p className="text-[9px] text-[#444] uppercase tracking-wide max-w-[280px] mx-auto">
                    Upload a file on the left and trigger analysis to review lighting directions, color patterns, and prompt coordinates.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer stats feedback */}
          {reportResult && (
            <div className="bg-[#0A0A0A] border-t border-[#222] px-6 py-3 flex items-center justify-between text-[8px] font-mono text-zinc-600 uppercase select-none">
              <span>Vision Processor: GM-3.5-FL-Grounded</span>
              <span className="flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-[#F27D26]" />
                <span>Tips: Copy and replace visual storyboard prompt coordinates directly</span>
              </span>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
