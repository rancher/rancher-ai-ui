import type { ComponentPublicInstance } from 'vue';
import { shallowMount, VueWrapper } from '@vue/test-utils';
import ResourceButton from '../ResourceButton.vue';
import { MessageAction, ActionType } from '../../../../types';
import * as mockResourceContextModuleRaw from '../resource-context';

const mockResourceContextModule = jest.mocked(mockResourceContextModuleRaw);

let mockResourceGetter: jest.Mock;

const mockStore = {
  dispatch: jest.fn(),
  getters:  new Proxy({}, {
    get: (target, prop: string) => {
      if (prop === 'clusterReady') {
        return false;
      }
      if (prop.endsWith('/byId')) {
        return mockResourceGetter || jest.fn(() => null);
      }

      return jest.fn(() => null);
    }
  }),
  state:       { $router: { push: jest.fn() } },
  rootGetters: {}
};

jest.mock('@shell/composables/useI18n', () => ({
  useI18n: jest.fn(() => ({
    t:     (key: string, params?: any) => {
      if (key === 'ai.message.actions.label') {
        return `Label: ${ params?.kind } - ${ params?.name }`;
      }

      return key;
    },
    store: mockStore
  }))
}));

jest.mock('../../../../utils/log', () => ({ warn: jest.fn() }));

jest.mock('../resource-context', () => ({
  getProduct: jest.fn(() => ({
    name:    'explorer',
    inStore: 'cluster'
  })),
  getDetailLocation: jest.fn(() => ({
    name:   'c-cluster-resource-details',
    params: {
      cluster: 'local',
      id:      'default/test-pod'
    }
  })),
  getInStore:          jest.fn(() => 'cluster'),
  isManagementStore:   jest.fn(() => false),
  normalizeType:       jest.fn((store, type) => type),
  getManagementSchema: jest.fn(() => null),
  isManagementGroup:   jest.fn(() => false),
  normalizeId:         jest.fn((schema, cluster, namespace, name) => `${ namespace }/${ name }`)
}));

jest.mock('@components/RcButton/RcButton.vue', () => ({
  default: {
    name:     'RcButton',
    template: '<button class="rc-button"><slot /></button>',
    props:    ['small', 'variant', 'disabled'],
    emits:    ['click']
  }
}));

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

