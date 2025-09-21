import type { FramePayload } from '../types.d.ts';
import { SPRITESHEET_B64 } from '../assets/spritesheet.b64.js';
import { EMOJI_BITMAP_B64 } from '../assets/emoji_bitmap.b64.js';

export interface PixiContext {
  canvas: HTMLCanvasElement;
  destroy(): void;
  render(frame: FramePayload): void;
}

export function createPixiApp(container: HTMLElement): PixiContext {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 512;
  canvas.className = 'viewport';
  container.appendChild(canvas);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas context unavailable');
  const ctx = context;

  ctx.imageSmoothingEnabled = false;

  const agentSprite = new Image();
  let agentReady = false;
  agentSprite.onload = () => {
    agentReady = true;
  };
  agentSprite.src = SPRITESHEET_B64;
  if (agentSprite.complete) agentReady = true;

  const emojiBitmap = new Image();
  let emojiReady = false;
  emojiBitmap.onload = () => {
    emojiReady = true;
  };
  emojiBitmap.src = EMOJI_BITMAP_B64;
  if (emojiBitmap.complete) emojiReady = true;

  function render(frame: FramePayload): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { world, agents } = frame;
    const cellSize = Math.floor(Math.min(canvas.width / world.width, canvas.height / world.height));
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const tile = world.tiles[y * world.width + x];
        ctx.fillStyle = palette(tile.biome);
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = overlayForSeason(world.season);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    for (const agent of agents) {
      const screenX = agent.x * cellSize;
      const screenY = agent.y * cellSize;

      if (agentReady) {
        ctx.drawImage(
          agentSprite,
          0,
          0,
          agentSprite.width,
          agentSprite.height,
          screenX,
          screenY,
          cellSize,
          cellSize
        );
      } else {
        ctx.fillStyle = agent.mode === 'mlp' ? '#3cb8ff' : '#ffb347';
        ctx.beginPath();
        ctx.arc(screenX + cellSize * 0.5, screenY + cellSize * 0.5, cellSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      if (emojiReady && agent.mode === 'mlp') {
        ctx.drawImage(
          emojiBitmap,
          0,
          0,
          emojiBitmap.width,
          emojiBitmap.height,
          screenX + cellSize * 0.2,
          screenY - cellSize * 0.4,
          cellSize * 0.6,
          cellSize * 0.6
        );
      }
    }
  }

  return {
    canvas,
    render,
    destroy() {
      canvas.remove();
    }
  };
}

function palette(biome: string): string {
  switch (biome) {
    case 'forest':
      return '#234f1e';
    case 'mountain':
      return '#6b6b6b';
    case 'lake':
      return '#3d8bfd';
    default:
      return '#5fa55a';
  }
}

function overlayForSeason(season: FramePayload['world']['season']): string {
  switch (season) {
    case 'winter':
      return 'rgba(200,220,255,0.8)';
    case 'summer':
      return 'rgba(255,220,120,0.8)';
    case 'autumn':
      return 'rgba(255,165,0,0.8)';
    default:
      return 'rgba(120,255,120,0.6)';
  }
}
