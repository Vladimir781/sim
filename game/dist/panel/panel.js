import { createOverviewTab } from './tabs/overview.js';
import { createAgentsTab } from './tabs/agents.js';
import { createWorldTab } from './tabs/world.js';
import { createCommsTab } from './tabs/comms.js';
import { createEventsTab } from './tabs/events.js';
import { createSavesTab } from './tabs/saves.js';
import { createSettingsTab } from './tabs/settings.js';
import { createHelpTab } from './tabs/help.js';
export function createPanel(root, hooks) {
    const container = document.createElement('div');
    container.className = 'panel hidden';
    const tabsHeader = document.createElement('div');
    tabsHeader.className = 'panel-tabs';
    const tabsBody = document.createElement('div');
    tabsBody.className = 'panel-body';
    container.appendChild(tabsHeader);
    container.appendChild(tabsBody);
    root.appendChild(container);
    const state = {
        frame: null,
        timeline: [],
        agents: null
    };
    const tabFactories = [
        createOverviewTab,
        createAgentsTab,
        createWorldTab,
        createCommsTab,
        createEventsTab,
        createSavesTab,
        createSettingsTab,
        createHelpTab
    ];
    const tabs = tabFactories.map((factory) => factory({ hooks }));
    let activeTab = null;
    for (const tab of tabs) {
        const button = document.createElement('button');
        button.textContent = tab.label;
        button.className = 'panel-tab-button';
        button.addEventListener('click', () => activateTab(tab));
        tabsHeader.appendChild(button);
        tab.element.classList.add('panel-tab');
        tabsBody.appendChild(tab.element);
    }
    const toggleButton = document.createElement('button');
    toggleButton.className = 'panel-toggle';
    toggleButton.title = 'Открыть панель';
    toggleButton.textContent = '⚙️';
    toggleButton.addEventListener('click', () => {
        container.classList.toggle('hidden');
        toggleButton.classList.toggle('active');
    });
    root.appendChild(toggleButton);
    function activateTab(tab) {
        if (activeTab === tab)
            return;
        activeTab?.element.classList.remove('active');
        tab.element.classList.add('active');
        activeTab = tab;
        tab.update(state);
    }
    activateTab(tabs[0]);
    function updateTabs() {
        if (!activeTab)
            return;
        activeTab.update(state);
    }
    return {
        setFrame(frame) {
            state.frame = frame;
            updateTabs();
        },
        setTimeline(items) {
            state.timeline = items;
            updateTabs();
        },
        setAgents(data) {
            state.agents = data;
            updateTabs();
        }
    };
}
