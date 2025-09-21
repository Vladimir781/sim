export function createCommsTab(_ctx) {
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
