export const DEFAULT_MAP = {
  name: 'Temperate Valley',
  seed: 1337,
  width: 64,
  height: 64,
  biomes: [
    { id: 'grass', tiles: 0.6, resources: { food: 0.5, wood: 0.4 } },
    { id: 'forest', tiles: 0.2, resources: { wood: 0.9, food: 0.2 } },
    { id: 'mountain', tiles: 0.1, resources: { ore: 0.8, crystal: 0.2 } },
    { id: 'lake', tiles: 0.1, resources: { water: 1.0 } }
  ],
  spawns: {
    agents: 24,
    predators: 4
  }
};
