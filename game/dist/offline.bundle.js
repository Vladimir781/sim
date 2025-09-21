// Auto-generated offline bundle for file:// execution.
(function () {
  const MODULE_FACTORIES = {
    'ai/learn/reinforce.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('ai/learn/reinforce.js') };
        const { applyGradient } = require('../math/optim.js');
        function reinforceUpdate(weights, traj, cfg) {
            if (!traj.length)
                return;
            const grad = new Float32Array(weights.length);
            for (const step of traj) {
                const advantage = step.reward - step.baseline;
                const prob = Math.max(step.logits[step.action], 1e-5);
                const scale = advantage / prob;
                for (let i = 0; i < grad.length; i++) {
                    grad[i] += scale * (Math.random() * 0.01 - 0.005);
                }
            }
            applyGradient(weights, grad, cfg.learningRate, cfg.gradientClip);
        }
        exports.reinforceUpdate = reinforceUpdate;
    },
    'ai/math/activations.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('ai/math/activations.js') };
        function relu(vec) {
            for (let i = 0; i < vec.length; i++) {
                if (vec[i] < 0)
                    vec[i] = 0;
            }
        }
        function softmax(vec) {
            let max = -Infinity;
            for (const v of vec) {
                if (v > max)
                    max = v;
            }
            let sum = 0;
            for (let i = 0; i < vec.length; i++) {
                vec[i] = Math.exp(vec[i] - max);
                sum += vec[i];
            }
            for (let i = 0; i < vec.length; i++) {
                vec[i] /= sum;
            }
        }
        exports.relu = relu;
        exports.softmax = softmax;
    },
    'ai/math/gemv.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('ai/math/gemv.js') };
        function gemv(out, mat, vec, rows, cols) {
            for (let r = 0; r < rows; r++) {
                let sum = 0;
                for (let c = 0; c < cols; c++) {
                    sum += mat[r * cols + c] * vec[c];
                }
                out[r] = sum;
            }
        }
        exports.gemv = gemv;
    },
    'ai/math/optim.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('ai/math/optim.js') };
        function applyGradient(weights, gradient, learningRate, clip) {
            let norm = 0;
            for (let i = 0; i < gradient.length; i++) {
                norm += gradient[i] * gradient[i];
            }
            norm = Math.sqrt(norm);
            const scale = norm > clip ? clip / (norm + 1e-6) : 1;
            for (let i = 0; i < weights.length; i++) {
                weights[i] += -learningRate * gradient[i] * scale;
            }
        }
        exports.applyGradient = applyGradient;
    },
    'ai/models/tiny_gru.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('ai/models/tiny_gru.js') };
        class TinyGRUBrain {
            constructor(shape, weights) {
                this.shape = shape;
                this.weights = weights;
                this.state = new Float32Array(shape.hidden);
                this.logits = new Float32Array(shape.output);
            }
            forward(input) {
                // Lightweight placeholder GRU. Not a full GRU implementation but provides
                // deterministic recurrent behaviour and keeps interface stable.
                const { hidden, output } = this.shape;
                for (let i = 0; i < hidden; i++) {
                    const inp = input[i % input.length];
                    const w = this.weights[i % this.weights.length];
                    const prev = this.state[i];
                    const update = 1 / (1 + Math.exp(-(inp + w)));
                    const reset = 1 / (1 + Math.exp(-(w - inp)));
                    const cand = Math.tanh(reset * prev + (1 - reset) * inp);
                    this.state[i] = (1 - update) * prev + update * cand;
                }
                for (let o = 0; o < output; o++) {
                    this.logits[o] = 0;
                    for (let h = 0; h < hidden; h++) {
                        const idx = (o * hidden + h) % this.weights.length;
                        this.logits[o] += this.state[h] * this.weights[idx];
                    }
                }
                return this.logits;
            }
            reset() {
                this.state.fill(0);
            }
        }
        exports.TinyGRUBrain = TinyGRUBrain;
    },
    'ai/models/tiny_mlp.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('ai/models/tiny_mlp.js') };
        const { gemv } = require('../math/gemv.js');
        const { relu, softmax } = require('../math/activations.js');
        class TinyMLPBrain {
            constructor(shape, params) {
                this.shape = shape;
                const { input, hidden, output } = shape;
                const w1Size = input * hidden;
                const b1Size = hidden;
                const w2Size = hidden * output;
                const b2Size = output;
                this.weights1 = params.subarray(0, w1Size);
                this.bias1 = params.subarray(w1Size, w1Size + b1Size);
                this.weights2 = params.subarray(w1Size + b1Size, w1Size + b1Size + w2Size);
                this.bias2 = params.subarray(w1Size + b1Size + w2Size, w1Size + b1Size + w2Size + b2Size);
                this.hidden = new Float32Array(hidden);
                this.output = new Float32Array(output);
            }
            forward(input) {
                const { input: inputSize, hidden, output } = this.shape;
                if (input.length !== inputSize) {
                    throw new Error(`Expected ${inputSize} inputs, got ${input.length}`);
                }
                gemv(this.hidden, this.weights1, input, hidden, inputSize);
                for (let i = 0; i < hidden; i++) {
                    this.hidden[i] += this.bias1[i];
                }
                relu(this.hidden);
                gemv(this.output, this.weights2, this.hidden, output, hidden);
                for (let i = 0; i < output; i++) {
                    this.output[i] += this.bias2[i];
                }
                softmax(this.output);
                return this.output;
            }
            serialize() {
                return new Float32Array([
                    ...this.weights1,
                    ...this.bias1,
                    ...this.weights2,
                    ...this.bias2
                ]);
            }
        }
        function decodeUint8Weights(raw, shape) {
            const expected = shape.input * shape.hidden + shape.hidden + shape.hidden * shape.output + shape.output;
            if (raw.length < expected) {
                throw new Error(`Insufficient bytes to build brain. expected ${expected}, got ${raw.length}`);
            }
            const params = new Float32Array(expected);
            for (let i = 0; i < expected; i++) {
                params[i] = raw[i] / 255 - 0.5;
            }
            return params;
        }
        exports.decodeUint8Weights = decodeUint8Weights;
        exports.TinyMLPBrain = TinyMLPBrain;
    },
    'assets/emoji_bitmap.b64.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('assets/emoji_bitmap.b64.js') };
        const EMOJI_BITMAP_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGklEQVR42mP4f53hPyWYYdSAUQNGDRguBgAAbd/VH9TuOlkAAAAASUVORK5CYII=";
        exports.EMOJI_BITMAP_B64 = EMOJI_BITMAP_B64;
    },
    'assets/spritesheet.b64.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('assets/spritesheet.b64.js') };
        const SPRITESHEET_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGklEQVR42mOw2fH/PyWYYdSAUQNGDRguBgAApbbyH+c46EYAAAAASUVORK5CYII=";
        exports.SPRITESHEET_B64 = SPRITESHEET_B64;
    },
    'core/comms.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('core/comms.js') };
        class CommChannel {
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
        exports.CommChannel = CommChannel;
    },
    'core/ecs.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('core/ecs.js') };
        class ECS {
            constructor() {
                this.nextId = 1;
                this.components = new Map();
            }
            create() {
                return this.nextId++;
            }
            destroy(id) {
                for (const store of this.components.values()) {
                    store.delete(id);
                }
            }
            addComponent(id, name, value) {
                let store = this.components.get(name);
                if (!store) {
                    store = new Map();
                    this.components.set(name, store);
                }
                store.set(id, value);
            }
            getComponent(id, name) {
                return this.components.get(name)?.get(id);
            }
            removeComponent(id, name) {
                this.components.get(name)?.delete(id);
            }
            *iterate(name) {
                const store = this.components.get(name);
                if (!store)
                    return;
                for (const entry of store.entries()) {
                    yield entry;
                }
            }
            snapshot() {
                const out = {};
                for (const [name, store] of this.components.entries()) {
                    out[name] = {};
                    for (const [entity, value] of store.entries()) {
                        out[name][String(entity)] = value;
                    }
                }
                return out;
            }
        }
        exports.ECS = ECS;
    },
    'core/sim.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('core/sim.js') };
        const { BASE_CONFIG } = require('../data/config.js');
        const { BRAIN_DEFAULT } = require('../ai/brains/brain.default.u8arr.js');
        const { TinyMLPBrain, decodeUint8Weights } = require('../ai/models/tiny_mlp.js');
        const { createWorld, sampleResources, updateSeason, mutateWeather } = require('./world.js');
        const { CommChannel } = require('./comms.js');
        const { reinforceUpdate } = require('../ai/learn/reinforce.js');
        const { createStoryteller, stepStoryteller } = require('./storyteller.js');
        class Simulation {
            constructor(opts = {}) {
                this.agents = [];
                this.timeline = [];
                this.traj = new Map();
                this.tickCount = 0;
                this.brainShape = { input: 32, hidden: 16, output: BASE_CONFIG.actionSpace.length };
                this.storyteller = createStoryteller();
                this.world = createWorld(opts.seed);
                this.comms = new CommChannel(BASE_CONFIG.vocabSize, this.world.width, this.world.height);
                this.rng = mulberry32(this.world.tick + (opts.seed ?? 1));
                this.bootstrapAgents(BASE_CONFIG.maxAgents / 3);
            }
            bootstrapAgents(count) {
                const baseWeights = decodeUint8Weights(BRAIN_DEFAULT, {
                    input: this.brainShape.input,
                    hidden: this.brainShape.hidden,
                    output: this.brainShape.output
                });
                for (let i = 0; i < count; i++) {
                    const weights = new Float32Array(baseWeights);
                    for (let j = 0; j < weights.length; j++) {
                        weights[j] += (this.rng() - 0.5) * 0.02;
                    }
                    const brain = new TinyMLPBrain(this.brainShape, weights);
                    const agent = {
                        id: i + 1,
                        x: Math.floor(this.rng() * this.world.width),
                        y: Math.floor(this.rng() * this.world.height),
                        energy: 1,
                        heat: 0,
                        role: i % 3 === 0 ? 'harvester' : i % 3 === 1 ? 'builder' : 'scout',
                        mode: 'mlp',
                        thinkEvery: BASE_CONFIG.thinkEveryOptions[0],
                        brain,
                        weights,
                        msHistory: [],
                        talkHistory: [],
                        muted: false,
                        frozen: false,
                        rewardBaseline: 0
                    };
                    this.agents.push(agent);
                }
            }
            step(deltaMs) {
                const t0 = performance.now();
                this.tickCount++;
                this.world.tick = this.tickCount;
                if (this.tickCount % 120 === 0) {
                    updateSeason(this.world);
                }
                if (this.tickCount % 30 === 0) {
                    mutateWeather(this.world, this.rng());
                }
                const event = stepStoryteller(this.storyteller, this.tickCount);
                if (event) {
                    this.timeline.push(event);
                    if (this.timeline.length > 32)
                        this.timeline.shift();
                }
                for (const agent of this.agents) {
                    if (agent.frozen)
                        continue;
                    if (this.tickCount % agent.thinkEvery !== 0)
                        continue;
                    const sense = this.buildObservation(agent);
                    const start = performance.now();
                    const policy = agent.mode === 'mlp' ? agent.brain.forward(sense) : this.fsmPolicy(agent, sense);
                    const elapsed = performance.now() - start;
                    agent.msHistory.push(elapsed);
                    if (agent.msHistory.length > 60)
                        agent.msHistory.shift();
                    const action = this.sampleAction(policy);
                    const reward = this.applyAction(agent, action);
                    if (BASE_CONFIG.actionSpace[action] !== 'talk') {
                        agent.talkHistory.push(0);
                        if (agent.talkHistory.length > 60)
                            agent.talkHistory.shift();
                    }
                    const logEntry = {
                        logits: policy.slice(),
                        action,
                        reward,
                        baseline: agent.rewardBaseline
                    };
                    let steps = this.traj.get(agent.id);
                    if (!steps) {
                        steps = [];
                        this.traj.set(agent.id, steps);
                    }
                    steps.push(logEntry);
                    agent.rewardBaseline = agent.rewardBaseline * 0.9 + reward * 0.1;
                    agent.energy = Math.max(0, Math.min(1.5, agent.energy + reward * 0.05 - 0.01));
                    agent.heat = Math.max(0, Math.min(1, agent.heat + (action === 6 ? 0.05 : -0.01)));
                }
                if (BASE_CONFIG.learning.enabled && this.tickCount % BASE_CONFIG.learning.updateInterval === 0) {
                    for (const agent of this.agents) {
                        const steps = this.traj.get(agent.id);
                        if (!steps?.length)
                            continue;
                        reinforceUpdate(agent.weights, steps, {
                            learningRate: BASE_CONFIG.learning.learningRate,
                            gradientClip: BASE_CONFIG.learning.gradientClip
                        });
                        this.traj.set(agent.id, []);
                    }
                }
                this.comms.decay();
                const msPerTick = performance.now() - t0;
                return this.statsSnapshot(msPerTick);
            }
            buildObservation(agent) {
                const vec = new Float32Array(this.brainShape.input);
                let idx = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = Math.min(this.world.width - 1, Math.max(0, agent.x + dx));
                        const ny = Math.min(this.world.height - 1, Math.max(0, agent.y + dy));
                        const tile = sampleResources(this.world, nx, ny);
                        vec[idx++] = tile.resource;
                        vec[idx++] = tile.danger;
                    }
                }
                vec[idx++] = agent.energy;
                vec[idx++] = agent.heat;
                vec[idx++] = agent.thinkEvery;
                vec[idx++] = agent.mode === 'mlp' ? 1 : 0;
                while (idx < vec.length) {
                    vec[idx++] = 0;
                }
                return vec;
            }
            sampleAction(policy) {
                let sum = 0;
                const r = Math.random();
                for (let i = 0; i < policy.length; i++) {
                    sum += policy[i];
                    if (r <= sum)
                        return i;
                }
                return policy.length - 1;
            }
            applyAction(agent, action) {
                switch (BASE_CONFIG.actionSpace[action]) {
                    case 'move_n':
                        agent.y = Math.max(0, agent.y - 1);
                        return 0.02;
                    case 'move_s':
                        agent.y = Math.min(this.world.height - 1, agent.y + 1);
                        return 0.02;
                    case 'move_w':
                        agent.x = Math.max(0, agent.x - 1);
                        return 0.02;
                    case 'move_e':
                        agent.x = Math.min(this.world.width - 1, agent.x + 1);
                        return 0.02;
                    case 'gather': {
                        const tile = sampleResources(this.world, agent.x, agent.y);
                        return tile.resource * 0.05;
                    }
                    case 'build':
                        return 0.01;
                    case 'talk':
                        if (!agent.muted) {
                            const symbols = [Math.floor(Math.random() * BASE_CONFIG.vocabSize)];
                            this.comms.push({ agentId: agent.id, symbols, tick: this.tickCount }, { x: agent.x, y: agent.y });
                            agent.talkHistory.push(1);
                            if (agent.talkHistory.length > 60)
                                agent.talkHistory.shift();
                            return 0.015;
                        }
                        return -0.02;
                    case 'rest':
                        agent.energy = Math.min(1.5, agent.energy + 0.05);
                        return 0.03;
                    default:
                        return 0;
                }
            }
            fsmPolicy(agent, observation) {
                const out = new Float32Array(BASE_CONFIG.actionSpace.length);
                const energy = observation[18];
                if (energy < 0.3) {
                    out[BASE_CONFIG.actionSpace.indexOf('rest')] = 1;
                }
                else {
                    const moves = ['move_n', 'move_s', 'move_w', 'move_e'];
                    const choice = moves[Math.floor(Math.random() * moves.length)];
                    out[BASE_CONFIG.actionSpace.indexOf(choice)] = 1;
                }
                return out;
            }
            toggleMute(agentId, value) {
                const agent = this.agents.find((a) => a.id === agentId);
                if (agent)
                    agent.muted = value;
            }
            freeze(agentId, value) {
                const agent = this.agents.find((a) => a.id === agentId);
                if (agent)
                    agent.frozen = value;
            }
            setThinkEvery(agentId, value) {
                const agent = this.agents.find((a) => a.id === agentId);
                if (agent)
                    agent.thinkEvery = value;
            }
            switchMode(agentId, mode) {
                const agent = this.agents.find((a) => a.id === agentId);
                if (agent)
                    agent.mode = mode;
            }
            killAgents(ids) {
                for (const id of ids) {
                    const index = this.agents.findIndex((a) => a.id === id);
                    if (index >= 0)
                        this.agents.splice(index, 1);
                }
            }
            agentRows() {
                return this.agents.map((agent) => ({
                    id: agent.id,
                    role: agent.role,
                    mode: agent.mode,
                    thinkEvery: agent.thinkEvery,
                    ms: average(agent.msHistory),
                    talk: average(agent.talkHistory),
                    energy: agent.energy,
                    heat: agent.heat,
                    x: agent.x,
                    y: agent.y
                }));
            }
            snapshot() {
                return {
                    world: this.world,
                    agents: this.agents.map((a) => ({ ...a, brain: a.brain }))
                };
            }
            timelineEvents() {
                return [...this.timeline];
            }
            statsSnapshot(msPerTick) {
                const talkRate = this.agents.reduce((acc, agent) => {
                    const lastTalk = agent.talkHistory.length ? agent.talkHistory[agent.talkHistory.length - 1] : 0;
                    return acc + lastTalk;
                }, 0) / (this.agents.length || 1);
                return {
                    tick: this.tickCount,
                    fps: BASE_CONFIG.renderFps,
                    msPerTick,
                    agents: this.agents.length,
                    talkRate,
                    mlpAgents: this.agents.filter((a) => a.mode === 'mlp').length,
                    fsmAgents: this.agents.filter((a) => a.mode === 'fsm').length
                };
            }
        }
        function mulberry32(seed) {
            return function () {
                let t = (seed += 0x6d2b79f5);
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }
        function average(values) {
            if (!values.length)
                return 0;
            let sum = 0;
            for (const value of values)
                sum += value;
            return sum / values.length;
        }
        exports.Simulation = Simulation;
    },
    'core/storyteller.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('core/storyteller.js') };
        function createStoryteller() {
            return { tension: 0.3, budget: 1, cooldown: 0, log: [] };
        }
        function stepStoryteller(state, tick) {
            if (state.cooldown > 0) {
                state.cooldown--;
                return null;
            }
            if (state.tension < 0.2) {
                state.tension += 0.01;
                return null;
            }
            const events = [
                { type: 'storm', tensionCost: 0.3, tick, description: 'Гроза накрывает поселение.' },
                { type: 'raid', tensionCost: 0.4, tick, description: 'Набег хищников на склады.' },
                { type: 'drought', tensionCost: 0.2, tick, description: 'Сезонная засуха.' },
                { type: 'ritual', tensionCost: -0.2, tick, description: 'Общий праздник снижает напряжение.' }
            ];
            const choice = events[Math.floor(Math.random() * events.length)];
            if (state.tension - choice.tensionCost < 0) {
                return null;
            }
            state.tension -= choice.tensionCost;
            state.cooldown = 30;
            state.log.push(choice);
            if (state.log.length > 25)
                state.log.shift();
            return choice;
        }
        exports.createStoryteller = createStoryteller;
        exports.stepStoryteller = stepStoryteller;
    },
    'core/world.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('core/world.js') };
        const { DEFAULT_MAP } = require('../data/map.default.js');
        function createWorld(seed = DEFAULT_MAP.seed) {
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
        function updateSeason(world) {
            const seasons = ['spring', 'summer', 'autumn', 'winter'];
            const nextIndex = (seasons.indexOf(world.season) + 1) % seasons.length;
            world.season = seasons[nextIndex];
        }
        function mutateWeather(world, intensity) {
            if (intensity > 0.7)
                world.weather = 'storm';
            else if (intensity > 0.3)
                world.weather = 'rain';
            else
                world.weather = 'clear';
        }
        function sampleResources(world, x, y) {
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
        exports.createWorld = createWorld;
        exports.updateSeason = updateSeason;
        exports.mutateWeather = mutateWeather;
        exports.sampleResources = sampleResources;
    },
    'main.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('main.js') };
        const { createPixiApp } = require('./render/pixi_app.js');
        const { createPanel } = require('./panel/panel.js');
        const { Simulation } = require('./core/sim.js');
        const { saveSlot, loadSlot, deleteSlot } = require('./storage/idb.js');
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
                const worker = new Worker(new URL('./worker/worker.entry.js', __import_meta.url), { type: 'module' });
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
    },
    'panel/panel.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('panel/panel.js') };
        const { createOverviewTab } = require('./tabs/overview.js');
        const { createAgentsTab } = require('./tabs/agents.js');
        const { createWorldTab } = require('./tabs/world.js');
        const { createCommsTab } = require('./tabs/comms.js');
        const { createEventsTab } = require('./tabs/events.js');
        const { createSavesTab } = require('./tabs/saves.js');
        const { createSettingsTab } = require('./tabs/settings.js');
        const { createHelpTab } = require('./tabs/help.js');
        function createPanel(root, hooks) {
            const container = document.createElement('div');
            container.className = 'panel hidden';
            const tabsHeader = document.createElement('div');
            tabsHeader.className = 'panel-tabs';
            const tabsBody = document.createElement('div');
            tabsBody.className = 'panel-body';
            container.appendChild(tabsHeader);
            container.appendChild(tabsBody);
            root.appendChild(container);
            const state = {
                frame: null,
                timeline: [],
                agents: null
            };
            const tabFactories = [
                createOverviewTab,
                createAgentsTab,
                createWorldTab,
                createCommsTab,
                createEventsTab,
                createSavesTab,
                createSettingsTab,
                createHelpTab
            ];
            const tabs = tabFactories.map((factory) => factory({ hooks }));
            let activeTab = null;
            for (const tab of tabs) {
                const button = document.createElement('button');
                button.textContent = tab.label;
                button.className = 'panel-tab-button';
                button.addEventListener('click', () => activateTab(tab));
                tabsHeader.appendChild(button);
                tab.element.classList.add('panel-tab');
                tabsBody.appendChild(tab.element);
            }
            const toggleButton = document.createElement('button');
            toggleButton.className = 'panel-toggle';
            toggleButton.title = 'Открыть панель';
            toggleButton.textContent = '⚙️';
            toggleButton.addEventListener('click', () => {
                container.classList.toggle('hidden');
                toggleButton.classList.toggle('active');
            });
            root.appendChild(toggleButton);
            function activateTab(tab) {
                if (activeTab === tab)
                    return;
                activeTab?.element.classList.remove('active');
                tab.element.classList.add('active');
                activeTab = tab;
                tab.update(state);
            }
            activateTab(tabs[0]);
            function updateTabs() {
                if (!activeTab)
                    return;
                activeTab.update(state);
            }
            return {
                setFrame(frame) {
                    state.frame = frame;
                    updateTabs();
                },
                setTimeline(items) {
                    state.timeline = items;
                    updateTabs();
                },
                setAgents(data) {
                    state.agents = data;
                    updateTabs();
                }
            };
        }
        exports.createPanel = createPanel;
    },
    'panel/tabs/agents.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('panel/tabs/agents.js') };
        function createAgentsTab(ctx) {
            const element = document.createElement('div');
            element.innerHTML = `
            <section>
              <h2>Агенты</h2>
              <div class="agent-actions">
                <button data-action="kill">Убить</button>
                <button data-action="freeze">Заморозить</button>
                <button data-action="fsm">FSM</button>
                <button data-action="priority">think=1</button>
                <button data-action="mute">Mute</button>
              </div>
              <table class="agent-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" data-select="all"/></th>
                    <th>ID</th><th>Роль</th><th>Режим</th><th>thinkEvery</th><th>ms</th><th>msg/min</th><th>E</th><th>T</th><th>x</th><th>y</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </section>
          `;
            const tbody = element.querySelector('tbody');
            const selection = new Set();
            element.querySelectorAll('[data-action]').forEach((button) => {
                button.addEventListener('click', () => {
                    const ids = Array.from(selection);
                    if (!ids.length)
                        return;
                    const action = button.dataset.action;
                    ctx.hooks.send({ type: 'AGENTS', payload: { action, ids } });
                });
            });
            const selectAll = element.querySelector('[data-select="all"]');
            selectAll.addEventListener('change', () => {
                if (!currentRows)
                    return;
                selection.clear();
                if (selectAll.checked) {
                    currentRows.forEach((row) => selection.add(row.id));
                }
                updateSelection();
            });
            let currentRows = null;
            function updateSelection() {
                tbody.querySelectorAll('tr').forEach((tr) => {
                    const id = Number(tr.dataset.id);
                    tr.classList.toggle('selected', selection.has(id));
                    const checkbox = tr.querySelector('input[type="checkbox"]');
                    checkbox.checked = selection.has(id);
                });
            }
            function renderRows(rows) {
                tbody.innerHTML = '';
                currentRows = rows;
                for (const row of rows) {
                    const tr = document.createElement('tr');
                    tr.dataset.id = String(row.id);
                    tr.innerHTML = `
                <td><input type="checkbox" data-id="${row.id}"/></td>
                <td>${row.id}</td>
                <td>${row.role}</td>
                <td>${row.mode}</td>
                <td>${row.thinkEvery}</td>
                <td>${row.ms.toFixed(2)}</td>
                <td>${row.talk.toFixed(2)}</td>
                <td>${row.energy.toFixed(2)}</td>
                <td>${row.heat.toFixed(2)}</td>
                <td>${row.x}</td>
                <td>${row.y}</td>
              `;
                    tr.querySelector('input').addEventListener('change', (ev) => {
                        const checked = ev.currentTarget.checked;
                        if (checked)
                            selection.add(row.id);
                        else
                            selection.delete(row.id);
                        updateSelection();
                    });
                    tbody.appendChild(tr);
                }
                updateSelection();
            }
            return {
                id: 'agents',
                label: 'Агенты',
                element,
                update(state) {
                    if (state.agents) {
                        renderRows(state.agents.rows);
                    }
                }
            };
        }
        exports.createAgentsTab = createAgentsTab;
    },
    'panel/tabs/comms.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('panel/tabs/comms.js') };
        function createCommsTab(_ctx) {
            const element = document.createElement('div');
            const heatCanvas = document.createElement('canvas');
            heatCanvas.width = 128;
            heatCanvas.height = 128;
            element.innerHTML = `
            <section>
              <h2>Коммуникация</h2>
              <p>Теплокарта сообщений обновляется автоматически.</p>
            </section>
          `;
            element.appendChild(heatCanvas);
            const ctx = heatCanvas.getContext('2d');
            return {
                id: 'comms',
                label: 'Коммуникация',
                element,
                update(state) {
                    if (!ctx || !state.frame)
                        return;
                    const world = state.frame.world;
                    const scaleX = heatCanvas.width / world.width;
                    const scaleY = heatCanvas.height / world.height;
                    ctx.fillStyle = '#0a0a0a';
                    ctx.fillRect(0, 0, heatCanvas.width, heatCanvas.height);
                    ctx.fillStyle = 'rgba(255,140,0,0.6)';
                    for (const agent of state.frame.agents) {
                        ctx.beginPath();
                        ctx.arc((agent.x + 0.5) * scaleX, (agent.y + 0.5) * scaleY, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            };
        }
        exports.createCommsTab = createCommsTab;
    },
    'panel/tabs/events.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('panel/tabs/events.js') };
        const presetEvents = [
            { type: 'storm', title: 'Буря' },
            { type: 'raid', title: 'Набег' },
            { type: 'drought', title: 'Засуха' },
            { type: 'ritual', title: 'Ритуал' }
        ];
        function createEventsTab(ctx) {
            const element = document.createElement('div');
            const logList = document.createElement('ul');
            logList.className = 'event-log';
            element.innerHTML = `<h2>События</h2>`;
            const buttons = document.createElement('div');
            buttons.className = 'event-buttons';
            for (const preset of presetEvents) {
                const btn = document.createElement('button');
                btn.textContent = `Запустить: ${preset.title}`;
                btn.addEventListener('click', () => ctx.hooks.send({ type: 'EVENT', payload: { type: preset.type, action: 'trigger' } }));
                buttons.appendChild(btn);
            }
            element.appendChild(buttons);
            element.appendChild(logList);
            return {
                id: 'events',
                label: 'События',
                element,
                update(state) {
                    logList.innerHTML = '';
                    for (const item of state.timeline.slice().reverse()) {
                        const li = document.createElement('li');
                        li.textContent = `[${item.tick}] ${item.description}`;
                        logList.appendChild(li);
                    }
                }
            };
        }
        exports.createEventsTab = createEventsTab;
    },
    'panel/tabs/help.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('panel/tabs/help.js') };
        function createHelpTab() {
            const element = document.createElement('div');
            element.className = 'help';
            element.innerHTML = `
            <h2>Справка</h2>
            <p>Этот прототип демонстрирует колони-сим в браузере. Управляйте частотой тиков и наблюдайте за агентами через панель.</p>
            <ol>
              <li>Откройте панель и вкладку «Обзор», нажмите «Старт».</li>
              <li>На вкладке «Агенты» управляйте интенсивностью их работы.</li>
              <li>Используйте вкладку «Мир» для перегенерации карты.</li>
              <li>Сохраняйтесь во вкладке «Сейвы и данные».</li>
            </ol>
            <p>Все данные хранятся локально и доступны без сети.</p>
          `;
            return {
                id: 'help',
                label: 'Справка',
                element,
                update() { }
            };
        }
        exports.createHelpTab = createHelpTab;
    },
    'panel/tabs/overview.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('panel/tabs/overview.js') };
        function createOverviewTab(ctx) {
            const element = document.createElement('div');
            element.innerHTML = `
            <section class="metrics">
              <h2>Обзор</h2>
              <div class="metric-grid">
                <div><span>Tick</span><strong data-metric="tick">0</strong></div>
                <div><span>FPS</span><strong data-metric="fps">0</strong></div>
                <div><span>ms/тик</span><strong data-metric="ms">0</strong></div>
                <div><span>Агенты</span><strong data-metric="agents">0</strong></div>
                <div><span>MLP</span><strong data-metric="mlp">0</strong></div>
                <div><span>FSM</span><strong data-metric="fsm">0</strong></div>
                <div><span>Говорливость</span><strong data-metric="talk">0</strong></div>
              </div>
            </section>
            <section class="controls">
              <button data-action="start">Старт</button>
              <button data-action="pause">Пауза</button>
              <button data-action="step">Шаг</button>
              <label>Скорость
                <select data-input="speed">
                  <option value="1">×1</option>
                  <option value="2">×2</option>
                  <option value="4">×4</option>
                </select>
              </label>
            </section>
            <section class="timeline">
              <h3>Лента событий</h3>
              <ol class="timeline-list"></ol>
            </section>
          `;
            const metricEls = {};
            element.querySelectorAll('[data-metric]').forEach((el) => {
                const key = el.dataset.metric;
                metricEls[key] = el;
            });
            const timelineList = element.querySelector('.timeline-list');
            element.querySelectorAll('[data-action]').forEach((button) => {
                button.addEventListener('click', () => {
                    const action = button.dataset.action;
                    if (action === 'start')
                        ctx.hooks.send({ type: 'SIM', payload: { command: 'start' } });
                    if (action === 'pause')
                        ctx.hooks.send({ type: 'SIM', payload: { command: 'pause' } });
                    if (action === 'step')
                        ctx.hooks.send({ type: 'SIM', payload: { command: 'step' } });
                });
            });
            const speedSelect = element.querySelector('[data-input="speed"]');
            speedSelect.addEventListener('change', () => {
                ctx.hooks.send({ type: 'SIM', payload: { command: 'start', speed: Number(speedSelect.value) } });
            });
            return {
                id: 'overview',
                label: 'Обзор',
                element,
                update(state) {
                    if (state.frame) {
                        const stats = state.frame.stats;
                        metricEls['tick'].textContent = String(stats.tick);
                        metricEls['fps'].textContent = stats.fps.toFixed(0);
                        metricEls['ms'].textContent = stats.msPerTick.toFixed(2);
                        metricEls['agents'].textContent = String(stats.agents);
                        metricEls['mlp'].textContent = String(stats.mlpAgents);
                        metricEls['fsm'].textContent = String(stats.fsmAgents);
                        metricEls['talk'].textContent = stats.talkRate.toFixed(2);
                    }
                    if (state.timeline) {
                        timelineList.innerHTML = '';
                        for (const item of state.timeline.slice(-8).reverse()) {
                            const li = document.createElement('li');
                            li.textContent = `[${item.tick}] ${item.description}`;
                            timelineList.appendChild(li);
                        }
                    }
                }
            };
        }
        exports.createOverviewTab = createOverviewTab;
    },
    'panel/tabs/saves.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('panel/tabs/saves.js') };
        function createSavesTab(ctx) {
            const element = document.createElement('div');
            element.innerHTML = `
            <section>
              <h2>Сейвы</h2>
              <label>Slot <input type="text" value="slot-1" data-input="slot"/></label>
              <div class="save-buttons">
                <button data-action="save">Сохранить</button>
                <button data-action="load">Загрузить</button>
                <button data-action="delete">Удалить</button>
              </div>
              <p>Сейвы и мозги хранятся в IndexedDB. Экспорт/импорт доступен в будущих сборках.</p>
            </section>
          `;
            const slotInput = element.querySelector('[data-input="slot"]');
            element.querySelectorAll('[data-action]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    ctx.hooks.send({ type: 'SAVE', payload: { slot: slotInput.value, action } });
                });
            });
            return {
                id: 'saves',
                label: 'Сейвы и данные',
                element,
                update() { }
            };
        }
        exports.createSavesTab = createSavesTab;
    },
    'panel/tabs/settings.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('panel/tabs/settings.js') };
        function createSettingsTab(ctx) {
            const element = document.createElement('div');
            element.innerHTML = `
            <section>
              <h2>Настройки</h2>
              <label>Целевой FPS <input type="number" value="45" data-input="fps"/></label>
              <label>Tick-rate <input type="number" value="12" data-input="tick"/></label>
              <button data-action="apply">Применить</button>
              <p>Переключатели Pixi/Canvas и TFJS-wasm будут добавлены в полнофункциональной версии. Текущая сборка использует Canvas fallback.</p>
            </section>
          `;
            const fpsInput = element.querySelector('[data-input="fps"]');
            const tickInput = element.querySelector('[data-input="tick"]');
            const applyButton = element.querySelector('[data-action="apply"]');
            if (!fpsInput || !tickInput || !applyButton) {
                throw new Error('Settings tab template is malformed');
            }
            applyButton.addEventListener('click', () => {
                ctx.hooks.send({ type: 'PERF', payload: { targetFps: Number(fpsInput.value), tickRate: Number(tickInput.value) } });
            });
            return {
                id: 'settings',
                label: 'Настройки',
                element,
                update() { }
            };
        }
        exports.createSettingsTab = createSettingsTab;
    },
    'panel/tabs/world.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('panel/tabs/world.js') };
        function createWorldTab(ctx) {
            const element = document.createElement('div');
            element.innerHTML = `
            <section>
              <h2>Мир</h2>
              <label>Seed <input type="number" value="1337" data-input="seed"/></label>
              <button data-action="regen">Перегенерировать</button>
              <div class="world-status">
                <div>Сезон: <span data-world="season">-</span></div>
                <div>Погода: <span data-world="weather">-</span></div>
              </div>
            </section>
          `;
            const regen = element.querySelector('[data-action="regen"]');
            const seedInput = element.querySelector('[data-input="seed"]');
            regen.addEventListener('click', () => {
                ctx.hooks.send({ type: 'WORLD', payload: { action: 'regen', seed: Number(seedInput.value) } });
            });
            const seasonEl = element.querySelector('[data-world="season"]');
            const weatherEl = element.querySelector('[data-world="weather"]');
            return {
                id: 'world',
                label: 'Мир',
                element,
                update(state) {
                    if (state.frame) {
                        seasonEl.textContent = state.frame.world.season;
                        weatherEl.textContent = state.frame.world.weather;
                    }
                }
            };
        }
        exports.createWorldTab = createWorldTab;
    },
    'render/bubbles.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('render/bubbles.js') };
        function computeBubbles(sim) {
            const recent = sim.comms.latest(24);
            return recent.map((msg) => {
                const agent = sim.agents.find((a) => a.id === msg.agentId);
                return {
                    x: agent ? agent.x : 0,
                    y: agent ? agent.y : 0,
                    symbol: msg.symbols[0] ?? 0
                };
            });
        }
        exports.computeBubbles = computeBubbles;
    },
    'render/overlays.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('render/overlays.js') };
        function generateHeatOverlay(sim, canvas) {
            const ctx = canvas.getContext('2d');
            if (!ctx)
                throw new Error('Overlay canvas context missing');
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
        exports.generateHeatOverlay = generateHeatOverlay;
    },
    'render/pixi_app.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('render/pixi_app.js') };
        const { SPRITESHEET_B64 } = require('../assets/spritesheet.b64.js');
        const { EMOJI_BITMAP_B64 } = require('../assets/emoji_bitmap.b64.js');
        function createPixiApp(container) {
            const canvas = document.createElement('canvas');
            canvas.width = 768;
            canvas.height = 512;
            canvas.className = 'viewport';
            container.appendChild(canvas);
            const context = canvas.getContext('2d');
            if (!context)
                throw new Error('Canvas context unavailable');
            const ctx = context;
            ctx.imageSmoothingEnabled = false;
            const agentSprite = new Image();
            let agentReady = false;
            agentSprite.onload = () => {
                agentReady = true;
            };
            agentSprite.src = SPRITESHEET_B64;
            if (agentSprite.complete)
                agentReady = true;
            const emojiBitmap = new Image();
            let emojiReady = false;
            emojiBitmap.onload = () => {
                emojiReady = true;
            };
            emojiBitmap.src = EMOJI_BITMAP_B64;
            if (emojiBitmap.complete)
                emojiReady = true;
            function render(frame) {
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
                        ctx.drawImage(agentSprite, 0, 0, agentSprite.width, agentSprite.height, screenX, screenY, cellSize, cellSize);
                    }
                    else {
                        ctx.fillStyle = agent.mode === 'mlp' ? '#3cb8ff' : '#ffb347';
                        ctx.beginPath();
                        ctx.arc(screenX + cellSize * 0.5, screenY + cellSize * 0.5, cellSize * 0.3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    if (emojiReady && agent.mode === 'mlp') {
                        ctx.drawImage(emojiBitmap, 0, 0, emojiBitmap.width, emojiBitmap.height, screenX + cellSize * 0.2, screenY - cellSize * 0.4, cellSize * 0.6, cellSize * 0.6);
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
        function palette(biome) {
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
        function overlayForSeason(season) {
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
        exports.createPixiApp = createPixiApp;
    },
    'storage/idb.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('storage/idb.js') };
        const DB_NAME = 'colony-sim';
        const DB_VERSION = 1;
        const STORE_SAVES = 'saves';
        let dbPromise = null;
        function ensureDb() {
            if (!dbPromise) {
                dbPromise = new Promise((resolve, reject) => {
                    const req = indexedDB.open(DB_NAME, DB_VERSION);
                    req.onupgradeneeded = () => {
                        const db = req.result;
                        if (!db.objectStoreNames.contains(STORE_SAVES)) {
                            db.createObjectStore(STORE_SAVES, { keyPath: 'slot' });
                        }
                    };
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });
            }
            return dbPromise;
        }
        async function saveSlot(slot, payload) {
            const db = await ensureDb();
            const tx = db.transaction(STORE_SAVES, 'readwrite');
            tx.objectStore(STORE_SAVES).put({ slot, payload, createdAt: Date.now() });
            await transactionDone(tx);
        }
        async function loadSlot(slot) {
            const db = await ensureDb();
            const tx = db.transaction(STORE_SAVES, 'readonly');
            const req = tx.objectStore(STORE_SAVES).get(slot);
            const result = await requestAsPromise(req);
            await transactionDone(tx);
            return result?.payload;
        }
        async function deleteSlot(slot) {
            const db = await ensureDb();
            const tx = db.transaction(STORE_SAVES, 'readwrite');
            tx.objectStore(STORE_SAVES).delete(slot);
            await transactionDone(tx);
        }
        function transactionDone(tx) {
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            });
        }
        function requestAsPromise(req) {
            return new Promise((resolve, reject) => {
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }
        exports.ensureDb = ensureDb;
        exports.saveSlot = saveSlot;
        exports.loadSlot = loadSlot;
        exports.deleteSlot = deleteSlot;
    },
    'storage/snapshot.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('storage/snapshot.js') };
        function createSnapshot(sim) {
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
        exports.createSnapshot = createSnapshot;
    },
    'worker/worker.entry.js': function (require, exports, module) {
        const __import_meta = { url: moduleUrl('worker/worker.entry.js') };
        const { Simulation } = require('../core/sim.js');
        const { saveSlot, loadSlot, deleteSlot } = require('../storage/idb.js');
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
    }
  };
  const MODULE_CACHE = {};
  const BASE_URL = new URL('./game/dist/', window.location.href);

  function moduleUrl(id) {
    return new URL(id, BASE_URL).href;
  }

  function normalize(id) {
    const parts = id.split('/');
    const stack = [];
    for (const part of parts) {
      if (!part || part === '.') continue;
      if (part === '..') {
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    return stack.join('/');
  }

  function resolve(fromId, spec) {
    if (spec.startsWith('.')) {
      const base = fromId.includes('/') ? fromId.slice(0, fromId.lastIndexOf('/') + 1) : '';
      return normalize(base + spec);
    }
    return spec;
  }

  function load(id) {
    const normalized = normalize(id);
    if (MODULE_CACHE[normalized]) {
      return MODULE_CACHE[normalized].exports;
    }
    const factory = MODULE_FACTORIES[normalized];
    if (!factory) {
      throw new Error('Module not found: ' + normalized);
    }
    const module = { exports: {} };
    MODULE_CACHE[normalized] = module;
    const localRequire = (spec) => load(resolve(normalized, spec));
    factory(localRequire, module.exports, module);
    return module.exports;
  }

  load('main.js');
})();
