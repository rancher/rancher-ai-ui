import { shallowMount } from '@vue/test-utils';
import StatusInfo from '../StatusInfo.vue';
import { MessagePlanning, MessagePlanningStatus, Agent } from '../../../../types';

const mockStore = {
  state: {
    $router: { push: jest.fn() },
    $route:  { params: { cluster: 'local' } }
  }
};

jest.mock('@shell/composables/useI18n', () => ({
  useI18n: jest.fn(() => ({
    t: (key: string, params?: any) => {
      if (params?.count) {
        return `${ key }.count`;
      }

      return key;
    },
    store: mockStore
  }))
}));

jest.mock('@components/RcButton/RcButton.vue', () => ({
  default: {
    name:     'RcButton',
    template: '<button class="rc-button"><slot /></button>',
    props:    ['small', 'variant', 'size', 'aria-label', 'data-testid'],
    emits:    ['click', 'keydown.enter.space.stop']
  }
}));

jest.mock('../../../../composables/useLocalStorageComposable', () => ({
  useLocalStorageComposable: jest.fn(() => ({
    get: jest.fn(() => false),
    set: jest.fn()
  }))
}));

jest.mock('../../../context/ContextTag.vue', () => ({
  default: {
    name:     'ContextTag',
    template: '<div class="context-tag" />',
    props:    ['item', 'removeEnabled', 'type']
  }
}));

const createMockMessagePlanning = (overrides?: Partial<MessagePlanning>): MessagePlanning => ({
  messageId: '1',
  approval:  false,
  tasks:     [
    {
      task:   'Task 1',
      agent:  'agent1',
      status: MessagePlanningStatus.Pending
    },
    {
      task:   'Task 2',
      agent:  'agent2',
      status: MessagePlanningStatus.Completed
    }
  ],
  status:       MessagePlanningStatus.Pending,
  isCollapsed:  false,
  ...overrides
});

const createMockAgent = (overrides?: Partial<Agent>): Agent => ({
  name:        'agent1',
  displayName: 'Agent 1',
  description: 'Test Agent',
  ...overrides
});

const requiredSetup = () => ({ global: { provide: { store: mockStore } } });

