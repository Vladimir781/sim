export interface Message {
  agentId: number;
  symbols: number[];
  tick: number;
}

export class CommChannel {
  private readonly vocab: number;
  private readonly log: Message[] = [];
  private readonly heat: number[];
  private readonly width: number;
  private readonly height: number;

  constructor(vocab: number, width: number, height: number) {
    this.vocab = vocab;
    this.width = width;
    this.height = height;
    this.heat = new Array(width * height).fill(0);
  }

  push(message: Message, position: { x: number; y: number }): void {
    if (message.symbols.some((s) => s >= this.vocab)) return;
    this.log.push(message);
    const idx = position.y * this.width + position.x;
    this.heat[idx] = Math.min(this.heat[idx] + 1, 255);
  }

  decay(): void {
    for (let i = 0; i < this.heat.length; i++) {
      this.heat[i] *= 0.95;
    }
  }

  latest(limit = 10): Message[] {
    return this.log.slice(-limit);
  }

  getHeat(): number[] {
    return this.heat;
  }
}
