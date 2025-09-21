import type { Simulation } from '../core/sim.js';

export interface OverlayData {
  heat: ImageData;
}

export function generateHeatOverlay(sim: Simulation, canvas: HTMLCanvasElement): OverlayData {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Overlay canvas context missing');
  const heat = sim.comms.getHeat();
  const width = sim.world.width;
  const height = sim.world.height;
  const image = ctx.createImageData(width, height);
  for (let i = 0; i < heat.length; i++) {
    const value = Math.min(255, Math.floor(heat[i] * 16));
    image.data[i * 4 + 0] = 255;
    image.data[i * 4 + 1] = 128;
    image.data[i * 4 + 2] = 0;
    image.data[i * 4 + 3] = value;
  }
  return { heat: image };
}
