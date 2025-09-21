export interface DefaultMapBiome {
  id: string;
  tiles: number;
  resources: Record<string, number>;
}

export interface DefaultMap {
  name: string;
  seed: number;
  width: number;
  height: number;
  biomes: DefaultMapBiome[];
  spawns: {
    agents: number;
    predators: number;
  };
}

export const DEFAULT_MAP: DefaultMap;
