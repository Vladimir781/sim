import type { PanelHooks } from '../panel.js';

interface TabContext {
  hooks: PanelHooks;
}

interface TabInstance {
  id: string;
  label: string;
  element: HTMLElement;
  update(): void;
}

export function createSavesTab(ctx: TabContext): TabInstance {
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
  const slotInput = element.querySelector('[data-input="slot"]') as HTMLInputElement;
  element.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = (btn as HTMLElement).dataset.action as 'save' | 'load' | 'delete';
      ctx.hooks.send({ type: 'SAVE', payload: { slot: slotInput.value, action } });
    });
  });
  return {
    id: 'saves',
    label: 'Сейвы и данные',
    element,
    update() {}
  };
}
