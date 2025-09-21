export interface BaseConfig {
  tickRate: number;
  renderFps: number;
  vocabSize: number;
  maxAgents: number;
  thinkEveryOptions: number[];
  actionSpace: string[];
  defaultBrain: string;
  learning: {
    enabled: boolean;
    updateInterval: number;
    gradientClip: number;
    learningRate: number;
  };
  storytelling: {
    baseTension: number;
    maxTension: number;
    cooldownTicks: number;
  };
  channel: {
    cost: number;
    length: [number, number];
  };
}

export const BASE_CONFIG: BaseConfig;
