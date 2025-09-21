import type { PanelHooks } from '../panel.js';
import type { FramePayload, TimelineItem } from '../../types.d.ts';

interface TabContext {
  hooks: PanelHooks;
}

interface PanelState {
  frame: FramePayload | null;
  timeline: TimelineItem[];
}

interface TabInstance {
  id: string;
  label: string;
  element: HTMLElement;
  update(state: PanelState): void;
}

export function createOverviewTab(ctx: TabContext): TabInstance {
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

  const metricEls: Record<string, HTMLElement> = {};
  element.querySelectorAll('[data-metric]').forEach((el) => {
    const key = (el as HTMLElement).dataset.metric!;
    metricEls[key] = el as HTMLElement;
  });

  const timelineList = element.querySelector('.timeline-list') as HTMLOListElement;

  element.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = (button as HTMLElement).dataset.action;
      if (action === 'start') ctx.hooks.send({ type: 'SIM', payload: { command: 'start' } });
      if (action === 'pause') ctx.hooks.send({ type: 'SIM', payload: { command: 'pause' } });
      if (action === 'step') ctx.hooks.send({ type: 'SIM', payload: { command: 'step' } });
    });
  });

  const speedSelect = element.querySelector('[data-input="speed"]') as HTMLSelectElement;
  speedSelect.addEventListener('change', () => {
    ctx.hooks.send({ type: 'SIM', payload: { command: 'start', speed: Number(speedSelect.value) } });
  });

  return {
    id: 'overview',
    label: 'Обзор',
    element,
    update(state: PanelState) {
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
