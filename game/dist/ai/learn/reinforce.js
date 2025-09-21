import { applyGradient } from '../math/optim.js';
export function reinforceUpdate(weights, traj, cfg) {
    if (!traj.length)
        return;
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
