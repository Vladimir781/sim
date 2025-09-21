import { BASE_CONFIG } from '../data/config.js';
import { BRAIN_DEFAULT } from '../ai/brains/brain.default.u8arr.js';
import { TinyMLPBrain, decodeUint8Weights } from '../ai/models/tiny_mlp.js';
import { createWorld, WorldState, sampleResources, updateSeason, mutateWeather } from './world.js';
import { CommChannel } from './comms.js';
import { reinforceUpdate } from '../ai/learn/reinforce.js';
import { createStoryteller, stepStoryteller, StoryEvent } from './storyteller.js';

export type AgentMode = 'mlp' | 'fsm';

export interface AgentState {
  id: number;
  x: number;
  y: number;
  energy: number;
  heat: number;
  role: string;
  mode: AgentMode;
  thinkEvery: number;
  brain: TinyMLPBrain;
  weights: Float32Array;
  msHistory: number[];
  talkHistory: number[];
  muted: boolean;
  frozen: boolean;
  rewardBaseline: number;
}

export interface SimulationStats {
  tick: number;
  fps: number;
  msPerTick: number;
  agents: number;
  talkRate: number;
  mlpAgents: number;
  fsmAgents: number;
}

export interface SimulationSnapshot {
  world: WorldState;
  agents: AgentState[];
}

export interface SimulationOptions {
  seed?: number;
}

interface TrajectoryLog {
  logits: Float32Array;
  action: number;
  reward: number;
  baseline: number;
}

export class Simulation {
  readonly world: WorldState;
  readonly comms: CommChannel;
  readonly agents: AgentState[] = [];
  readonly timeline: StoryEvent[] = [];
  private readonly traj = new Map<number, TrajectoryLog[]>();
  private tickCount = 0;
  private readonly rng: () => number;
  private brainShape = { input: 32, hidden: 16, output: BASE_CONFIG.actionSpace.length };
  private readonly storyteller = createStoryteller();

  constructor(opts: SimulationOptions = {}) {
    this.world = createWorld(opts.seed);
    this.comms = new CommChannel(BASE_CONFIG.vocabSize, this.world.width, this.world.height);
    this.rng = mulberry32(this.world.tick + (opts.seed ?? 1));
    this.bootstrapAgents(BASE_CONFIG.maxAgents / 3);
  }

  private bootstrapAgents(count: number): void {
    const baseWeights = decodeUint8Weights(BRAIN_DEFAULT, {
      input: this.brainShape.input,
      hidden: this.brainShape.hidden,
      output: this.brainShape.output
    });
    for (let i = 0; i < count; i++) {
      const weights = new Float32Array(baseWeights);
      for (let j = 0; j < weights.length; j++) {
        weights[j] += (this.rng() - 0.5) * 0.02;
      }
      const brain = new TinyMLPBrain(this.brainShape, weights);
      const agent: AgentState = {
        id: i + 1,
        x: Math.floor(this.rng() * this.world.width),
        y: Math.floor(this.rng() * this.world.height),
        energy: 1,
        heat: 0,
        role: i % 3 === 0 ? 'harvester' : i % 3 === 1 ? 'builder' : 'scout',
        mode: 'mlp',
        thinkEvery: BASE_CONFIG.thinkEveryOptions[0],
        brain,
        weights,
        msHistory: [],
        talkHistory: [],
        muted: false,
        frozen: false,
        rewardBaseline: 0
      };
      this.agents.push(agent);
    }
  }

  step(deltaMs: number): SimulationStats {
    const t0 = performance.now();
    this.tickCount++;
    this.world.tick = this.tickCount;

    if (this.tickCount % 120 === 0) {
      updateSeason(this.world);
    }
    if (this.tickCount % 30 === 0) {
      mutateWeather(this.world, this.rng());
    }

    const event = stepStoryteller(this.storyteller, this.tickCount);
    if (event) {
      this.timeline.push(event);
      if (this.timeline.length > 32) this.timeline.shift();
    }

    for (const agent of this.agents) {
      if (agent.frozen) continue;
      if (this.tickCount % agent.thinkEvery !== 0) continue;
      const sense = this.buildObservation(agent);
      const start = performance.now();
      const policy = agent.mode === 'mlp' ? agent.brain.forward(sense) : this.fsmPolicy(agent, sense);
      const elapsed = performance.now() - start;
      agent.msHistory.push(elapsed);
      if (agent.msHistory.length > 60) agent.msHistory.shift();
      const action = this.sampleAction(policy);
      const reward = this.applyAction(agent, action);
      if (BASE_CONFIG.actionSpace[action] !== 'talk') {
        agent.talkHistory.push(0);
        if (agent.talkHistory.length > 60) agent.talkHistory.shift();
      }
      const logEntry: TrajectoryLog = {
        logits: policy.slice(),
        action,
        reward,
        baseline: agent.rewardBaseline
      };
      let steps = this.traj.get(agent.id);
      if (!steps) {
        steps = [];
        this.traj.set(agent.id, steps);
      }
      steps.push(logEntry);
      agent.rewardBaseline = agent.rewardBaseline * 0.9 + reward * 0.1;
      agent.energy = Math.max(0, Math.min(1.5, agent.energy + reward * 0.05 - 0.01));
      agent.heat = Math.max(0, Math.min(1, agent.heat + (action === 6 ? 0.05 : -0.01)));
    }

    if (BASE_CONFIG.learning.enabled && this.tickCount % BASE_CONFIG.learning.updateInterval === 0) {
      for (const agent of this.agents) {
        const steps = this.traj.get(agent.id);
        if (!steps?.length) continue;
        reinforceUpdate(agent.weights, steps, {
          learningRate: BASE_CONFIG.learning.learningRate,
          gradientClip: BASE_CONFIG.learning.gradientClip
        });
        this.traj.set(agent.id, []);
      }
    }

    this.comms.decay();
    const msPerTick = performance.now() - t0;
    return this.statsSnapshot(msPerTick);
  }

