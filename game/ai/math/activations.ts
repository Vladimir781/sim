export function relu(vec: Float32Array): void {
  for (let i = 0; i < vec.length; i++) {
    if (vec[i] < 0) vec[i] = 0;
  }
}

export function softmax(vec: Float32Array): void {
  let max = -Infinity;
  for (const v of vec) {
    if (v > max) max = v;
  }
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    vec[i] = Math.exp(vec[i] - max);
    sum += vec[i];
  }
  for (let i = 0; i < vec.length; i++) {
    vec[i] /= sum;
  }
}
