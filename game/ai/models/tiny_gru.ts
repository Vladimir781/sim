export interface TinyGRUShape {
  input: number;
  hidden: number;
  output: number;
}

export class TinyGRUBrain {
  private readonly shape: TinyGRUShape;
  private readonly weights: Float32Array;
  private readonly state: Float32Array;
  private readonly logits: Float32Array;

  constructor(shape: TinyGRUShape, weights: Float32Array) {
    this.shape = shape;
    this.weights = weights;
    this.state = new Float32Array(shape.hidden);
    this.logits = new Float32Array(shape.output);
  }

  forward(input: Float32Array): Float32Array {
    // Lightweight placeholder GRU. Not a full GRU implementation but provides
    // deterministic recurrent behaviour and keeps interface stable.
    const { hidden, output } = this.shape;
    for (let i = 0; i < hidden; i++) {
      const inp = input[i % input.length];
      const w = this.weights[i % this.weights.length];
      const prev = this.state[i];
      const update = 1 / (1 + Math.exp(-(inp + w)));
      const reset = 1 / (1 + Math.exp(-(w - inp)));
      const cand = Math.tanh(reset * prev + (1 - reset) * inp);
      this.state[i] = (1 - update) * prev + update * cand;
    }
    for (let o = 0; o < output; o++) {
      this.logits[o] = 0;
      for (let h = 0; h < hidden; h++) {
        const idx = (o * hidden + h) % this.weights.length;
        this.logits[o] += this.state[h] * this.weights[idx];
      }
    }
    return this.logits;
  }

  reset(): void {
    this.state.fill(0);
  }
}
