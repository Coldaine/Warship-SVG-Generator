/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState } from 'react';
import { Download, CheckCircle2, Code, RefreshCw, Send, Layers } from 'lucide-react';
import { GeneratedSvg } from '../types';

interface SvgPreviewProps {
  data: GeneratedSvg | null;
  onRefine: (prompt: string) => void;
  isLoading: boolean;
}

export const SvgPreview: React.FC<SvgPreviewProps> = ({ data, onRefine, isLoading }) => {
  const [copied, setCopied] = useState(false);
  const [blueprintMode, setBlueprintMode] = useState(true);
  const [refinementText, setRefinementText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCopied(false);
  }, [data]);

  if (!data) return null;

  const handleDownload = () => {
    const blob = new Blob([data.content], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blueprint-${data.id.slice(0,4)}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(data.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitRefinement = (e: React.FormEvent) => {
    e.preventDefault();
    if (refinementText.trim() && !isLoading) {
      onRefine(refinementText);
      setRefinementText('');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 animate-fade-in">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-950/50">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500/10 p-2 rounded-lg">
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block font-mono uppercase leading-none mb-1">Vector Instance</span>
              <span className="text-xs text-white font-bold tracking-tight">SHIP_UNIT_{data.id.slice(0, 6).toUpperCase()}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setBlueprintMode(!blueprintMode)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                blueprintMode 
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' 
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              {blueprintMode ? 'CYANOTYPE' : 'LIGHTBOX'}
            </button>
            <button
              onClick={handleCopyCode}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Code className="w-5 h-5" />}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-zinc-950 bg-white rounded-lg hover:bg-zinc-200 transition-colors uppercase tracking-widest"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div className={`p-8 sm:p-16 flex items-center justify-center min-h-[500px] relative transition-all duration-500 ${
          blueprintMode 
            ? 'bg-[#003366] bg-[linear-gradient(#ffffff08_1px,transparent_1px),linear-gradient(90deg,#ffffff08_1px,transparent_1px)] bg-[size:30px_30px]' 
            : 'bg-zinc-100 bg-[linear-gradient(#00000008_1px,transparent_1px),linear-gradient(90deg,#00000008_1px,transparent_1px)] bg-[size:30px_30px]'
        }`}>
          <div 
            ref={containerRef}
            className={`w-full h-auto transition-all duration-700 filter drop-shadow-2xl flex justify-center ${
              blueprintMode ? 'invert brightness-[5] contrast-[2] saturate-0' : 'brightness-90 contrast-125'
            }`}
            dangerouslySetInnerHTML={{ __html: data.content }} 
          />
          
          {/* Viewport Marks */}
          <div className={`absolute inset-6 border pointer-events-none transition-colors ${blueprintMode ? 'border-white/10' : 'border-black/5'}`}>
            <div className={`absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 ${blueprintMode ? 'border-indigo-400' : 'border-zinc-400'}`}></div>
            <div className={`absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 ${blueprintMode ? 'border-indigo-400' : 'border-zinc-400'}`}></div>
            <div className={`absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 ${blueprintMode ? 'border-indigo-400' : 'border-zinc-400'}`}></div>
            <div className={`absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 ${blueprintMode ? 'border-indigo-400' : 'border-zinc-400'}`}></div>
          </div>
        </div>
        
        {/* Refinement Interface */}
        <div className="p-4 bg-zinc-950 border-t border-white/5">
          <form onSubmit={submitRefinement} className="flex gap-2">
            <div className="relative flex-1">
              <RefreshCw className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 ${isLoading ? 'animate-spin' : ''}`} />
              <input
                type="text"
                value={refinementText}
                onChange={(e) => setRefinementText(e.target.value)}
                placeholder="Request specific refinements (e.g. 'Add primary armament labels', 'Improve hull curve')..."
                className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!refinementText.trim() || isLoading}
              className="px-6 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isLoading ? 'Processing...' : <><Send className="w-3.5 h-3.5" /> Refine</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
