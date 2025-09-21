export function applyGradient(
  weights: Float32Array,
  gradient: Float32Array,
  learningRate: number,
  clip: number
): void {
  let norm = 0;
  for (let i = 0; i < gradient.length; i++) {
    norm += gradient[i] * gradient[i];
  }
  norm = Math.sqrt(norm);
  const scale = norm > clip ? clip / (norm + 1e-6) : 1;
  for (let i = 0; i < weights.length; i++) {
    weights[i] += -learningRate * gradient[i] * scale;
  }
}