describe('StatusInfo.vue', () => {
  describe('Component Initialization', () => {
    it('should render the component when tasks are present', () => {
      const value = createMockMessagePlanning({
        tasks: [
          {
            task:   'Task 1',
            agent:  'agent1',
            status: MessagePlanningStatus.Pending
          }
        ]
      });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: [createMockAgent()]
        },
        ...requiredSetup()
      });

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('.planning-state-container').exists()).toBe(true);
    });

    it('should not render when tasks are empty', () => {
      const value = createMockMessagePlanning({ tasks: [] });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: []
        },
        ...requiredSetup()
      });

      expect(wrapper.find('.planning-state-container').exists()).toBe(false);
    });

    it('should initialize with isCollapsed from prop', () => {
      const value = createMockMessagePlanning({ isCollapsed: true });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: [createMockAgent()]
        },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).isCollapsed).toBe(true);
      expect(wrapper.find('.planning-state-container.collapsed').exists()).toBe(true);
    });
  });

  describe('Props Handling', () => {
    it('should accept value prop', () => {
      const value = createMockMessagePlanning();

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: []
        },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).props.value).toEqual(value);
    });

    it('should accept agents prop', () => {
      const agents = [
        createMockAgent({
          name:        'agent1',
          displayName: 'Agent 1'
        }),
        createMockAgent({
          name:        'agent2',
          displayName: 'Agent 2'
        })
      ];

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value: createMockMessagePlanning(),
          agents
        },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).props.agents).toEqual(agents);
    });

    it('should accept disabled prop', () => {
      const wrapper = shallowMount(StatusInfo, {
        props: {
          value:    createMockMessagePlanning(),
          agents:   [],
          disabled: true
        },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).props.disabled).toBe(true);
      expect(wrapper.find('.planning-state-container.disabled-panel').exists()).toBe(true);
    });
  });

  describe('Computed Properties', () => {
    describe('items', () => {
      it('should map tasks to items with agent display names', () => {
        const value = createMockMessagePlanning({
          tasks: [
            {
              task:   'Task 1',
              agent:  'agent1',
              status: MessagePlanningStatus.Pending
            },
            {
              task:   'Task 2',
              agent:  'agent2',
              status: MessagePlanningStatus.Completed
            }
          ]
        });
        const agents = [
          createMockAgent({
            name:        'agent1',
            displayName: 'Agent One'
          }),
          createMockAgent({
            name:        'agent2',
            displayName: 'Agent Two'
          })
        ];

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents
          },
          ...requiredSetup()
        });

        const items = (wrapper.vm as any).items;

        expect(items).toHaveLength(2);
        expect(items[0]).toEqual({
          task:   'Task 1',
          agent:  'Agent One',
          status: MessagePlanningStatus.Pending
        });
        expect(items[1]).toEqual({
          task:   'Task 2',
          agent:  'Agent Two',
          status: MessagePlanningStatus.Completed
        });
      });

      it('should use agent name when displayName is not available', () => {
        const value = createMockMessagePlanning({
          tasks: [{
            task:  'Task 1',
            agent: 'agent1'
          }]
        });
        const agents = [createMockAgent({
          name:        'agent1',
          displayName: undefined
        })];

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents
          },
          ...requiredSetup()
        });

        const items = (wrapper.vm as any).items;

        expect(items[0].agent).toBe('agent1');
      });

      it('should use agent name when agent is not found in list', () => {
        const value = createMockMessagePlanning({
          tasks: [{
            task:  'Task 1',
            agent: 'unknown-agent'
          }]
        });
        const agents = [createMockAgent({ name: 'agent1' })];

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents
          },
          ...requiredSetup()
        });

        const items = (wrapper.vm as any).items;

        expect(items[0].agent).toBe('unknown-agent');
      });
    });

    describe('spinningStatus', () => {
      it('should be true when status is Pending', () => {
        const value = createMockMessagePlanning({ status: MessagePlanningStatus.Pending });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: []
          },
          ...requiredSetup()
        });

        expect((wrapper.vm as any).spinningStatus).toBe(true);
      });

      it('should be true when status is InProgress', () => {
        const value = createMockMessagePlanning({ status: MessagePlanningStatus.InProgress });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: []
          },
          ...requiredSetup()
        });

        expect((wrapper.vm as any).spinningStatus).toBe(true);
      });

      it('should be true when status is Canceling', () => {
        const value = createMockMessagePlanning({ status: MessagePlanningStatus.Canceling });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: []
          },
          ...requiredSetup()
        });

        expect((wrapper.vm as any).spinningStatus).toBe(true);
      });

      it('should be false when status is Completed', () => {
        const value = createMockMessagePlanning({ status: MessagePlanningStatus.Completed });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: []
          },
          ...requiredSetup()
        });

        expect((wrapper.vm as any).spinningStatus).toBe(false);
      });
    });

    describe('inactiveStatus', () => {
      it('should be true when status is Canceling', () => {
        const value = createMockMessagePlanning({ status: MessagePlanningStatus.Canceling });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: []
          },
          ...requiredSetup()
        });

        expect((wrapper.vm as any).inactiveStatus).toBe(true);
      });

      it('should be true when status is Canceled', () => {
        const value = createMockMessagePlanning({ status: MessagePlanningStatus.Canceled });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: []
          },
          ...requiredSetup()
        });

        expect((wrapper.vm as any).inactiveStatus).toBe(true);
      });

      it('should be false for other statuses', () => {
        const value = createMockMessagePlanning({ status: MessagePlanningStatus.Completed });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: []
          },
          ...requiredSetup()
        });

        expect((wrapper.vm as any).inactiveStatus).toBe(false);
      });
    });

    describe('segments', () => {
      it('should calculate progress segments for completed tasks', () => {
        const value = createMockMessagePlanning({
          tasks: [
            {
              task:   'Task 1',
              status: MessagePlanningStatus.Completed
            },
            {
              task:   'Task 2',
              status: MessagePlanningStatus.Completed
            },
            {
              task:   'Task 3',
              status: MessagePlanningStatus.Pending
            }
          ]
        });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: []
          },
          ...requiredSetup()
        });

        const segments = (wrapper.vm as any).segments;

        expect(segments).toHaveLength(2);
        expect(segments[0].percent).toBeCloseTo(66.67, 1);
        expect(segments[1].percent).toBeCloseTo(33.33, 1);
      });

      it('should show minimal progress when no tasks are completed', () => {
        const value = createMockMessagePlanning({
          tasks: [
            {
              task:   'Task 1',
              status: MessagePlanningStatus.Pending
            },
            {
              task:   'Task 2',
              status: MessagePlanningStatus.Pending
            }
          ]
        });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: []
          },
          ...requiredSetup()
        });

        const segments = (wrapper.vm as any).segments;

        expect(segments[0].percent).toBe(1);
        expect(segments[1].percent).toBe(99);
      });

      it('should use disabled colors when status is inactive', () => {
        const value = createMockMessagePlanning({
          status: MessagePlanningStatus.Canceled,
          tasks:  [{
            task:   'Task 1',
            status: MessagePlanningStatus.Completed
          }]
        });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: []
          },
          ...requiredSetup()
        });

        const segments = (wrapper.vm as any).segments;

        expect(segments[0].color).toBe('disabled');
        expect(segments[1].color).toBe('rc-disabled-background');
      });

      it('should use info colors when status is active', () => {
        const value = createMockMessagePlanning({
          status: MessagePlanningStatus.InProgress,
          tasks:  [{
            task:   'Task 1',
            status: MessagePlanningStatus.Completed
          }]
        });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: []
          },
          ...requiredSetup()
        });

        const segments = (wrapper.vm as any).segments;

        expect(segments[0].color).toBe('info');
        expect(segments[1].color).toBe('disabled');
      });
    });

    describe('planningHeader', () => {
      it('should generate correct header for expanded state without approval', () => {
        const value = createMockMessagePlanning({
          approval:    false,
          isCollapsed: false,
          status:      MessagePlanningStatus.InProgress,
          tasks:       [
            {
              task:  'Task 1',
              agent: 'agent1'
            },
            {
              task:  'Task 2',
              agent: 'agent1'
            }
          ]
        });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: [createMockAgent()]
          },
          ...requiredSetup()
        });

        const header = (wrapper.vm as any).planningHeader;

        expect(header).toContain('ai.planning.header.label.withoutApproval.expanded.in_progress.count');
      });

      it('should generate correct header for collapsed state with approval', () => {
        const value = createMockMessagePlanning({
          approval:    true,
          isCollapsed: true,
          status:      MessagePlanningStatus.Pending,
          tasks:       [
            {
              task:  'Task 1',
              agent: 'agent1'
            },
            {
              task:  'Task 2',
              agent: 'agent2'
            }
          ]
        });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: [createMockAgent(), createMockAgent({ name: 'agent2' })]
          },
          ...requiredSetup()
        });

        const header = (wrapper.vm as any).planningHeader;

        expect(header).toContain('ai.planning.header.label.withApproval.collapsed.pending.count');
      });
    });

    describe('currentRunningTask', () => {
      it('should return current running task when status is InProgress', () => {
        const value = createMockMessagePlanning({
          status: MessagePlanningStatus.InProgress,
          tasks:  [
            {
              task:   'Task 1',
              status: MessagePlanningStatus.Completed
            },
            {
              task:   'Task 2',
              status: MessagePlanningStatus.InProgress
            }
          ]
        });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: []
          },
          ...requiredSetup()
        });

        expect((wrapper.vm as any).currentRunningTask).toBe('Task 2');
      });

      it('should return null when status is not InProgress', () => {
        const value = createMockMessagePlanning({
          status: MessagePlanningStatus.Completed,
          tasks:  [
            {
              task:   'Task 1',
              status: MessagePlanningStatus.Completed
            }
          ]
        });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: []
          },
          ...requiredSetup()
        });

        expect((wrapper.vm as any).currentRunningTask).toBeNull();
      });
    });

    describe('displayHeader', () => {
      it('should show executing task when collapsed and running', () => {
        const value = createMockMessagePlanning({
          isCollapsed: true,
          status:      MessagePlanningStatus.InProgress,
          tasks:       [{
            task:   'Current Task',
            status: MessagePlanningStatus.InProgress
          }]
        });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: []
          },
          ...requiredSetup()
        });

        const header = (wrapper.vm as any).displayHeader;

        expect(header).toContain('ai.planning.header.executing');
      });

      it('should show planning header when expanded', () => {
        const value = createMockMessagePlanning({
          isCollapsed: false,
          status:      MessagePlanningStatus.Pending,
          tasks:       [{
            task:  'Task 1',
            agent: 'agent1'
          }]
        });

        const wrapper = shallowMount(StatusInfo, {
          props: {
            value,
            agents: [createMockAgent()]
          },
          ...requiredSetup()
        });

        const header = (wrapper.vm as any).displayHeader;

        expect(header).not.toContain('ai.planning.header.executing');
      });
    });
  });

  describe('Events', () => {
    it('should emit confirm event with true when confirm button is clicked', async() => {
      const value = createMockMessagePlanning({
        approval: true,
        status:   MessagePlanningStatus.Pending
      });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: []
        },
        ...requiredSetup()
      });

      // Simulate confirm action
      await (wrapper.vm as any).$emit('confirm', true);

      expect(wrapper.emitted('confirm')).toBeTruthy();
    });

    it('should emit stop event when cancel running button is clicked', async() => {
      const value = createMockMessagePlanning({
        approval: true,
        status:   MessagePlanningStatus.InProgress
      });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: []
        },
        ...requiredSetup()
      });

      await (wrapper.vm as any).$emit('stop');

      expect(wrapper.emitted('stop')).toBeTruthy();
    });

    it('should emit collapse event with collapsed state', async() => {
      const value = createMockMessagePlanning();

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: []
        },
        ...requiredSetup()
      });

      await (wrapper.vm as any).toggleCollapse();

      expect(wrapper.emitted('collapse')).toBeTruthy();
      expect(wrapper.emitted('collapse')?.[0]).toEqual([true]);
    });
  });

  describe('User Interactions', () => {
    it('should toggle collapse state', async() => {
      const value = createMockMessagePlanning({ isCollapsed: false });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: []
        },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).isCollapsed).toBe(false);

      await (wrapper.vm as any).toggleCollapse();

      expect((wrapper.vm as any).isCollapsed).toBe(true);
    });

    it('should toggle collapse state back to expanded', async() => {
      const value = createMockMessagePlanning({ isCollapsed: true });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: []
        },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).isCollapsed).toBe(true);

      await (wrapper.vm as any).toggleCollapse();

      expect((wrapper.vm as any).isCollapsed).toBe(false);
    });
  });

  describe('Template Rendering', () => {
    it('should render planning-state-header', () => {
      const value = createMockMessagePlanning();

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: [createMockAgent()]
        },
        ...requiredSetup()
      });

      expect(wrapper.find('.planning-state-header').exists()).toBe(true);
    });

    it('should render collapse button', () => {
      const value = createMockMessagePlanning();

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: [createMockAgent()]
        },
        ...requiredSetup()
      });

      const collapseButton = wrapper.find('[data-testid="rancher-ai-ui-planning-status-info-toggle-collapse-button"]');

      expect(collapseButton.exists()).toBe(true);
    });

    it('should render progress bar', () => {
      const value = createMockMessagePlanning();

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: [createMockAgent()]
        },
        ...requiredSetup()
      });

      expect(wrapper.findComponent({ name: 'StatusBar' }).exists()).toBe(true);
    });

    it('should render planning-state-content when not collapsed', () => {
      const value = createMockMessagePlanning({ isCollapsed: false });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: [createMockAgent()]
        },
        ...requiredSetup()
      });

      expect(wrapper.find('.planning-state-content').exists()).toBe(true);
    });

    it('should not render planning-state-content when collapsed', () => {
      const value = createMockMessagePlanning({ isCollapsed: true });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: [createMockAgent()]
        },
        ...requiredSetup()
      });

      expect(wrapper.find('.planning-state-content').exists()).toBe(false);
    });

    it('should render task items with correct data-testid', () => {
      const value = createMockMessagePlanning({
        isCollapsed: false,
        tasks:       [
          {
            task:  'Task 1',
            agent: 'agent1'
          },
          {
            task:  'Task 2',
            agent: 'agent2'
          }
        ]
      });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: [createMockAgent()]
        },
        ...requiredSetup()
      });

      expect(wrapper.find('[data-testid="rancher-ai-ui-planning-status-info-item-0"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="rancher-ai-ui-planning-status-info-item-1"]').exists()).toBe(true);
    });

    it('should render approval buttons when approval is true and status is Pending', () => {
      const value = createMockMessagePlanning({
        approval: true,
        status:   MessagePlanningStatus.Pending
      });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: []
        },
        ...requiredSetup()
      });

      expect(wrapper.find('.cancel-button').exists()).toBe(true);
      expect(wrapper.find('.confirm-button').exists()).toBe(true);
    });

    it('should render stop button when approval is true and status is InProgress', () => {
      const value = createMockMessagePlanning({
        approval: true,
        status:   MessagePlanningStatus.InProgress
      });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: []
        },
        ...requiredSetup()
      });

      expect(wrapper.find('.cancel-button').exists()).toBe(true);
    });

    it('should render result status when status is not Pending or InProgress', () => {
      const value = createMockMessagePlanning({
        approval: true,
        status:   MessagePlanningStatus.Completed
      });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: []
        },
        ...requiredSetup()
      });

      expect(wrapper.find('.planning-state-result').exists()).toBe(true);
    });

    it('should render context tag for agents', () => {
      const value = createMockMessagePlanning({
        isCollapsed: false,
        tasks:       [{
          task:  'Task 1',
          agent: 'agent1'
        }]
      });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: [createMockAgent()]
        },
        ...requiredSetup()
      });

      expect(wrapper.findComponent({ name: 'ContextTag' }).exists()).toBe(true);
    });
  });

  describe('CSS Classes', () => {
    it('should apply disabled-panel class when disabled prop is true', () => {
      const value = createMockMessagePlanning();

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents:   [],
          disabled: true
        },
        ...requiredSetup()
      });

      expect(wrapper.find('.planning-state-container.disabled-panel').exists()).toBe(true);
    });

    it('should apply collapsed class when isCollapsed is true', () => {
      const value = createMockMessagePlanning({ isCollapsed: true });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: []
        },
        ...requiredSetup()
      });

      expect(wrapper.find('.planning-state-container.collapsed').exists()).toBe(true);
    });

    it('should apply status-specific classes to items', () => {
      const value = createMockMessagePlanning({
        isCollapsed: false,
        tasks:       [
          {
            task:   'Task 1',
            agent:  'agent1',
            status: MessagePlanningStatus.Completed
          },
          {
            task:   'Task 2',
            agent:  'agent2',
            status: MessagePlanningStatus.Pending
          }
        ]
      });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: [createMockAgent()]
        },
        ...requiredSetup()
      });

      expect(wrapper.find('.planning-state-status-completed').exists()).toBe(true);
      expect(wrapper.find('.planning-state-status-pending').exists()).toBe(true);
    });
  });

  describe('Lifecycle', () => {
    it('should collapse panel on unmount if not already collapsed', async() => {
      const value = createMockMessagePlanning({ isCollapsed: false });

      const wrapper = shallowMount(StatusInfo, {
        props: {
          value,
          agents: []
        },
        ...requiredSetup()
      });

      wrapper.unmount();

      // The component should emit collapse event on unmount if not already collapsed
      expect(wrapper.emitted('collapse')).toBeTruthy();
      expect(wrapper.emitted('collapse')?.[0]).toEqual([true]);
    });
  });
});
