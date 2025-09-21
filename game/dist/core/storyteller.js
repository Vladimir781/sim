export function createStoryteller() {
    return { tension: 0.3, budget: 1, cooldown: 0, log: [] };
}
export function stepStoryteller(state, tick) {
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
