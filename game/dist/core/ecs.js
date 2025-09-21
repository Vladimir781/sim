export class ECS {
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
