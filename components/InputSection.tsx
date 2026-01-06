/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useRef } from 'react';
import { Send, Loader2, Upload, X, Ship, Shield } from 'lucide-react';
import { GenerationStatus, ImageData } from '../types';

interface InputSectionProps {
  onGenerate: (prompt: string, image?: ImageData) => void;
  status: GenerationStatus;
}

export const InputSection: React.FC<InputSectionProps> = ({ onGenerate, status }) => {
  const [input, setInput] = useState('');
  const [image, setImage] = useState<ImageData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage({
          data: event.target?.result as string,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (status !== GenerationStatus.LOADING) {
      onGenerate(input.trim(), image || undefined);
    }
  }, [input, image, status, onGenerate]);

  const clearImage = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isLoading = status === GenerationStatus.LOADING;

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 px-4">
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4">
          <div className="bg-indigo-600/20 p-3 rounded-full border border-indigo-500/30">
            <Ship className="w-8 h-8 text-indigo-400" />
          </div>
        </div>
        <h2 className="text-4xl font-black text-white mb-2 tracking-tight uppercase">
          Warship Architect
        </h2>
        <p className="text-zinc-400 text-lg font-medium">
          Upload schematics for a multi-stage <span className="text-indigo-400 underline decoration-indigo-500/30 underline-offset-4">Adversarial Loop</span> conversion.
        </p>
      </div>

      <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-6 backdrop-blur-sm shadow-xl">
        {!image ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group cursor-pointer mb-6 border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 rounded-xl p-12 transition-all duration-300 bg-zinc-950/30 flex flex-col items-center justify-center gap-4"
          >
            <div className="p-4 bg-zinc-900 rounded-full group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-zinc-500 group-hover:text-indigo-400" />
            </div>
            <div className="text-center">
              <p className="text-zinc-300 font-semibold text-lg">Upload Technical Drawing</p>
              <p className="text-zinc-500 text-sm mt-1">Ready for 3-Stage Pipeline Analysis</p>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
        ) : (
          <div className="relative mb-6 rounded-xl overflow-hidden border border-white/10 group">
            <img src={image.data} alt="Draft" className="w-full h-64 object-contain bg-zinc-950 p-4" />
            <button onClick={clearImage} className="absolute top-4 right-4 p-2 bg-red-500 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex justify-between items-center">
              <p className="text-xs text-zinc-300 font-mono tracking-widest">SOURCE_SCAN_IDENTIFIED</p>
              <Shield className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Design constraints..."
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            disabled={(!image && !input.trim()) || isLoading}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold uppercase tracking-widest transition-all duration-300 ${(!image && !input.trim()) || isLoading ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50' : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98] shadow-lg shadow-indigo-600/20'}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Running Loop...</span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                <span>Deploy Pipeline</span>
                <Send className="w-5 h-5 ml-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
