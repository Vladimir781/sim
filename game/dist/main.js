import { createPixiApp } from './render/pixi_app.js';
import { createPanel } from './panel/panel.js';
import { Simulation } from './core/sim.js';
import { saveSlot, loadSlot, deleteSlot } from './storage/idb.js';
class InlineSimulationWorker {
    constructor() {
        this.simulation = new Simulation();
        this.listeners = [];
        this.running = false;
        this.speed = 1;
        setInterval(() => this.tick(), 1000 / 12);
    }
    addEventListener(_type, listener) {
        this.listeners.push(listener);
    }
    postMessage(message) {
        if (message.type === 'SIM') {
            if (message.payload.command === 'start') {
                this.running = true;
                this.speed = message.payload.speed ?? 1;
            }
            else if (message.payload.command === 'pause') {
                this.running = false;
            }
            else if (message.payload.command === 'step') {
                this.simulation.step(16);
                this.emitFrame(this.simulation.statsSnapshot(16));
            }
        }
        if (message.type === 'WORLD' && message.payload.action === 'regen') {
            window.location.reload();
        }
        if (message.type === 'PERF') {
            this.speed = message.payload.tickRate / 12;
        }
        if (message.type === 'AGENTS') {
            const { action, ids } = message.payload;
            if (action === 'kill')
                this.simulation.killAgents(ids);
            if (action === 'freeze')
                ids.forEach((id) => this.simulation.freeze(id, true));
            if (action === 'fsm')
                ids.forEach((id) => this.simulation.switchMode(id, 'fsm'));
            if (action === 'priority')
                ids.forEach((id) => this.simulation.setThinkEvery(id, 1));
            if (action === 'mute')
                ids.forEach((id) => this.simulation.toggleMute(id, true));
            this.emitFrame(this.simulation.statsSnapshot(0));
        }
        if (message.type === 'SAVE') {
            const slot = message.payload.slot;
            if (message.payload.action === 'save') {
                saveSlot(slot, this.simulation.snapshot()).then(() => {
                    this.emitMessage({ type: 'SAVE_DONE', payload: { slot } });
                });
            }
            else if (message.payload.action === 'load') {
                loadSlot(slot).then((data) => {
                    if (data) {
                        this.emitMessage({ type: 'LOAD_DONE', payload: { slot } });
                    }
                });
            }
            else if (message.payload.action === 'delete') {
                deleteSlot(slot).then(() => this.emitMessage({ type: 'SAVE_DONE', payload: { slot } }));
            }
        }
    }
    tick() {
        if (!this.running)
            return;
        for (let i = 0; i < this.speed; i++) {
            this.simulation.step(16);
        }
        this.emitFrame(this.simulation.statsSnapshot(16));
    }
    emitFrame(stats) {
        const frame = {
            world: this.simulation.world,
            agents: this.simulation.agents.map((a) => ({ id: a.id, x: a.x, y: a.y, mode: a.mode })),
            stats
        };
        this.emitMessage({ type: 'FRAME', payload: frame });
        this.emitTimeline();
        this.emitAgents();
    }
    emitTimeline() {
        const timeline = this.simulation.timelineEvents().map((item) => ({ tick: item.tick, description: item.description }));
        this.emitMessage({ type: 'TIMELINE', payload: timeline });
    }
    emitAgents() {
        const rows = this.simulation.agentRows();
        this.emitMessage({ type: 'AGENT_LIST', payload: { page: 0, total: rows.length, rows } });
    }
    emitMessage(message) {
        const event = new MessageEvent('message', { data: message });
        this.listeners.forEach((listener) => listener(event));
    }
}
function createSimulationWorker() {
    try {
        const worker = new Worker(new URL('./worker/worker.entry.js', import.meta.url), { type: 'module' });
        return worker;
    }
    catch (error) {
        console.warn('Module worker unavailable, using inline fallback', error);
        return new InlineSimulationWorker();
    }
}
let latestFrame = null;
window.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('app');
    if (!root)
        throw new Error('Missing #app container');
    const worker = createSimulationWorker();
    const panel = createPanel(root, {
        send(message) {
            worker.postMessage(message);
        }
    });
    const pixi = createPixiApp(root);
    worker.addEventListener('message', (event) => {
        const data = event.data;
        if (data.type === 'FRAME') {
            latestFrame = data.payload;
            panel.setFrame(data.payload);
        }
        if (data.type === 'TIMELINE') {
            panel.setTimeline(data.payload);
        }
        if (data.type === 'AGENT_LIST') {
            panel.setAgents(data.payload);
        }
    });
    function loop() {
        if (latestFrame) {
            pixi.render(latestFrame);
        }
        requestAnimationFrame(loop);
    }
    loop();
});
