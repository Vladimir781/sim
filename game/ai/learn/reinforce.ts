import { applyGradient } from '../math/optim.js';

export interface TrajectoryStep {
  logits: Float32Array;
  action: number;
  reward: number;
  baseline: number;
}

export interface ReinforceConfig {
  learningRate: number;
  gradientClip: number;
}

export function reinforceUpdate(
  weights: Float32Array,
  traj: TrajectoryStep[],
  cfg: ReinforceConfig
): void {
  if (!traj.length) return;
  const grad = new Float32Array(weights.length);
  for (const step of traj) {
    const advantage = step.reward - step.baseline;
    const prob = Math.max(step.logits[step.action], 1e-5);
    const scale = advantage / prob;
    for (let i = 0; i < grad.length; i++) {
      grad[i] += scale * (Math.random() * 0.01 - 0.005);
    }
  }
  applyGradient(weights, grad, cfg.learningRate, cfg.gradientClip);
}
