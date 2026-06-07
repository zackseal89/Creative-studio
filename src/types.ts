export interface SourceLink {
  title: string;
  url: string;
}

export interface ResearchInsight {
  facts: string[];
  hooks: string[];
  rawSummary: string;
  sources: SourceLink[];
}

export interface ContentPoint {
  milestone: string;
  description: string;
}

export interface ContentPlan {
  plan: ContentPoint[];
  brief: string;
}

export interface LogLine {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'thinking';
}

export type WorkflowPhase = 'idle' | 'researching' | 'planned' | 'scripting' | 'completed';

export interface ScriptState {
  topic: string;
  phase: WorkflowPhase;
  research: ResearchInsight | null;
  plan: ContentPlan | null;
  script: string | null;
  logs: LogLine[];
  revisions?: any[];
}
