export interface AnalysisResult {
  normalizedNumber: string;
  riskScore: number;
  category: string;
  summary: string[];
  details: string[];
  actionGuide: string;
  closingMessage: string;
}

export interface HistoryItem extends AnalysisResult {
  id: string;
  timestamp: number;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}