export function createSettingsTab(ctx) {
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
