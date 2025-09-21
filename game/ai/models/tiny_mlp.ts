import { gemv } from '../math/gemv.js';
import { relu, softmax } from '../math/activations.js';

export interface TinyMLPShape {
  input: number;
  hidden: number;
  output: number;
}

export class TinyMLPBrain {
  private readonly shape: TinyMLPShape;
  private readonly weights1: Float32Array;
  private readonly bias1: Float32Array;
  private readonly weights2: Float32Array;
  private readonly bias2: Float32Array;
  private readonly hidden: Float32Array;
  private readonly output: Float32Array;

  constructor(shape: TinyMLPShape, params: Float32Array) {
    this.shape = shape;
    const { input, hidden, output } = shape;
    const w1Size = input * hidden;
    const b1Size = hidden;
    const w2Size = hidden * output;
    const b2Size = output;
    this.weights1 = params.subarray(0, w1Size);
    this.bias1 = params.subarray(w1Size, w1Size + b1Size);
    this.weights2 = params.subarray(w1Size + b1Size, w1Size + b1Size + w2Size);
    this.bias2 = params.subarray(w1Size + b1Size + w2Size, w1Size + b1Size + w2Size + b2Size);
    this.hidden = new Float32Array(hidden);
    this.output = new Float32Array(output);
  }

  forward(input: Float32Array): Float32Array {
    const { input: inputSize, hidden, output } = this.shape;
    if (input.length !== inputSize) {
      throw new Error(`Expected ${inputSize} inputs, got ${input.length}`);
    }
    gemv(this.hidden, this.weights1, input, hidden, inputSize);
    for (let i = 0; i < hidden; i++) {
      this.hidden[i] += this.bias1[i];
    }
    relu(this.hidden);
    gemv(this.output, this.weights2, this.hidden, output, hidden);
    for (let i = 0; i < output; i++) {
      this.output[i] += this.bias2[i];
    }
    softmax(this.output);
    return this.output;
  }

  serialize(): Float32Array {
    return new Float32Array([
      ...this.weights1,
      ...this.bias1,
      ...this.weights2,
      ...this.bias2
    ]);
  }
}

export function decodeUint8Weights(raw: Uint8Array, shape: TinyMLPShape): Float32Array {
  const expected = shape.input * shape.hidden + shape.hidden + shape.hidden * shape.output + shape.output;
  if (raw.length < expected) {
    throw new Error(`Insufficient bytes to build brain. expected ${expected}, got ${raw.length}`);
  }
  const params = new Float32Array(expected);
  for (let i = 0; i < expected; i++) {
    params[i] = raw[i] / 255 - 0.5;
  }
  return params;
}
