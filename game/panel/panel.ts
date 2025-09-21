import type { AgentListRow, FramePayload, TimelineItem } from '../types.d.ts';
import { createOverviewTab } from './tabs/overview.js';
import { createAgentsTab } from './tabs/agents.js';
import { createWorldTab } from './tabs/world.js';
import { createCommsTab } from './tabs/comms.js';
import { createEventsTab } from './tabs/events.js';
import { createSavesTab } from './tabs/saves.js';
import { createSettingsTab } from './tabs/settings.js';
import { createHelpTab } from './tabs/help.js';

export interface PanelHooks {
  send(message: unknown): void;
}

export interface PanelApi {
  setFrame(frame: FramePayload): void;
  setTimeline(items: TimelineItem[]): void;
  setAgents(data: { page: number; total: number; rows: AgentListRow[] }): void;
}

interface TabInstance {
  id: string;
  label: string;
  element: HTMLElement;
  update(state: PanelState): void;
}

interface PanelState {
  frame: FramePayload | null;
  timeline: TimelineItem[];
  agents: { page: number; total: number; rows: AgentListRow[] } | null;
}

export function createPanel(root: HTMLElement, hooks: PanelHooks): PanelApi {
  const container = document.createElement('div');
  container.className = 'panel hidden';
  const tabsHeader = document.createElement('div');
  tabsHeader.className = 'panel-tabs';
  const tabsBody = document.createElement('div');
  tabsBody.className = 'panel-body';
  container.appendChild(tabsHeader);
  container.appendChild(tabsBody);
  root.appendChild(container);

  const state: PanelState = {
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
  const tabs: TabInstance[] = tabFactories.map((factory) => factory({ hooks }));

  let activeTab: TabInstance | null = null;

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

  function activateTab(tab: TabInstance): void {
    if (activeTab === tab) return;
    activeTab?.element.classList.remove('active');
    tab.element.classList.add('active');
    activeTab = tab;
    tab.update(state);
  }

  activateTab(tabs[0]);

  function updateTabs(): void {
    if (!activeTab) return;
    activeTab.update(state);
  }

  return {
    setFrame(frame: FramePayload) {
      state.frame = frame;
      updateTabs();
    },
    setTimeline(items: TimelineItem[]) {
      state.timeline = items;
      updateTabs();
    },
    setAgents(data: { page: number; total: number; rows: AgentListRow[] }) {
      state.agents = data;
      updateTabs();
    }
  };
}