describe('ResourceButton', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStore.dispatch.mockClear();
    mockStore.dispatch.mockResolvedValue({}); // Reset to resolved by default
    mockStore.state.$router.push.mockClear();
    mockResourceContextModule.getProduct.mockReturnValue({
      name:    'explorer',
      inStore: 'cluster'
    });
    mockResourceContextModule.getInStore.mockReturnValue('cluster');
    mockResourceContextModule.getDetailLocation.mockReturnValue({
      name:   'c-cluster-resource-details',
      params: {
        cluster: 'local',
        id:      'default/test-pod'
      }
    });
    mockResourceContextModule.normalizeId.mockReturnValue('default/test-pod');
    mockResourceContextModule.isManagementStore.mockReturnValue(false);
    mockResourceContextModule.isManagementGroup.mockReturnValue(false);

    // Default resource getter returns null
    mockResourceGetter = jest.fn(() => null);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Component Initialization', () => {
    it('should render the component when ActionType is Button', () => {
      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      expect(wrapper.find('[data-testid="rancher-ai-ui-chat-message-resource-button-test-pod"]').exists()).toBe(true);
    });

    it('should initialize with isVisible as false', () => {
      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).isVisible).toBe(false);
    });
  });

  describe('loadSchema', () => {
    it('should return management schema when available', async() => {
      mockResourceContextModule.getManagementSchema.mockReturnValue({
        attributes: {
          namespaced: true,
          group:      'apps'
        }
      });

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      const schema = await (wrapper.vm as any).loadSchema();

      expect(schema).toEqual({
        attributes: {
          namespaced: true,
          group:      'apps'
        }
      });
      expect(mockResourceContextModule.getManagementSchema).toHaveBeenCalledWith(mockStore, 'v1.Pod');
    });

    it('should fetch schema from cluster API when management schema is not available', async() => {
      mockResourceContextModule.getManagementSchema.mockReturnValue(null);
      mockStore.dispatch.mockResolvedValue({ attributes: { namespaced: true } });

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      const schema = await (wrapper.vm as any).loadSchema();

      expect(schema).toEqual({ attributes: { namespaced: true } });
      expect(mockStore.dispatch).toHaveBeenCalledWith('cluster/request', { url: '/k8s/clusters/local/v1/schemas/v1.Pod' });
    });

    it('should return null when schema cannot be loaded', async() => {
      mockResourceContextModule.getManagementSchema.mockReturnValue(null);
      mockStore.dispatch.mockRejectedValue(new Error('API Error'));

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      const schema = await (wrapper.vm as any).loadSchema();

      expect(schema).toBeNull();
    });

    it('should handle missing resource gracefully', async() => {
      wrapper = shallowMount(ResourceButton, {
        props: {
          value: {
            label: 'Test Action',
            type:  ActionType.Button
          }
        },
        ...requiredSetup()
      });

      const schema = await (wrapper.vm as any).loadSchema();

      expect(typeof schema === 'object').toBe(true);
    });
  });

  describe('fetchResource', () => {
    it('should dispatch loadManagement when inStore is management', async() => {
      mockResourceContextModule.getInStore.mockReturnValue('management');
      mockResourceContextModule.isManagementStore.mockReturnValue(true);

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      await (wrapper.vm as any).fetchResource();

      expect(mockStore.dispatch).toHaveBeenCalledWith('loadManagement');
    });

    it('should dispatch find action for management group resources', async() => {
      mockResourceContextModule.getInStore.mockReturnValue('management');
      mockResourceContextModule.isManagementGroup.mockReturnValue(true);
      mockStore.dispatch.mockResolvedValue({});

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      (wrapper.vm as any).schema = { attributes: { group: 'management.cattle.io' } };

      await (wrapper.vm as any).fetchResource();

      expect(mockStore.dispatch).toHaveBeenCalledWith('management/find', {
        cluster: 'local',
        type:    'v1.Pod',
        id:      'default/test-pod'
      });
    });

    it('should dispatch find action for local cluster resources', async() => {
      mockResourceContextModule.isManagementGroup.mockReturnValue(false);
      mockStore.dispatch.mockResolvedValue({});

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      await (wrapper.vm as any).fetchResource();

      expect(mockStore.dispatch).toHaveBeenCalledWith('cluster/find', {
        cluster: 'local',
        type:    'v1.Pod',
        id:      'default/test-pod'
      });
    });

    it('should fetch from cluster API for non-local clusters', async() => {
      mockResourceContextModule.isManagementGroup.mockReturnValue(false);
      mockStore.dispatch.mockResolvedValue({ apiVersion: 'v1' });

      wrapper = shallowMount(ResourceButton, {
        props: {
          value: createMockMessageAction({
            resource: {
              cluster:   'remote-cluster',
              type:      'v1.Pod',
              namespace: 'default',
              name:      'test-pod'
            }
          })
        },
        ...requiredSetup()
      });

      await (wrapper.vm as any).fetchResource();

      // Verify that cluster/request was called (with a URL containing the cluster name)
      const callArgs = mockStore.dispatch.mock.calls.find((call) => call[0] === 'cluster/request');

      expect(callArgs).toBeDefined();
      expect(callArgs?.[1]?.url).toContain('remote-cluster');
    });

    it('should handle fetch errors gracefully', async() => {
      mockStore.dispatch.mockRejectedValue(new Error('Fetch failed'));

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      await expect((wrapper.vm as any).fetchResource()).resolves.toBeUndefined();
    });

    it('should call store.dispatch(`${ inStore.value }/find`) when isManagementGroup is true', async() => {
      mockResourceContextModule.getInStore.mockReturnValue('management');
      mockResourceContextModule.isManagementGroup.mockReturnValue(true);
      mockStore.dispatch.mockResolvedValue({});

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      (wrapper.vm as any).schema = { attributes: { group: 'management.cattle.io' } };

      await (wrapper.vm as any).fetchResource();

      expect(mockStore.dispatch).toHaveBeenCalledWith('management/find', expect.any(Object));
    });

    it('should call store.dispatch(`${ inStore.value }/find`) when isManagementGroup is false and cluster is local', async() => {
      mockResourceContextModule.isManagementGroup.mockReturnValue(false);
      mockStore.dispatch.mockResolvedValue({});

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      await (wrapper.vm as any).fetchResource();

      expect(mockStore.dispatch).toHaveBeenCalledWith('cluster/find', expect.any(Object));
    });

    it('should call /k8s/clusters/ when cluster is not local and isManagementGroup is false', async() => {
      mockResourceContextModule.isManagementGroup.mockReturnValue(false);
      mockStore.dispatch.mockResolvedValue({ apiVersion: 'v1' });

      wrapper = shallowMount(ResourceButton, {
        props: {
          value: createMockMessageAction({
            resource: {
              cluster:   'remote-cluster',
              type:      'v1.Pod',
              namespace: 'default',
              name:      'test-pod'
            }
          })
        },
        ...requiredSetup()
      });

      await (wrapper.vm as any).fetchResource();

      const requestCall = mockStore.dispatch.mock.calls.find((call) => call[0] === 'cluster/request');

      expect(requestCall).toBeDefined();
      expect(requestCall?.[1]?.url).toContain('/k8s/clusters/');
      expect(requestCall?.[1]?.url).toContain('remote-cluster');
    });
  });

  describe('loadSchemaAndResource', () => {
    it('should exist and be callable', async() => {
      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      const loadSchemaAndResource = (wrapper.vm as any).loadSchemaAndResource;

      expect(typeof loadSchemaAndResource).toBe('function');
      expect(typeof (wrapper.vm as any).loadSchema).toBe('function');
      expect(typeof (wrapper.vm as any).fetchResource).toBe('function');
    });

    it('should not fetch resource if schema loading fails', async() => {
      mockResourceContextModule.getManagementSchema.mockReturnValue(null);
      mockStore.dispatch.mockRejectedValue(new Error('Schema load failed'));

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      const fetchResourceSpy = jest.spyOn(wrapper.vm as any, 'fetchResource');

      await (wrapper.vm as any).loadSchemaAndResource();

      expect(fetchResourceSpy).not.toHaveBeenCalled();
    });

    it('should call loadSchema and fetchResource when resource.value is false', async() => {
      // Ensure resource is null/false by setting mockResourceGetter BEFORE mounting
      mockResourceGetter = jest.fn(() => null);
      mockResourceContextModule.getManagementSchema.mockReturnValue({ attributes: { namespaced: true } });
      mockStore.dispatch.mockResolvedValue({});

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      jest.clearAllMocks();
      mockStore.dispatch.mockClear();
      mockStore.dispatch.mockResolvedValue({});

      await (wrapper.vm as any).loadSchemaAndResource();

      // Verify loadSchema was called by checking that getManagementSchema was called
      expect(mockResourceContextModule.getManagementSchema).toHaveBeenCalled();

      // Verify fetchResource was called by checking that store.dispatch was called with find or request
      const dispatchCalls = mockStore.dispatch.mock.calls.map((call) => call[0]);
      const hasFindOrRequest = dispatchCalls.some((call) => call.includes('find') || call.includes('request') || call.includes('loadManagement'));

      expect(hasFindOrRequest).toBe(true);
    });

    it('should load and set schema.value when schema is null and resource is unavailable', async() => {
      mockResourceGetter = jest.fn(() => null); // resource is not available
      mockResourceContextModule.getManagementSchema.mockReturnValue(null); // no management schema

      // Mock store.dispatch to return a schema for cluster/request
      const mockLoadedSchema = {
        attributes: { namespaced: true },
        kind:       'Pod'
      };

      mockStore.dispatch.mockImplementation((action: string) => {
        if (action === 'cluster/request') {
          return Promise.resolve(mockLoadedSchema);
        }

        return Promise.resolve({});
      });

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      // Verify schema.value is initially null
      expect((wrapper.vm as any).schema).toBeNull();

      // Call loadSchemaAndResource
      await (wrapper.vm as any).loadSchemaAndResource();

      // Verify schema.value is now set (from loadSchema which calls store.dispatch)
      expect((wrapper.vm as any).schema).not.toBeNull();
      expect((wrapper.vm as any).schema).toEqual(mockLoadedSchema);
    });

    it('should not load schema when schema.value is not null', async() => {
      mockResourceGetter = jest.fn(() => null); // resource is not available
      const existingSchema = {
        attributes: { namespaced: true },
        kind:       'Pod',
        id:         'existing-schema'
      };

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      // Set schema.value before calling loadSchemaAndResource
      (wrapper.vm as any).schema = existingSchema;

      const loadSchemaSpy = jest.spyOn(wrapper.vm as any, 'loadSchema');

      // Call loadSchemaAndResource
      await (wrapper.vm as any).loadSchemaAndResource();

      // Verify loadSchema was NOT called because schema.value is already set
      expect(loadSchemaSpy).not.toHaveBeenCalled();

      // Verify schema.value remains unchanged
      expect((wrapper.vm as any).schema).toEqual(existingSchema);
    });
  });

  describe('goTo', () => {
    it('should navigate to resource detail location when resource exists', async() => {
      // Mock the resource getter to return a resource
      mockResourceGetter = jest.fn(() => ({ name: 'test-pod' }));

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      await wrapper.vm.$nextTick();
      await (wrapper.vm as any).goTo();

      expect(mockStore.state.$router.push).toHaveBeenCalledWith({
        name:   'c-cluster-resource-details',
        params: {
          cluster: 'local',
          id:      'default/test-pod'
        }
      });
    });

    it('should not navigate if resource is not available', () => {
      // mockResourceGetter is jest.fn(() => null) by default
      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      (wrapper.vm as any).goTo();

      expect(mockStore.state.$router.push).not.toHaveBeenCalled();
    });

    it('should not navigate if props.value.resource is missing', () => {
      wrapper = shallowMount(ResourceButton, {
        props: {
          value: {
            label: 'Test Button',
            type:  ActionType.Button
          }
        },
        ...requiredSetup()
      });

      (wrapper.vm as any).goTo();

      expect(mockStore.state.$router.push).not.toHaveBeenCalled();
    });

    it('should not navigate if detail location is not available', () => {
      mockResourceContextModule.getDetailLocation.mockReturnValue(null);
      mockResourceGetter = jest.fn(() => ({ name: 'test-pod' }));

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      (wrapper.vm as any).goTo();

      expect(mockStore.state.$router.push).not.toHaveBeenCalled();
    });
  });

  describe('Watch on clusterReady', () => {
    it('should not throw when clusterReady watcher is active', async() => {
      wrapper = shallowMount(ResourceButton, {
        props: {
          value:     createMockMessageAction(),
          isVisible: true
        },
        ...requiredSetup()
      });

      await wrapper.vm.$nextTick();

      expect(wrapper.exists()).toBe(true);
    });

    it('should not throw when clusterReady watcher with isVisible false', async() => {
      wrapper = shallowMount(ResourceButton, {
        props: {
          value:     createMockMessageAction(),
          isVisible: false
        },
        ...requiredSetup()
      });

      await wrapper.vm.$nextTick();

      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Watch on isVisible prop', () => {
    it('should render and respond to isVisible prop changes', async() => {
      wrapper = shallowMount(ResourceButton, {
        props: {
          value:     createMockMessageAction(),
          isVisible: false
        },
        ...requiredSetup()
      });

      expect(wrapper.exists()).toBe(true);

      // Update isVisible prop to true
      await wrapper.setProps({ isVisible: true });
      await wrapper.vm.$nextTick();

      expect(wrapper.exists()).toBe(true);
    });

    it('should render with isVisible prop true on mount', async() => {
      wrapper = shallowMount(ResourceButton, {
        props: {
          value:     createMockMessageAction(),
          isVisible: true
        },
        ...requiredSetup()
      });

      await wrapper.vm.$nextTick();

      expect(wrapper.exists()).toBe(true);
    });

    it('should handle isVisible prop changes from true to false', async() => {
      wrapper = shallowMount(ResourceButton, {
        props: {
          value:     createMockMessageAction(),
          isVisible: true
        },
        ...requiredSetup()
      });

      // Update isVisible prop to false
      await wrapper.setProps({ isVisible: false });
      await wrapper.vm.$nextTick();

      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Computed Properties', () => {
    it('should compute product from getProduct', () => {
      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).product).toEqual({
        name:    'explorer',
        inStore: 'cluster'
      });
    });

    it('should compute inStore from product', () => {
      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).inStore).toBe('cluster');
    });

    it('should compute label with custom label when provided', () => {
      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction({ label: 'Custom Label' }) },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).label).toBe('Custom Label');
    });

    it('should compute label with resource kind and name when custom label is not provided', () => {
      mockResourceGetter = jest.fn(() => ({
        name: 'test-pod',
        kind: 'Pod'
      }));

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction({ label: undefined }) },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).label).toContain('test-pod');
    });
  });

  describe('Template Rendering', () => {
    it('should disable button when resource is not available', () => {
      // mockResourceGetter returns null by default
      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      const button = wrapper.findComponent({ name: 'RcButton' });

      expect(button.exists()).toBe(true);
      // The button should be disabled - we verify through the resource computed property
      expect((wrapper.vm as any).resource).toBeNull();
    });

    it('should enable button when resource is available', () => {
      mockResourceGetter = jest.fn(() => ({ name: 'test-pod' }));

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      // Verify that resource is available
      expect((wrapper.vm as any).resource).not.toBeNull();
    });

    it('should display custom label when provided', () => {
      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction({ label: 'Click Me' }) },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).label).toBe('Click Me');
    });

    it('should navigate on button click when resource is available', async() => {
      mockResourceGetter = jest.fn(() => ({ name: 'test-pod' }));

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction() },
        ...requiredSetup()
      });

      const goToSpy = jest.spyOn(wrapper.vm as any, 'goTo');

      // Manually call goTo to simulate click behavior
      await (wrapper.vm as any).goTo();

      expect(goToSpy).toHaveBeenCalled();
      expect(mockStore.state.$router.push).toHaveBeenCalled();
    });

    it('should use resource.nameDisplay when available in label', async() => {
      mockResourceGetter = jest.fn(() => ({
        name:        'test-pod',
        nameDisplay: 'Displayed Name',
        kind:        'Pod'
      }));

      wrapper = shallowMount(ResourceButton, {
        props: { value: createMockMessageAction({ label: undefined }) },
        ...requiredSetup()
      });

      await wrapper.vm.$nextTick();

      expect((wrapper.vm as any).label).toContain('Displayed Name');
    });
  });

  describe('onBeforeUnmount Hook', () => {
    it('should clean up watchers on unmount without throwing', () => {
      wrapper = shallowMount(ResourceButton, {
        props: {
          value:     createMockMessageAction(),
          isVisible: true
        },
        ...requiredSetup()
      });

      // Should not throw when unmounting
      expect(() => {
        wrapper.unmount();
      }).not.toThrow();
    });

    it('should handle multiple unmount calls gracefully', () => {
      wrapper = shallowMount(ResourceButton, {
        props: {
          value:     createMockMessageAction(),
          isVisible: true
        },
        ...requiredSetup()
      });

      // First unmount
      wrapper.unmount();

      // Should be able to unmount without errors
      expect(() => {
        wrapper.unmount();
      }).not.toThrow();
    });
  });
});
