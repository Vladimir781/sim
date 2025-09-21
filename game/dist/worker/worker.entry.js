import { Simulation } from '../core/sim.js';
import { saveSlot, loadSlot, deleteSlot } from '../storage/idb.js';
const ctx = self;
let simulation = null;
let running = false;
let speed = 1;
let frameTimer = null;
function ensureSimulation() {
    if (!simulation) {
        simulation = new Simulation();
    }
    return simulation;
}
function startLoop() {
    if (frameTimer !== null)
        return;
    const tick = () => {
        if (running && simulation) {
            let stats = null;
            for (let i = 0; i < speed; i++) {
                stats = simulation.step(16);
            }
            if (stats) {
                emitFrame(stats);
                emitAgents();
                emitTimeline();
            }
        }
        frameTimer = ctx.setTimeout(tick, 1000 / 12);
    };
    tick();
}
function emitFrame(stats) {
    if (!simulation)
        return;
    const frame = {
        world: simulation.world,
        agents: simulation.agents.map((a) => ({ id: a.id, x: a.x, y: a.y, mode: a.mode })),
        stats
    };
    ctx.postMessage({ type: 'FRAME', payload: frame });
}
function emitTimeline() {
    if (!simulation)
        return;
    const events = simulation.timelineEvents().map((item) => ({ tick: item.tick, description: item.description }));
    ctx.postMessage({ type: 'TIMELINE', payload: events });
}
function emitAgents() {
    if (!simulation)
        return;
    const rows = simulation.agentRows();
    ctx.postMessage({ type: 'AGENT_LIST', payload: { page: 0, total: rows.length, rows } });
}
ctx.addEventListener('message', async (event) => {
    const message = event.data;
    const sim = ensureSimulation();
    switch (message.type) {
        case 'SIM': {
            if (message.payload.command === 'start') {
                running = true;
                speed = message.payload.speed ?? 1;
                startLoop();
            }
            else if (message.payload.command === 'pause') {
                running = false;
            }
            else if (message.payload.command === 'step') {
                const stats = sim.step(16);
                emitFrame(stats);
                emitAgents();
                emitTimeline();
            }
            break;
        }
        case 'WORLD': {
            if (message.payload.action === 'regen') {
                simulation = new Simulation({ seed: message.payload.seed });
                emitFrame(simulation.statsSnapshot(0));
                emitTimeline();
            }
            break;
        }
        case 'AGENTS': {
            const { action, ids } = message.payload;
            if (action === 'kill')
                sim.killAgents(ids);
            if (action === 'freeze')
                ids.forEach((id) => sim.freeze(id, true));
            if (action === 'fsm')
                ids.forEach((id) => sim.switchMode(id, 'fsm'));
            if (action === 'priority')
                ids.forEach((id) => sim.setThinkEvery(id, 1));
            if (action === 'mute')
                ids.forEach((id) => sim.toggleMute(id, true));
            emitAgents();
            emitFrame(sim.statsSnapshot(0));
            break;
        }
        case 'PERF': {
            speed = Math.max(1, Math.round(message.payload.tickRate / 12));
            break;
        }
        case 'SAVE': {
            if (message.payload.action === 'save') {
                await saveSlot(message.payload.slot, sim.snapshot());
                ctx.postMessage({ type: 'SAVE_DONE', payload: { slot: message.payload.slot } });
            }
            else if (message.payload.action === 'load') {
                const data = await loadSlot(message.payload.slot);
                if (data) {
                    simulation = new Simulation();
                    ctx.postMessage({ type: 'LOAD_DONE', payload: { slot: message.payload.slot } });
                }
            }
            else if (message.payload.action === 'delete') {
                await deleteSlot(message.payload.slot);
                ctx.postMessage({ type: 'SAVE_DONE', payload: { slot: message.payload.slot } });
            }
            break;
        }
        case 'EVENT': {
            // For now events are handled via storyteller automatically.
            break;
        }
        default:
            break;
    }
});
