export function createWorldTab(ctx) {
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
