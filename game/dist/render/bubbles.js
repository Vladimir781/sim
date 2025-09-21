export function computeBubbles(sim) {
    const recent = sim.comms.latest(24);
    return recent.map((msg) => {
        const agent = sim.agents.find((a) => a.id === msg.agentId);
        return {
            x: agent ? agent.x : 0,
            y: agent ? agent.y : 0,
            symbol: msg.symbols[0] ?? 0
        };
    });
}
