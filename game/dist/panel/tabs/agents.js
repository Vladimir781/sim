export function createAgentsTab(ctx) {
    const element = document.createElement('div');
    element.innerHTML = `
    <section>
      <h2>Агенты</h2>
      <div class="agent-actions">
        <button data-action="kill">Убить</button>
        <button data-action="freeze">Заморозить</button>
        <button data-action="fsm">FSM</button>
        <button data-action="priority">think=1</button>
        <button data-action="mute">Mute</button>
      </div>
      <table class="agent-table">
        <thead>
          <tr>
            <th><input type="checkbox" data-select="all"/></th>
            <th>ID</th><th>Роль</th><th>Режим</th><th>thinkEvery</th><th>ms</th><th>msg/min</th><th>E</th><th>T</th><th>x</th><th>y</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>
  `;
    const tbody = element.querySelector('tbody');
    const selection = new Set();
    element.querySelectorAll('[data-action]').forEach((button) => {
        button.addEventListener('click', () => {
            const ids = Array.from(selection);
            if (!ids.length)
                return;
            const action = button.dataset.action;
            ctx.hooks.send({ type: 'AGENTS', payload: { action, ids } });
        });
    });
    const selectAll = element.querySelector('[data-select="all"]');
    selectAll.addEventListener('change', () => {
        if (!currentRows)
            return;
        selection.clear();
        if (selectAll.checked) {
            currentRows.forEach((row) => selection.add(row.id));
        }
        updateSelection();
    });
    let currentRows = null;
    function updateSelection() {
        tbody.querySelectorAll('tr').forEach((tr) => {
            const id = Number(tr.dataset.id);
            tr.classList.toggle('selected', selection.has(id));
            const checkbox = tr.querySelector('input[type="checkbox"]');
            checkbox.checked = selection.has(id);
        });
    }
    function renderRows(rows) {
        tbody.innerHTML = '';
        currentRows = rows;
        for (const row of rows) {
            const tr = document.createElement('tr');
            tr.dataset.id = String(row.id);
            tr.innerHTML = `
        <td><input type="checkbox" data-id="${row.id}"/></td>
        <td>${row.id}</td>
        <td>${row.role}</td>
        <td>${row.mode}</td>
        <td>${row.thinkEvery}</td>
        <td>${row.ms.toFixed(2)}</td>
        <td>${row.talk.toFixed(2)}</td>
        <td>${row.energy.toFixed(2)}</td>
        <td>${row.heat.toFixed(2)}</td>
        <td>${row.x}</td>
        <td>${row.y}</td>
      `;
            tr.querySelector('input').addEventListener('change', (ev) => {
                const checked = ev.currentTarget.checked;
                if (checked)
                    selection.add(row.id);
                else
                    selection.delete(row.id);
                updateSelection();
            });
            tbody.appendChild(tr);
        }
        updateSelection();
    }
    return {
        id: 'agents',
        label: 'Агенты',
        element,
        update(state) {
            if (state.agents) {
                renderRows(state.agents.rows);
            }
        }
    };
}
