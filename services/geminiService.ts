/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from "@google/genai";
import { ImageData, DetectedViews, BoundingBox, ViewType } from "../types";

const PRO_MODEL = 'gemini-3-pro-preview';
const FLASH_MODEL = 'gemini-3-flash-preview';

// --- IMAGE PROCESSING TOOLING ---

const cropImage = async (base64Data: string, box: BoundingBox): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Bounding box is 0-1000 scale from Gemini
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      const x = (box.xmin / 1000) * width;
      const y = (box.ymin / 1000) * height;
      const w = ((box.xmax - box.xmin) / 1000) * width;
      const h = ((box.ymax - box.ymin) / 1000) * height;

      // Add small padding
      const padding = 20;
      canvas.width = w + (padding * 2);
      canvas.height = h + (padding * 2);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // White background for cleaner vectorization
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw cropped portion
      ctx.drawImage(img, x, y, w, h, padding, padding, w, h);

      resolve({
        data: canvas.toDataURL('image/jpeg', 0.95),
        mimeType: 'image/jpeg'
      });
    };
    img.onerror = (e) => reject(e);
    img.src = base64Data;
  });
};

export const detectAndCropViews = async (imageData: ImageData): Promise<{ side?: ImageData, top?: ImageData }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: {
      parts: [
        { inlineData: { data: imageData.data.split(',')[1], mimeType: imageData.mimeType } },
        { text: "Identify the bounding boxes [0-1000] for the 'Side Profile View' and the 'Overhead/Top Deck View' of the ship in this schematic." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sideViewFound: { type: Type.BOOLEAN },
          sideViewBox: {
            type: Type.OBJECT,
            properties: {
              ymin: { type: Type.INTEGER },
              xmin: { type: Type.INTEGER },
              ymax: { type: Type.INTEGER },
              xmax: { type: Type.INTEGER },
            }
          },
          topViewFound: { type: Type.BOOLEAN },
          topViewBox: {
            type: Type.OBJECT,
            properties: {
              ymin: { type: Type.INTEGER },
              xmin: { type: Type.INTEGER },
              ymax: { type: Type.INTEGER },
              xmax: { type: Type.INTEGER },
            }
          }
        }
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  const crops: { side?: ImageData, top?: ImageData } = {};

  if (result.sideViewFound && result.sideViewBox) {
    crops.side = await cropImage(imageData.data, result.sideViewBox);
  }
  
  if (result.topViewFound && result.topViewBox) {
    crops.top = await cropImage(imageData.data, result.topViewBox);
  }

  return crops;
};

// --- GENERATION PIPELINE ---

/**
 * Stage 1: The Lead Architect (Pro) creates the initial draft.
 */
const generateDraft = async (ai: any, prompt: string, imageData: ImageData, viewType: ViewType): Promise<string> => {
  const contextInstruction = viewType === 'side' 
    ? "FOCUS: Side Profile. Pay attention to mast heights, funnel rakes, hull sheer lines, and freeboard." 
    : "FOCUS: Top/Overhead Deck Plan. Pay attention to beam width, turret rotation circles, deck planking patterns, and lifeboats.";

  const systemPrompt = `
    You are the Lead Naval Architect. Your goal is to reconstruct technical drawings into semantic SVG schematics.
    ${contextInstruction}
    
    CORE DIRECTIVES:
    1. **Semantic Grouping**: Use <g> tags with descriptive IDs (e.g., <g id="hull">, <g id="superstructure">).
    2. **Geometric Logic**: "Hallucinate" the perfect engineering geometry behind the fuzzy pixels.
    3. **Viewport**: Ensure the viewBox perfectly frames the ship.
    4. **Style**: Use stroke="black" fill="none" stroke-width="1" vector-effect="non-scaling-stroke".
  `;

  const response = await ai.models.generateContent({
    model: PRO_MODEL,
    contents: {
      parts: [
        { inlineData: { data: imageData.data.split(',')[1], mimeType: imageData.mimeType } },
        { text: `Reconstruct this ${viewType} view. ${prompt}` }
      ]
    },
    config: {
      systemInstruction: systemPrompt,
      thinkingConfig: { thinkingBudget: 16000 },
      temperature: 0.2
    }
  });
  return extractSvg(response.text);
};

/**
 * Stage 2: The Inspector (Flash) performs an adversarial audit.
 */
export const auditDraft = async (ai: any, originalImage: ImageData, draftSvg: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: {
      parts: [
        { inlineData: { data: originalImage.data.split(',')[1], mimeType: originalImage.mimeType } },
        { text: `SOURCE_IMAGE: (Attached)\n\nVECTOR_DRAFT_CODE:\n${draftSvg.slice(0, 50000)}... \n\nConduct a technical audit. List missing features or distortions.` }
      ]
    },
    config: {
      systemInstruction: "You are the Inspector General. Find flaws in the vector conversion.",
      thinkingConfig: { thinkingBudget: 4000 },
    }
  });
  return response.text || "No major issues found.";
};

/**
 * Stage 3: The Healer (Pro) fixes the draft based on the audit.
 */
const healDraft = async (ai: any, originalImage: ImageData, draftSvg: string, auditReport: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: PRO_MODEL,
    contents: {
      parts: [
        { inlineData: { data: originalImage.data.split(',')[1], mimeType: originalImage.mimeType } },
        { text: `DRAFT_SVG:\n${draftSvg}\n\nINSPECTOR_AUDIT_REPORT:\n${auditReport}\n\nExecute the repairs.` }
      ]
    },
    config: {
      systemInstruction: "You are the Senior Correction Engineer. Fix the SVG based on the audit without regression.",
      thinkingConfig: { thinkingBudget: 24000 },
      temperature: 0.1
    }
  });
  return extractSvg(response.text);
};

const extractSvg = (text: string): string => {
  const match = text.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? match[0] : text.replace(/```(xml|svg)?/g, '').trim();
};

/**
 * Orchestrates the full adversarial pipeline for a SPECIFIC view.
 */
export const runViewPipeline = async (
  prompt: string, 
  imageData: ImageData,
  viewType: ViewType,
  onStatusChange: (status: string) => void
): Promise<{ content: string, auditReport: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  onStatusChange(`DRAFTING_${viewType.toUpperCase()}`);
  const draft = await generateDraft(ai, prompt, imageData, viewType);

  onStatusChange(`AUDITING_${viewType.toUpperCase()}`);
  const audit = await auditDraft(ai, imageData, draft);

  onStatusChange(`HEALING_${viewType.toUpperCase()}`);
  const healed = await healDraft(ai, imageData, draft, audit);

  return { content: healed, auditReport: audit };
};

/**
 * Standard refinement (legacy support for user direct chat)
 */
export const generateWarshipSvg = async (prompt: string, imageData?: ImageData, previousSvg?: string, iteration: number = 1): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];
  
  const systemPrompt = `Refine this SVG. Iteration ${iteration}.`;

  if (imageData) parts.push({ inlineData: { data: imageData.data.split(',')[1], mimeType: imageData.mimeType } });
  if (previousSvg) parts.push({ text: `CURRENT_SVG_STATE:\n${previousSvg}` });
  parts.push({ text: `User Instruction: ${prompt}` });

  const response = await ai.models.generateContent({
    model: PRO_MODEL,
    contents: { parts },
    config: { 
      systemInstruction: systemPrompt, 
      thinkingConfig: { thinkingBudget: 20000 } 
    }
  });
  return extractSvg(response.text);
};
