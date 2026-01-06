/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export enum GenerationStatus {
  IDLE = 'IDLE',
  SEGMENTING = 'SEGMENTING',
  LOADING = 'LOADING', // General loading state for parallel pipelines
  AUDITING = 'AUDITING',
  HEALING = 'HEALING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type ViewType = 'side' | 'top' | 'isometric' | 'unknown';

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface DetectedViews {
  side?: BoundingBox;
  top?: BoundingBox;
}

export interface GeneratedSvg {
  id: string;
  content: string;
  prompt: string;
  timestamp: number;
  auditReport?: string;
  viewType: ViewType;
}

export interface WarshipProject {
  id: string;
  sideView?: GeneratedSvg;
  topView?: GeneratedSvg;
  originalImage: ImageData;
}

export interface ApiError {
  message: string;
  details?: string;
}

export interface ImageData {
  data: string; // base64
  mimeType: string;
}
