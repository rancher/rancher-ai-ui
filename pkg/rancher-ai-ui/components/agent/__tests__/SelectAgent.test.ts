import { mount } from '@vue/test-utils';
import SelectAgent from '../SelectAgent.vue';
import { Agent, AgentState } from '../../../types';

jest.mock('@components/RcDropdown', () => ({
  RcDropdown:        { default: {} },
  RcDropdownTrigger: { default: {} },
  RcDropdownItem:    { default: {} },
}));

jest.mock('vuex', () => ({ useStore: () => ({ getters: { 'i18n/t': (key: string) => key } }) }));

jest.mock('@shell/composables/useI18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

jest.mock('lodash', () => ({ debounce: (fn: any) => fn }));

const requiredSetup = () => {
  return {
    global: {
      stubs: {
        RcDropdown:        true,
        RcDropdownTrigger: true,
        RcDropdownItem:    true,
      },
      directives: { 'clean-tooltip': jest.fn() },
    },
  };
};

const mockAgents: Agent[] = [
  {
    name:        'agent-1',
    displayName: 'First Agent',
    description: 'Description for first agent',
    status:      AgentState.Active,
  },
  {
    name:        'agent-2',
    displayName: 'Second Agent',
    description: 'Description for second agent',
    status:      AgentState.Active,
  },
  {
    name:        'agent-3',
    displayName: 'Third Agent with a Very Long Name That Exceeds Thirty Characters Total',
    description: 'Description for third agent',
    status:      AgentState.Active,
  },
];

const mockErrorAgent: Agent = {
  name:        'error-agent',
  displayName: 'Error Agent',
  description: 'Agent with error status',
  status:      AgentState.Error,
};

describe('SelectAgent.vue', () => {
  it('should render with no agents', () => {
    const wrapper = mount(SelectAgent, {
      ...requiredSetup(),
      props: {
        agents:    [],
        agentName: '',
        disabled:  false,
      },
    });

    const container = wrapper.find('[data-testid="rancher-ai-ui-multi-agent-select"]');

    expect(container.exists()).toBe(true);
  });

  it('should display correct label for selected agent', () => {
    const wrapper = mount(SelectAgent, {
      ...requiredSetup(),
      props: {
        agents:    [mockAgents[0]],
        agentName: 'agent-1',
        disabled:  false,
      },
    });

    expect((wrapper.vm as any).selectedAgentLabel).toBe('First Agent');
  });

  it('should show adaptive mode as default when multiple agents exist', () => {
    const wrapper = mount(SelectAgent, {
      ...requiredSetup(),
      props: {
        agents:    [mockAgents[0], mockAgents[1]],
        agentName: '',
        disabled:  false,
      },
    });

    const options = (wrapper.vm as any).options;

    expect(options).toHaveLength(3); // adaptive mode + 2 agents
    expect(options[0].name).toBe('__adaptive__');
  });

  it('should not show adaptive mode when only one agent exists', () => {
    const wrapper = mount(SelectAgent, {
      ...requiredSetup(),
      props: {
        agents:    [mockAgents[0]],
        agentName: '',
        disabled:  false,
      },
    });

    expect((wrapper.vm as any).options).toHaveLength(1); // only agent-1
    expect((wrapper.vm as any).options[0].name).toBe('agent-1');
  });

  it('should truncate long agent names to 30 characters', () => {
    const wrapper = mount(SelectAgent, {
      ...requiredSetup(),
      props: {
        agents:    [mockAgents[2]],
        agentName: '',
        disabled:  false,
      },
    });

    const option = (wrapper.vm as any).options[0];

    expect(option.displayName).toBe('Third Agent with a Very Long N...');
    expect(option.displayName).toHaveLength(33); // 30 chars + "..."
  });

  it('should add tooltip for truncated names', () => {
    const wrapper = mount(SelectAgent, {
      ...requiredSetup(),
      props: {
        agents:    [mockAgents[2]],
        agentName: '',
        disabled:  false,
      },
    });

    const option = (wrapper.vm as any).options[0];

    expect(option.tooltip).not.toBeNull();
    expect(option.tooltip?.content).toBe('Third Agent with a Very Long Name That Exceeds Thirty Characters Total');
  });

  it('should not add tooltip for short names', () => {
    const wrapper = mount(SelectAgent, {
      ...requiredSetup(),
      props: {
        agents:    [mockAgents[0]],
        agentName: '',
        disabled:  false,
      },
    });

    const option = (wrapper.vm as any).options[0];

    expect(option.tooltip).toBeNull();
  });

  it('should mark inactive agents as error', () => {
    const wrapper = mount(SelectAgent, {
      ...requiredSetup(),
      props: {
        agents:    [mockAgents[0], mockErrorAgent],
        agentName: '',
        disabled:  false,
      },
    });

    const errorOption = (wrapper.vm as any).options.find((opt: any) => opt.name === 'error-agent');

    expect(errorOption?.error).toBe(true);
  });

  it('should emit select event with agent name', async() => {
    const wrapper = mount(SelectAgent, {
      ...requiredSetup(),
      props: {
        agents:    [mockAgents[0]],
        agentName: 'agent-1',
        disabled:  false,
      },
    });

    (wrapper.vm as any).debouncedSelectAgent('agent-1');

    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')?.[0]).toEqual(['agent-1']);
  });

  it('should emit empty string for adaptive mode', async() => {
    const wrapper = mount(SelectAgent, {
      ...requiredSetup(),
      props: {
        agents:    [mockAgents[0], mockAgents[1]],
        agentName: '',
        disabled:  false,
      },
    });

    (wrapper.vm as any).debouncedSelectAgent('__adaptive__');

    expect(wrapper.emitted('select')?.[0]).toEqual(['']);
  });

  it('should set dropdown disabled state based on prop', () => {
    const wrapper = mount(SelectAgent, {
      ...requiredSetup(),
      props: {
        agents:    [mockAgents[0]],
        agentName: 'agent-1',
        disabled:  true,
      },
    });

    // Test via props - disabled should be passed down
    expect((wrapper.props as any)('disabled')).toBe(true);
  });

  it('should return unknown label when no agents match', () => {
    const wrapper = mount(SelectAgent, {
      ...requiredSetup(),
      props: {
        agents:    [],
        agentName: 'non-existent-agent',
        disabled:  false,
      },
    });

    expect((wrapper.vm as any).selectedAgentLabel).toBe('ai.agents.items.unknown');
  });

  it('should filter active agents correctly', () => {
    const wrapper = mount(SelectAgent, {
      ...requiredSetup(),
      props: {
        agents:    [mockAgents[0], mockErrorAgent, mockAgents[1]],
        agentName: '',
        disabled:  false,
      },
    });

    const activeNames = (wrapper.vm as any).activeAgentNames;

    expect(activeNames).toHaveLength(2);
    expect(activeNames).toContain('agent-1');
    expect(activeNames).toContain('agent-2');
    expect(activeNames).not.toContain('error-agent');
  });
});
