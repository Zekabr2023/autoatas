
export enum AppState {
  IDLE,
  FILE_SELECTED,
  TRANSCRIBING,
  TRANSCRIBED,
  GENERATING,
  GENERATED,
}

export enum MinutesTemplate {
  FORMAL = 'formal',
  SUMMARY = 'summary',
  AGENDA = 'agenda',
}

export interface TokenUsage {
  id: string;
  timestamp: string;
  transcriptionUsage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
  };
  generationUsage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
  };
  condoName?: string;
  minuteId?: string;
}
