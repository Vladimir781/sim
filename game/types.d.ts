export interface AgentRenderData {
  id: number;
  x: number;
  y: number;
  mode: 'mlp' | 'fsm';
}

export interface WorldRenderData {
  width: number;
  height: number;
  tiles: {
    biome: string;
    resource: number;
    danger: number;
  }[];
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  weather: 'clear' | 'rain' | 'storm';
  tick: number;
}

export interface FramePayload {
  world: WorldRenderData;
  agents: AgentRenderData[];
  stats: {
    tick: number;
    fps: number;
    msPerTick: number;
    agents: number;
    talkRate: number;
    mlpAgents: number;
    fsmAgents: number;
  };
}

export interface TimelineItem {
  tick: number;
  description: string;
}

export interface AgentListRow {
  id: number;
  role: string;
  mode: string;
  thinkEvery: number;
  ms: number;
  talk: number;
  energy: number;
  heat: number;
  x: number;
  y: number;
}

export type WorkerMessage =
  | { type: 'FRAME'; payload: FramePayload }
  | { type: 'TIMELINE'; payload: TimelineItem[] }
  | { type: 'AGENT_LIST'; payload: { page: number; total: number; rows: AgentListRow[] } }
  | { type: 'SAVE_DONE'; payload: { slot: string } }
  | { type: 'LOAD_DONE'; payload: { slot: string } }
  | { type: 'ERROR'; payload: { code: string; message: string } };

export type UiToWorkerMessage =
  | { type: 'SIM'; payload: { command: 'start' | 'pause' | 'step'; speed?: number } }
  | { type: 'INIT'; payload: { settings: Record<string, unknown> } }
  | { type: 'WORLD'; payload: { action: 'regen'; seed: number } }
  | { type: 'AGENTS'; payload: { action: string; ids: number[]; value?: unknown } }
  | { type: 'PERF'; payload: { targetFps: number; tickRate: number } }
  | { type: 'SAVE'; payload: { slot: string; action: 'save' | 'load' | 'delete' } }
  | { type: 'EVENT'; payload: { type: string; action: 'trigger' | 'cancel' } };

// Type declaration stubs for JS modules are provided alongside the files.
