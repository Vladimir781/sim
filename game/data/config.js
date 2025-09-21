export const BASE_CONFIG = {
  tickRate: 12,
  renderFps: 45,
  vocabSize: 32,
  maxAgents: 80,
  thinkEveryOptions: [1, 2, 4],
  actionSpace: [
    'idle',
    'move_n',
    'move_s',
    'move_w',
    'move_e',
    'gather',
    'build',
    'talk',
    'rest'
  ],
  defaultBrain: 'mlp',
  learning: {
    enabled: false,
    updateInterval: 24,
    gradientClip: 0.5,
    learningRate: 0.0005
  },
  storytelling: {
    baseTension: 0.25,
    maxTension: 1.0,
    cooldownTicks: 90
  },
  channel: {
    cost: 1,
    length: [1, 3]
  }
};