  private buildObservation(agent: AgentState): Float32Array {
    const vec = new Float32Array(this.brainShape.input);
    let idx = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = Math.min(this.world.width - 1, Math.max(0, agent.x + dx));
        const ny = Math.min(this.world.height - 1, Math.max(0, agent.y + dy));
        const tile = sampleResources(this.world, nx, ny);
        vec[idx++] = tile.resource;
        vec[idx++] = tile.danger;
      }
    }
    vec[idx++] = agent.energy;
    vec[idx++] = agent.heat;
    vec[idx++] = agent.thinkEvery;
    vec[idx++] = agent.mode === 'mlp' ? 1 : 0;
    while (idx < vec.length) {
      vec[idx++] = 0;
    }
    return vec;
  }

  private sampleAction(policy: Float32Array): number {
    let sum = 0;
    const r = Math.random();
    for (let i = 0; i < policy.length; i++) {
      sum += policy[i];
      if (r <= sum) return i;
    }
    return policy.length - 1;
  }

  private applyAction(agent: AgentState, action: number): number {
    switch (BASE_CONFIG.actionSpace[action]) {
      case 'move_n':
        agent.y = Math.max(0, agent.y - 1);
        return 0.02;
      case 'move_s':
        agent.y = Math.min(this.world.height - 1, agent.y + 1);
        return 0.02;
      case 'move_w':
        agent.x = Math.max(0, agent.x - 1);
        return 0.02;
      case 'move_e':
        agent.x = Math.min(this.world.width - 1, agent.x + 1);
        return 0.02;
      case 'gather': {
        const tile = sampleResources(this.world, agent.x, agent.y);
        return tile.resource * 0.05;
      }
      case 'build':
        return 0.01;
      case 'talk':
        if (!agent.muted) {
          const symbols = [Math.floor(Math.random() * BASE_CONFIG.vocabSize)];
          this.comms.push({ agentId: agent.id, symbols, tick: this.tickCount }, { x: agent.x, y: agent.y });
          agent.talkHistory.push(1);
          if (agent.talkHistory.length > 60) agent.talkHistory.shift();
          return 0.015;
        }
        return -0.02;
      case 'rest':
        agent.energy = Math.min(1.5, agent.energy + 0.05);
        return 0.03;
      default:
        return 0;
    }
  }

  private fsmPolicy(agent: AgentState, observation: Float32Array): Float32Array {
    const out = new Float32Array(BASE_CONFIG.actionSpace.length);
    const energy = observation[18];
    if (energy < 0.3) {
      out[BASE_CONFIG.actionSpace.indexOf('rest')] = 1;
    } else {
      const moves = ['move_n', 'move_s', 'move_w', 'move_e'];
      const choice = moves[Math.floor(Math.random() * moves.length)];
      out[BASE_CONFIG.actionSpace.indexOf(choice)] = 1;
    }
    return out;
  }

  toggleMute(agentId: number, value: boolean): void {
    const agent = this.agents.find((a) => a.id === agentId);
    if (agent) agent.muted = value;
  }

  freeze(agentId: number, value: boolean): void {
    const agent = this.agents.find((a) => a.id === agentId);
    if (agent) agent.frozen = value;
  }

  setThinkEvery(agentId: number, value: number): void {
    const agent = this.agents.find((a) => a.id === agentId);
    if (agent) agent.thinkEvery = value;
  }

  switchMode(agentId: number, mode: AgentMode): void {
    const agent = this.agents.find((a) => a.id === agentId);
    if (agent) agent.mode = mode;
  }

  killAgents(ids: number[]): void {
    for (const id of ids) {
      const index = this.agents.findIndex((a) => a.id === id);
      if (index >= 0) this.agents.splice(index, 1);
    }
  }

  agentRows(): {
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
  }[] {
    return this.agents.map((agent) => ({
      id: agent.id,
      role: agent.role,
      mode: agent.mode,
      thinkEvery: agent.thinkEvery,
      ms: average(agent.msHistory),
      talk: average(agent.talkHistory),
      energy: agent.energy,
      heat: agent.heat,
      x: agent.x,
      y: agent.y
    }));
  }

  snapshot(): SimulationSnapshot {
    return {
      world: this.world,
      agents: this.agents.map((a) => ({ ...a, brain: a.brain }))
    };
  }

  timelineEvents(): StoryEvent[] {
    return [...this.timeline];
  }

  statsSnapshot(msPerTick: number): SimulationStats {
    const talkRate =
      this.agents.reduce((acc, agent) => {
        const lastTalk = agent.talkHistory.length ? agent.talkHistory[agent.talkHistory.length - 1] : 0;
        return acc + lastTalk;
      }, 0) / (this.agents.length || 1);
    return {
      tick: this.tickCount,
      fps: BASE_CONFIG.renderFps,
      msPerTick,
      agents: this.agents.length,
      talkRate,
      mlpAgents: this.agents.filter((a) => a.mode === 'mlp').length,
      fsmAgents: this.agents.filter((a) => a.mode === 'fsm').length
    };
  }
}

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function average(values: number[]): number {
  if (!values.length) return 0;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}
