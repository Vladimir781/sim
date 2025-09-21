import { DEFAULT_MAP } from '../data/map.default.js';
export function createWorld(seed = DEFAULT_MAP.seed) {
    const width = DEFAULT_MAP.width;
    const height = DEFAULT_MAP.height;
    const tiles = new Array(width * height);
    let rng = mulberry32(seed);
    const biomes = DEFAULT_MAP.biomes;
    for (let i = 0; i < tiles.length; i++) {
        const choice = Math.floor(rng() * biomes.length);
        const biome = biomes[choice];
        tiles[i] = {
            biome: biome.id,
            resource: rng(),
            danger: rng() * 0.2
        };
    }
    return { width, height, tiles, season: 'spring', weather: 'clear', tick: 0 };
}
export function updateSeason(world) {
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    const nextIndex = (seasons.indexOf(world.season) + 1) % seasons.length;
    world.season = seasons[nextIndex];
}
export function mutateWeather(world, intensity) {
    if (intensity > 0.7)
        world.weather = 'storm';
    else if (intensity > 0.3)
        world.weather = 'rain';
    else
        world.weather = 'clear';
}
export function sampleResources(world, x, y) {
    return world.tiles[y * world.width + x];
}
function mulberry32(seed) {
    return function () {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
