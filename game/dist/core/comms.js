export class CommChannel {
    constructor(vocab, width, height) {
        this.log = [];
        this.vocab = vocab;
        this.width = width;
        this.height = height;
        this.heat = new Array(width * height).fill(0);
    }
    push(message, position) {
        if (message.symbols.some((s) => s >= this.vocab))
            return;
        this.log.push(message);
        const idx = position.y * this.width + position.x;
        this.heat[idx] = Math.min(this.heat[idx] + 1, 255);
    }
    decay() {
        for (let i = 0; i < this.heat.length; i++) {
            this.heat[i] *= 0.95;
        }
    }
    latest(limit = 10) {
        return this.log.slice(-limit);
    }
    getHeat() {
        return this.heat;
    }
}
