export type Entity = number;

export class ECS {
  private nextId = 1;
  private readonly components = new Map<string, Map<Entity, any>>();

  create(): Entity {
    return this.nextId++;
  }

  destroy(id: Entity): void {
    for (const store of this.components.values()) {
      store.delete(id);
    }
  }

  addComponent<T>(id: Entity, name: string, value: T): void {
    let store = this.components.get(name);
    if (!store) {
      store = new Map();
      this.components.set(name, store);
    }
    store.set(id, value);
  }

  getComponent<T>(id: Entity, name: string): T | undefined {
    return this.components.get(name)?.get(id);
  }

  removeComponent(id: Entity, name: string): void {
    this.components.get(name)?.delete(id);
  }

  *iterate(name: string): Iterable<[Entity, any]> {
    const store = this.components.get(name);
    if (!store) return;
    for (const entry of store.entries()) {
      yield entry;
    }
  }

  snapshot(): Record<string, Record<string, unknown>> {
    const out: Record<string, Record<string, unknown>> = {};
    for (const [name, store] of this.components.entries()) {
      out[name] = {};
      for (const [entity, value] of store.entries()) {
        out[name][String(entity)] = value;
      }
    }
    return out;
  }
}
