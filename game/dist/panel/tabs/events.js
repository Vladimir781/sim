const presetEvents = [
    { type: 'storm', title: 'Буря' },
    { type: 'raid', title: 'Набег' },
    { type: 'drought', title: 'Засуха' },
    { type: 'ritual', title: 'Ритуал' }
];
export function createEventsTab(ctx) {
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
