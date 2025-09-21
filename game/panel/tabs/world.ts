import type { PanelHooks } from '../panel.js';
import type { FramePayload } from '../../types.d.ts';

interface TabContext {
  hooks: PanelHooks;
}

interface PanelState {
  frame: FramePayload | null;
}

interface TabInstance {
  id: string;
  label: string;
  element: HTMLElement;
  update(state: PanelState): void;
}

export function createWorldTab(ctx: TabContext): TabInstance {
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
  const regen = element.querySelector('[data-action="regen"]') as HTMLButtonElement;
  const seedInput = element.querySelector('[data-input="seed"]') as HTMLInputElement;
  regen.addEventListener('click', () => {
    ctx.hooks.send({ type: 'WORLD', payload: { action: 'regen', seed: Number(seedInput.value) } });
  });
  const seasonEl = element.querySelector('[data-world="season"]') as HTMLElement;
  const weatherEl = element.querySelector('[data-world="weather"]') as HTMLElement;

  return {
    id: 'world',
    label: 'Мир',
    element,
    update(state: PanelState) {
      if (state.frame) {
        seasonEl.textContent = state.frame.world.season;
        weatherEl.textContent = state.frame.world.weather;
      }
    }
  };
}
