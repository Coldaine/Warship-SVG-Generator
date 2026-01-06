/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { InputSection } from './components/InputSection';
import { SvgPreview } from './components/SvgPreview';
import { detectAndCropViews, runViewPipeline, generateWarshipSvg } from './services/geminiService';
import { WarshipProject, GenerationStatus, ApiError, ImageData, ViewType } from './types';
import { AlertCircle, ShieldAlert, CheckCircle2, RefreshCw, Scissors, ScanLine } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [project, setProject] = useState<WarshipProject | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('side');
  const [error, setError] = useState<ApiError | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<string>('');

  const handleGenerate = async (prompt: string, imageData?: ImageData) => {
    setStatus(GenerationStatus.SEGMENTING);
    setPipelineStatus("SCANNING_LAYOUT");
    setError(null);
    
    // Use new image or existing project image
    const imageToProcess = imageData || project?.originalImage;
    if (!imageToProcess) return;

    try {
      // 1. Tooling Phase: Segment the image
      const crops = await detectAndCropViews(imageToProcess);
      
      const newProject: WarshipProject = {
        id: crypto.randomUUID(),
        originalImage: imageToProcess,
      };

      setStatus(GenerationStatus.LOADING);

      // 2. Parallel Pipelines
      const promises = [];
      
      if (crops.side) {
         promises.push(runViewPipeline(prompt, crops.side, 'side', (s) => setPipelineStatus(s))
           .then(res => {
             newProject.sideView = {
               id: crypto.randomUUID(),
               content: res.content,
               prompt,
               timestamp: Date.now(),
               auditReport: res.auditReport,
               viewType: 'side'
             };
           }));
      }

      if (crops.top) {
        promises.push(runViewPipeline(prompt, crops.top, 'top', (s) => setPipelineStatus(s))
          .then(res => {
            newProject.topView = {
              id: crypto.randomUUID(),
              content: res.content,
              prompt,
              timestamp: Date.now(),
              auditReport: res.auditReport,
              viewType: 'top'
            };
          }));
      }

      if (promises.length === 0) {
        throw new Error("Could not identify distinct views in the schematic.");
      }

      await Promise.all(promises);
      
      setProject(newProject);
      // Default to side view if available, else top
      setActiveView(newProject.sideView ? 'side' : 'top');
      setStatus(GenerationStatus.SUCCESS);

    } catch (err: any) {
      console.error(err);
      setStatus(GenerationStatus.ERROR);
      setError({ message: "Pipeline Failure", details: err.message });
    } finally {
      setPipelineStatus('');
    }
  };

  const handleRefine = async (prompt: string) => {
    if (!project) return;
    setStatus(GenerationStatus.LOADING);
    setPipelineStatus("REFINING_ACTIVE_VIEW");
    
    try {
      const currentSvg = activeView === 'side' ? project.sideView : project.topView;
      const imageUsed = project.originalImage; // Ideally we use the cropped one but we didn't save it to state to save memory. 
      // For refinement, we can just use the previous SVG context.
      
      const refinedContent = await generateWarshipSvg(prompt, undefined, currentSvg?.content);
      
      const updatedSvg = {
        ...currentSvg!,
        content: refinedContent,
        prompt,
        timestamp: Date.now()
      };

      setProject(prev => {
        if (!prev) return null;
        return {
          ...prev,
          [activeView === 'side' ? 'sideView' : 'topView']: updatedSvg
        };
      });
      setStatus(GenerationStatus.SUCCESS);

    } catch(err: any) {
      setStatus(GenerationStatus.ERROR);
      setError({ message: "Refinement Failed", details: err.message });
    }
  };

  const getStatusLabel = () => {
    if (status === GenerationStatus.SEGMENTING) return "TOOLING: Analyzing Layout & Cropping Views...";
    if (pipelineStatus.includes("DRAFTING")) return "ARCHITECT: Constructing Geometry...";
    if (pipelineStatus.includes("AUDITING")) return "ADVERSARY: Inspecting for Flaws...";
    if (pipelineStatus.includes("HEALING")) return "ARCHITECT: Performing Self-Correction...";
    return "Processing Neural Pipeline...";
  };

  const currentSvg = project ? (activeView === 'side' ? project.sideView : project.topView) : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">      
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <main className="relative pb-20 pt-12">
        <InputSection 
          onGenerate={handleGenerate} 
          status={status} 
        />
        
        {(status === GenerationStatus.LOADING || status === GenerationStatus.SEGMENTING) && (
          <div className="max-w-2xl mx-auto mt-8 px-4 animate-pulse">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-6 flex flex-col items-center gap-4 text-center">
              {status === GenerationStatus.SEGMENTING ? (
                 <Scissors className="w-8 h-8 text-indigo-400 animate-bounce" />
              ) : (
                 <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              )}
              <div>
                <h4 className="font-bold text-white tracking-widest uppercase text-sm mb-1">{getStatusLabel()}</h4>
                <p className="text-xs text-indigo-300/60 font-mono">Gemini Multi-View Processor Active</p>
              </div>
            </div>
          </div>
        )}

        {status === GenerationStatus.ERROR && error && (
          <div className="max-w-2xl mx-auto mt-8 px-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-200">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-400">{error.message}</h4>
                <p className="text-sm text-red-300/70 mt-1">{error.details}</p>
              </div>
            </div>
          </div>
        )}

        {project && (
          <div className="mt-8 max-w-6xl mx-auto px-4">
            {/* View Switching Tabs */}
            <div className="flex gap-2 mb-4">
              {project.sideView && (
                <button
                  onClick={() => setActiveView('side')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${
                    activeView === 'side' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  <ScanLine className="w-4 h-4" /> Side Profile
                </button>
              )}
              {project.topView && (
                <button
                  onClick={() => setActiveView('top')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${
                    activeView === 'top' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  <Layers className="w-4 h-4" /> Deck Plan
                </button>
              )}
            </div>

            {/* Audit Summary */}
            {currentSvg?.auditReport && status === GenerationStatus.SUCCESS && (
               <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-start gap-4 shadow-lg mb-4">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest">
                         Inspector General Report ({activeView.toUpperCase()})
                      </span>
                      <div className="h-px flex-1 bg-zinc-800"></div>
                      <span className="text-[10px] font-mono text-green-500 uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Resolved
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 leading-relaxed font-mono line-clamp-2 hover:line-clamp-none transition-all cursor-help">
                      {currentSvg.auditReport}
                    </div>
                  </div>
               </div>
            )}
            
            <SvgPreview data={currentSvg} onRefine={handleRefine} isLoading={status === GenerationStatus.LOADING} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
// Helper import for Layers icon was missing in previous snippet if not careful, added to imports.
import { Layers } from 'lucide-react'; 
