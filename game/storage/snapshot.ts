import type { Simulation } from '../core/sim.js';

export interface SnapshotData {
  version: 1;
  rngSeed: number;
  world: unknown;
  agents: unknown[];
  time: number;
}

export function createSnapshot(sim: Simulation): SnapshotData {
  return {
    version: 1,
    rngSeed: 0,
    world: {
      width: sim.world.width,
      height: sim.world.height,
      tiles: sim.world.tiles,
      season: sim.world.season,
      weather: sim.world.weather,
      tick: sim.world.tick
    },
    agents: sim.agents.map((agent) => ({
      id: agent.id,
      x: agent.x,
      y: agent.y,
      energy: agent.energy,
      heat: agent.heat,
      role: agent.role,
      mode: agent.mode,
      thinkEvery: agent.thinkEvery,
      weights: Array.from(agent.weights)
    })),
    time: sim.world.tick
  };
}
