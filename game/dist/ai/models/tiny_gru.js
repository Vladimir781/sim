export class TinyGRUBrain {
    constructor(shape, weights) {
        this.shape = shape;
        this.weights = weights;
        this.state = new Float32Array(shape.hidden);
        this.logits = new Float32Array(shape.output);
    }
    forward(input) {
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
    reset() {
        this.state.fill(0);
    }
}
