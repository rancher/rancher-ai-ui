import type { ComponentPublicInstance } from 'vue';
import { shallowMount, flushPromises, VueWrapper } from '@vue/test-utils';
import MessageActions from '../index.vue';
import { MessageAction, ActionType } from '../../../../types';

jest.mock('../ResourceButton.vue', () => ({
  default: {
    name:     'ResourceButton',
    template: '<div class="resource-button" />',
    props:    {
      value:     {
        type:    Object,
        default: null
      },
      isVisible: {
        type:    Boolean,
        default: false
      }
    }
  }
}));

const mockStore = {
  dispatch: jest.fn(),
  getters:  new Proxy({}, { get: () => jest.fn(() => null) }),
  state:    { $router: { push: jest.fn() } }
};

const createMockMessageAction = (overrides = {}): MessageAction => ({
  type:     ActionType.Button,
  label:    'Test Action',
  resource: {
    cluster:   'local',
    type:      'v1.Pod',
    namespace: 'default',
    name:      'test-pod'
  },
  ...overrides
});

const requiredSetup = () => ({ global: { provide: { store: mockStore } } });

describe('MessageActions (index.vue)', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>;
  let intersectionObserverCallback: any;
  let mockObserver: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup IntersectionObserver mock
    intersectionObserverCallback = undefined;
    mockObserver = {
      observe:    jest.fn(),
      unobserve:  jest.fn(),
      disconnect: jest.fn()
    };

    (globalThis as any).IntersectionObserver = jest.fn((callback) => {
      intersectionObserverCallback = callback;

      return mockObserver;
    }) as any;

    mockStore.dispatch.mockClear();
    mockStore.dispatch.mockResolvedValue({});
    mockStore.state.$router.push.mockClear();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Component Initialization', () => {
    it('should render the component with label and actions', () => {
      const actions = [createMockMessageAction()];

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('.chat-actions-container').exists()).toBe(true);
    });

    it('should initialize with isVisible as false', async() => {
      const actions = [createMockMessageAction()];

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      await wrapper.vm.$nextTick();

      expect((wrapper.vm as any).isVisible).toBe(false);
    });

    it('should render with default label when not provided', () => {
      wrapper = shallowMount(MessageActions, {
        props: { actions: [createMockMessageAction()] },
        ...requiredSetup()
      });

      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('IntersectionObserver Setup', () => {
    it('should create IntersectionObserver on mount', async() => {
      const actions = [createMockMessageAction()];

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      await flushPromises();

      expect((globalThis as any).IntersectionObserver).toHaveBeenCalled();
      expect((wrapper.vm as any).visibilityObserver).not.toBeNull();
    });

    it('should set up observer to track button visibility', async() => {
      const actions = [createMockMessageAction()];

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      await flushPromises();

      expect(mockObserver.observe).toHaveBeenCalled();
    });

    it('should update isVisible when button becomes visible', async() => {
      const actions = [createMockMessageAction()];

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      await flushPromises();

      // Simulate button becoming visible
      intersectionObserverCallback([{
        isIntersecting: true,
        target:         document.createElement('div')
      }]);

      await wrapper.vm.$nextTick();

      expect((wrapper.vm as any).isVisible).toBe(true);
    });

    it('should update isVisible when button becomes invisible', async() => {
      const actions = [createMockMessageAction()];

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      await flushPromises();

      // First make it visible
      intersectionObserverCallback([{
        isIntersecting: true,
        target:         document.createElement('div')
      }]);

      await wrapper.vm.$nextTick();
      expect((wrapper.vm as any).isVisible).toBe(true);

      // Then make it invisible
      intersectionObserverCallback([{
        isIntersecting: false,
        target:         document.createElement('div')
      }]);

      await wrapper.vm.$nextTick();

      expect((wrapper.vm as any).isVisible).toBe(false);
    });
  });

  describe('Visibility Transitions', () => {
    it('should handle transition from invisible to visible', async() => {
      const actions = [createMockMessageAction()];

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      await flushPromises();

      // Initially invisible
      expect((wrapper.vm as any).isVisible).toBe(false);

      // Becomes visible
      intersectionObserverCallback([{
        isIntersecting: true,
        target:         document.createElement('div')
      }]);

      await wrapper.vm.$nextTick();

      expect((wrapper.vm as any).isVisible).toBe(true);
    });

    it('should handle multiple visibility transitions', async() => {
      const actions = [createMockMessageAction()];

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      await flushPromises();

      const visibilityStates: boolean[] = [];

      // Transition 1: visible
      intersectionObserverCallback([{
        isIntersecting: true,
        target:         document.createElement('div')
      }]);
      await wrapper.vm.$nextTick();
      visibilityStates.push((wrapper.vm as any).isVisible);

      // Transition 2: invisible
      intersectionObserverCallback([{
        isIntersecting: false,
        target:         document.createElement('div')
      }]);
      await wrapper.vm.$nextTick();
      visibilityStates.push((wrapper.vm as any).isVisible);

      // Transition 3: visible again
      intersectionObserverCallback([{
        isIntersecting: true,
        target:         document.createElement('div')
      }]);
      await wrapper.vm.$nextTick();
      visibilityStates.push((wrapper.vm as any).isVisible);

      expect(visibilityStates).toEqual([true, false, true]);
    });
  });

  describe('Observer Lifecycle', () => {
    it('should disconnect observer on unmount', () => {
      const actions = [createMockMessageAction()];

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      wrapper.unmount();

      expect(mockObserver.disconnect).toHaveBeenCalled();
    });

    it('should handle graceful unmount when observer is already null', () => {
      const actions = [createMockMessageAction()];

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      // Manually set observer to null
      (wrapper.vm as any).visibilityObserver = null;

      expect(() => {
        wrapper.unmount();
      }).not.toThrow();
    });
  });

  describe('isVisible Prop Passing', () => {
    it('should have isVisible state managed by IntersectionObserver', async() => {
      const actions = [
        createMockMessageAction({ label: 'Action 1' }),
        createMockMessageAction({ label: 'Action 2' })
      ];

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      await flushPromises();

      // Make buttons visible
      intersectionObserverCallback([{
        isIntersecting: true,
        target:         document.createElement('div')
      }]);

      await wrapper.vm.$nextTick();

      const resourceButtons = wrapper.findAllComponents({ name: 'ResourceButton' });

      expect(resourceButtons.length).toBe(2);

      // Verify that isVisible ref is updated
      expect((wrapper.vm as any).isVisible).toBe(true);
    });

    it('should track isVisible state through visibility transitions', async() => {
      const actions = [createMockMessageAction()];

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      await flushPromises();

      // Initially invisible
      expect((wrapper.vm as any).isVisible).toBe(false);

      // Becomes visible
      intersectionObserverCallback([{
        isIntersecting: true,
        target:         document.createElement('div')
      }]);

      await wrapper.vm.$nextTick();

      expect((wrapper.vm as any).isVisible).toBe(true);

      // Becomes invisible again
      intersectionObserverCallback([{
        isIntersecting: false,
        target:         document.createElement('div')
      }]);

      await wrapper.vm.$nextTick();

      expect((wrapper.vm as any).isVisible).toBe(false);
    });
  });

  describe('Action Truncation', () => {
    it('should truncate actions at THRESHOLD', () => {
      const actions = Array.from({ length: 25 }, (_, i) => createMockMessageAction({ label: `Action ${ i + 1 }` })
      );

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      const computedActions = (wrapper.vm as any).actions;

      expect(computedActions.length).toBe(7); // THRESHOLD = 7
    });

    it('should not truncate when actions are below THRESHOLD', () => {
      const actions = Array.from({ length: 5 }, (_, i) => createMockMessageAction({ label: `Action ${ i + 1 }` })
      );

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      const computedActions = (wrapper.vm as any).actions;

      expect(computedActions.length).toBe(5);
    });

    it('should return remaining actions when actions exceed THRESHOLD', () => {
      const actions = Array.from({ length: 10 }, (_, i) => createMockMessageAction({ label: `Action ${ i + 1 }` })
      );

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      const remaining = (wrapper.vm as any).remaining;

      expect(remaining.length).toBe(3); // 10 - 7
    });

    it('should return empty remaining array when actions do not exceed THRESHOLD', () => {
      const actions = Array.from({ length: 5 }, (_, i) => createMockMessageAction({ label: `Action ${ i + 1 }` })
      );

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      const remaining = (wrapper.vm as any).remaining;

      expect(remaining.length).toBe(0); // 5 - 7, but should not be negative
    });
  });

  describe('Show Remaining Toggle', () => {
    it('should initialize showRemaining as false', () => {
      wrapper = shallowMount(MessageActions, {
        props: {
          label:   'Test Label',
          actions: []
        },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).showRemaining).toBe(false);
    });

    it('should toggle showRemaining on toggleRemaining call', () => {
      wrapper = shallowMount(MessageActions, {
        props: {
          label:   'Test Label',
          actions: []
        },
        ...requiredSetup()
      });

      const initialState = (wrapper.vm as any).showRemaining;

      (wrapper.vm as any).toggleRemaining();

      expect((wrapper.vm as any).showRemaining).toBe(!initialState);

      (wrapper.vm as any).toggleRemaining();

      expect((wrapper.vm as any).showRemaining).toBe(initialState);
    });
  });

  describe('Resource Button Rendering', () => {
    it('should render ResourceButton for each action', () => {
      const actions = [
        createMockMessageAction({ label: 'Action 1' }),
        createMockMessageAction({ label: 'Action 2' }),
        createMockMessageAction({ label: 'Action 3' })
      ];

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      const resourceButtons = wrapper.findAllComponents({ name: 'ResourceButton' });

      expect(resourceButtons.length).toBe(3);
    });

    it('should render ResourceButton for exact count of actions', () => {
      const actions = [
        createMockMessageAction({ label: 'Action 1' }),
        createMockMessageAction({ label: 'Action 2' })
      ];

      wrapper = shallowMount(MessageActions, {
        props: {
          label: 'Test Label',
          actions
        },
        ...requiredSetup()
      });

      const resourceButtons = wrapper.findAllComponents({ name: 'ResourceButton' });

      // Verify the correct number of buttons are rendered
      expect(resourceButtons.length).toBe(actions.length);
    });

    it('should render empty when no actions provided', () => {
      wrapper = shallowMount(MessageActions, {
        props: {
          label:   'Test Label',
          actions: []
        },
        ...requiredSetup()
      });

      const resourceButtons = wrapper.findAllComponents({ name: 'ResourceButton' });

      expect(resourceButtons.length).toBe(0);
    });
  });
});
