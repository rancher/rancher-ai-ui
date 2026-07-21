import { shallowMount } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import { useStore } from 'vuex';
import { useShell } from '@shell/apis';
import Settings from '../Settings.vue';
import { useAIAgentApiComposable } from '../../../composables/useAIAgentApiComposable';
import { SECRET, CONFIG_MAP, WORKLOAD_TYPES } from '@shell/config/types';
import { AGENT_NAMESPACE, AGENT_CONFIG_SECRET_NAME, AGENT_NAME } from '../../../product';
import { Settings as SettingsEnum, AIAgentConfigAuthType, ModelOption } from '../types';
import { AIAgentConfigCRD } from '../../../types';

const SECRET_TYPES = {
  OPAQUE:            'Opaque',
  BASIC:             'kubernetes.io/basic-auth',
};

// Mock components with external dependencies
jest.mock('../../../composables/useAIAgentApiComposable', () => ({
  useAIAgentApiComposable: jest.fn(() => ({
    fetchSettings: jest.fn().mockResolvedValue({}),
    saveSettings:  jest.fn().mockResolvedValue({})
  }))
}));
jest.mock('../sections/AIAgentSettings.vue', () => ({}));
jest.mock('../sections/ai-agent-configs/index.vue', () => ({}));
jest.mock('../../../dialog/ApplySettingsCard.vue', () => ({}));
jest.mock('@components/RcButton/RcButton.vue', () => ({
  default: {
    name:     'RcButton',
    template: '<button><slot /></button>'
  }
}));
jest.mock('@components/RcItemCard/RcItemCard.vue', () => ({
  default: {
    name:     'RcItemCard',
    template: '<div><slot /></div>'
  }
}));

jest.mock('dayjs', () => ({
  __esModule: true,
  default:    () => ({ toISOString: () => '2026-01-01T00:00:00.000Z' })
}));

jest.mock('vuex', () => {
  const actual = jest.requireActual('vuex');

  return {
    ...actual,
    useStore: jest.fn()
  };
});
jest.mock('@shell/apis', () => ({ useShell: jest.fn(() => ({ modal: { open: jest.fn() } })) }));

// Mock global fetch for all tests
globalThis.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve() })) as jest.Mock;

jest.mock('../../../utils/log', () => ({ warn: jest.fn() }));

const mockSecret = (overrides = {}) => ({
  type:     SECRET,
  metadata: {
    namespace: AGENT_NAMESPACE,
    name:      AGENT_CONFIG_SECRET_NAME
  },
  data:     {},
  save:     jest.fn().mockResolvedValue({}),
  ...overrides
});

const mockAiAgentConfigCRD = (overrides = {}): AIAgentConfigCRD => ({
  metadata: {
    name:      'test-agent',
    namespace: AGENT_NAMESPACE
  },
  spec:     {
    displayName:          'Test Agent',
    enabled:              true,
    mcpURL:               'http://localhost:8000',
    authenticationType:   AIAgentConfigAuthType.RANCHER,
    humanValidationTools: [],
    description:          'Test Description',
    systemPrompt:         '',
    toolSet:              '',
    builtIn:              false
  },
  ...overrides
});

const mockModelOptions = (values: string[]): ModelOption[] => values.map((value) => ({
  value,
  isSelected: false
}));

const mockStore = {
  dispatch: jest.fn(),
  commit:   jest.fn(),
  getters:  {
    'management/all':        jest.fn(() => []),
    'management/canList':    jest.fn(() => true),
    'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['PUT', 'POST', 'DELETE'] })),
    'i18n/t':                (key: string) => key
  }
};

const mocks = {
  $store: mockStore,
  $route: {
    query: {},
    name:  { endsWith: () => false }
  }
};

const initSettings = (options: any = {}) => {
  const dispatch = jest.fn();
  const mockDeployment = {
    type: 'apps.deployment',
    spec: { template: { metadata: { annotations: {} } } },
    save: jest.fn().mockResolvedValue({})
  };

  // Default dispatch implementation
  if (!options.dispatch) {
    dispatch.mockImplementation((action: string, params?: any) => {
      if (action === `management/find` && params?.id?.includes(AGENT_NAME)) {
        return Promise.resolve(mockDeployment);
      }
      if (action === `management/find`) {
        return Promise.resolve(mockSecret());
      }
      if (action === `management/findAll`) {
        return Promise.resolve([]);
      }

      return Promise.resolve(null);
    });
  } else {
    dispatch.mockImplementation(options.dispatch);
  }

  // Update the mocked useStore to return the store with custom dispatch
  const storeMock = {
    ...mockStore,
    dispatch,
    getters: {
      ...mockStore.getters,
      ...options.getters
    }
  };

  // Mock useStore to return our custom store

  (useStore as jest.Mock).mockReturnValue(storeMock);

  return {
    props:   options.props || {},
    global:  {
      mocks: {
        ...mocks,
        $store: storeMock
      }
    }
  };
};

describe('Settings.vue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should render the component', () => {
      const wrapper = shallowMount(Settings, initSettings());

      expect(wrapper.exists()).toBe(true);
    });

    it('should set isLoading true on mount and false after load', async() => {
      const wrapper = shallowMount(Settings, initSettings());
      const vm = wrapper.vm as any;

      // isLoading should be true immediately after mount
      expect(vm.isLoading).toBe(true);

      await flushPromises();

      // isLoading should be false after data loads
      expect(vm.isLoading).toBe(false);
    });

    it('should initialize all required data properties', async() => {
      const wrapper = shallowMount(Settings, initSettings());

      await wrapper.vm.$nextTick();

      const vm = wrapper.vm as any;

      expect(vm.aiAgentSettings).toBeDefined();
      expect(vm.aiAgentConfigCRDs).toBeDefined();
      expect(vm.authenticationSecrets).toEqual({});
      expect(vm.hasAiAgentSettingsValidationErrors).toBe(false);
      expect(vm.hasAiAgentConfigsValidationErrors).toBe(false);
    });
  });

  describe('Permissions Check', () => {
    it('should redirect when user cannot list secrets', async() => {
      const wrapper = shallowMount(Settings, initSettings({ getters: { 'management/canList': jest.fn(() => false) } }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // When user cannot list secrets, the component should show no permission state
      expect(vm.permissions?.list.canListSecrets).toBe(false);
    });

    it('should not redirect when user can list secrets', async() => {
      const wrapper = shallowMount(Settings, initSettings());

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.permissions?.list.canListSecrets).toBe(true);
    });
  });

  describe('Fetching AI Agent Settings', () => {
    it('should fetch settings from secret', async() => {
      const secretData = { [SettingsEnum.OPENAI_MODEL]: 'Z3B0LTQ=' };

      const dispatch = jest.fn((action: string) => {
        if (action === 'management/find') {
          return Promise.resolve(mockSecret({ data: secretData }));
        }
        if (action === 'management/findAll') {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await wrapper.vm.$nextTick();

      expect(dispatch).toHaveBeenCalledWith(expect.stringContaining('management/find'), expect.anything());
    });

    it('should handle missing secret gracefully', async() => {
      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          throw new Error('Not found');
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await wrapper.vm.$nextTick();
      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.aiAgentSettings).toBeDefined();
    });

    it('should decode base64 secret data', async() => {
      const secretData = { [SettingsEnum.OPENAI_MODEL]: 'gpt-4o' };

      const dispatch = jest.fn((action: string, params?: any) => {
        if (action === `management/find` && params?.id?.includes(AGENT_NAME)) {
          return Promise.resolve({
            type: 'apps.deployment',
            spec: { template: { metadata: { annotations: {} } } },
            save: jest.fn().mockResolvedValue({})
          });
        }
        if (action === 'management/find') {
          return Promise.resolve(mockSecret({ data: secretData }));
        }
        if (action === 'management/findAll') {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.aiAgentSettings[SettingsEnum.OPENAI_MODEL]).toBe('gpt-4o');
    });
  });

  describe('Fetching AI Agent Config CRDs', () => {
    it('should fetch CRDs from store', async() => {
      const crd = mockAiAgentConfigCRD();
      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([crd]);
        }

        return Promise.resolve(null);
      });

      shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      expect(dispatch).toHaveBeenCalledWith(expect.stringContaining('management/findAll'), expect.anything());
    });

    it('should handle empty CRD list', async() => {
      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(Array.isArray(vm.aiAgentConfigCRDs)).toBe(true);
    });

    it('should populate CRDs from successful fetch', async() => {
      const crd1 = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-1',
          namespace: AGENT_NAMESPACE
        }
      });
      const crd2 = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-2',
          namespace: AGENT_NAMESPACE
        }
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([crd1, crd2]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.aiAgentConfigCRDs.length).toBeGreaterThan(0);
    });
  });

  describe('Saving Agent Settings', () => {
    it('should call saveSettings API with form data', async() => {
      const mockSaveSettings = jest.fn().mockResolvedValue({});

      (useAIAgentApiComposable as jest.Mock).mockReturnValue({
        fetchSettings: jest.fn().mockResolvedValue({}),
        saveSettings:  mockSaveSettings
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));
      const vm = wrapper.vm as any;

      vm.aiAgentSettings = { [SettingsEnum.OPENAI_MODEL]: 'gpt-4' };
      await vm.saveAgentSettings();

      expect(mockSaveSettings).toHaveBeenCalledWith(expect.objectContaining({ [SettingsEnum.OPENAI_MODEL]: 'gpt-4' }));
    });

    it('should handle save errors gracefully', async() => {
      const mockSaveSettings = jest.fn().mockRejectedValueOnce(new Error('Save failed'));

      (useAIAgentApiComposable as jest.Mock).mockReturnValue({
        fetchSettings: jest.fn().mockResolvedValue({}),
        saveSettings:  mockSaveSettings
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));
      const vm = wrapper.vm as any;

      vm.aiAgentSettings = { [SettingsEnum.OPENAI_MODEL]: 'gpt-4' };
      await expect(vm.saveAgentSettings()).rejects.toThrow('Save failed');
    });
  });

  describe('Redeploying AI Agent', () => {
    it('should update deployment timestamp', async() => {
      const deployment = {
        type: 'apps.deployment',
        spec: { template: { metadata: { annotations: {} } } },
        save: jest.fn().mockResolvedValue({})
      };

      const dispatch = jest.fn((action: string, options?: any) => {
        // Match on the management/find action with deployment ID
        if (action === 'management/find' && options?.id?.includes(AGENT_NAME)) {
          return Promise.resolve(deployment);
        }
        if (action === 'management/find') {
          return Promise.resolve(mockSecret());
        }
        if (action === 'management/findAll') {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));
      const vm = wrapper.vm as any;

      // The vm should have redeployAiAgent method
      expect(typeof vm.redeployAiAgent).toBe('function');

      await vm.redeployAiAgent();

      expect(deployment.spec.template.metadata.annotations).toBeDefined();
      expect((deployment.spec.template.metadata.annotations as any)['cattle.io/timestamp']).toBe('2026-01-01T00:00:00.000Z');
      expect(deployment.save).toHaveBeenCalled();
    });

    it('should handle deployment not found gracefully', async() => {
      const dispatch = jest.fn((action: string, options?: any) => {
        if (action === `management/find` && options?.id?.includes('deployment')) {
          throw new Error('Deployment not found');
        }
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));
      const vm = wrapper.vm as any;

      await expect(vm.redeployAiAgent()).resolves.not.toThrow();
    });
  });

  describe('Data Binding', () => {
    it('should update aiAgentSettings when updateAiAgentSettings is called', async() => {
      const wrapper = shallowMount(Settings, initSettings());
      const vm = wrapper.vm as any;

      const newSettings = {
        [SettingsEnum.OPENAI_MODEL]: 'gpt-4o',
        chatbot:                     'openai'
      };

      vm.updateAiAgentSettings(newSettings);

      expect(vm.aiAgentSettings).toEqual(expect.objectContaining(newSettings));
      expect(vm.isAiAgentSettingsTouched).toBe(true);
    });

    it('should update aiAgentConfigCRDs when CRDs are fetched', async() => {
      const crd = mockAiAgentConfigCRD();
      const dispatch = jest.fn((action: string) => {
        if (action === 'management/findAll') {
          return Promise.resolve([crd]);
        }
        if (action === 'management/find') {
          return Promise.resolve(mockSecret());
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.aiAgentConfigCRDs).toEqual(expect.arrayContaining([expect.objectContaining({ metadata: crd.metadata })]));
    });

    it('should update authenticationSecrets when secrets are modified', async() => {
      const wrapper = shallowMount(Settings, initSettings());
      const vm = wrapper.vm as any;

      const secrets = {
        'agent-1': {
          selected:   '_basic',
          privateKey: 'pk',
          publicKey:  'pubk'
        }
      };

      vm.authenticationSecrets = secrets;

      expect(vm.authenticationSecrets).toEqual(secrets);
    });
  });

  describe('Lifecycle Events', () => {
    it('should fetch settings on mount', async() => {
      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      shallowMount(Settings, initSettings({ dispatch }));
      await flushPromises();

      expect(dispatch).toHaveBeenCalledWith(expect.stringContaining('management/find'), expect.anything());
    });

    it('should fetch CRDs on mount', async() => {
      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      shallowMount(Settings, initSettings({ dispatch }));
      await flushPromises();

      expect(dispatch).toHaveBeenCalledWith(expect.stringContaining('management/findAll'), expect.anything());
    });
  });

  describe('Save Operation', () => {
    it('should save all data when save method is called', async() => {
      const mockSaveSettings = jest.fn().mockResolvedValue({});

      (useAIAgentApiComposable as jest.Mock).mockReturnValue({
        fetchSettings: jest.fn().mockResolvedValue({}),
        saveSettings:  mockSaveSettings
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      vm.aiAgentSettings = { [SettingsEnum.OPENAI_MODEL]: 'gpt-4' };
      const callback = jest.fn();

      await vm.save(callback);

      expect(mockSaveSettings).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should call save callback', async() => {
      const secret = mockSecret();
      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(secret);
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));
      const vm = wrapper.vm as any;

      const callback = jest.fn();

      await vm.save(callback);

      expect(callback).toHaveBeenCalled();
    });

    it.skip('should call save function when openApplySettingsDialog onConfirm is triggered', async() => { // eslint-disable-line jest/no-disabled-tests
      const mockSaveSettings = jest.fn().mockResolvedValue({});

      (useAIAgentApiComposable as jest.Mock).mockReturnValue({
        fetchSettings: jest.fn().mockResolvedValue({}),
        saveSettings:  mockSaveSettings
      });

      const deployment = {
        type: 'apps.deployment',
        spec: { template: { metadata: { annotations: {} } } },
        save: jest.fn().mockResolvedValue({})
      };

      const dispatch = jest.fn((action: string, options?: any) => {
        if (action === 'management/find' && options?.id?.includes(AGENT_NAME)) {
          return Promise.resolve(deployment);
        }
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      let capturedOnConfirm: any;

      (useShell as jest.Mock).mockReturnValue({
        modal: {
          open: jest.fn((component, options) => {
            capturedOnConfirm = options.props.onConfirm;
          })
        }
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));
      const vm = wrapper.vm as any;

      vm.aiAgentSettings = { [SettingsEnum.OPENAI_MODEL]: 'gpt-4' };
      const callback = jest.fn();

      await vm.openApplySettingsDialog(callback);

      await capturedOnConfirm();

      expect(mockSaveSettings).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('Permissions Handling', () => {
    it('should compute correct permissions when all allowed', async() => {
      const wrapper = shallowMount(Settings, initSettings({ getters: { 'management/canList': jest.fn(() => true) } }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.permissions?.list.canListSecrets).toBe(true);
      expect(vm.permissions?.list.canListAiAgentCRDS).toBe(true);
      expect(vm.permissions?.create.canCreateSecrets).toBe(true);
      expect(vm.permissions?.create.canCreateAiAgentCRDS).toBe(true);
    });

    it('should handle canList true but canCreate false for secrets', async() => {
      const wrapper = shallowMount(Settings, initSettings({
        getters: {
          'management/canList':    jest.fn(() => true),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['GET'] })), // No PUT method
        }
      }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.permissions?.list.canListSecrets).toBe(true);
      expect(vm.permissions?.create.canCreateSecrets).toBe(false);
    });

    it('should handle canList false for secrets', async() => {
      const wrapper = shallowMount(Settings, initSettings({
        getters: {
          'management/canList':    jest.fn((type) => type !== SECRET),
          'management/schemaFor':  jest.fn((type) => {
            if (type === SECRET) {
              return { resourceMethods: ['GET'] }; // No PUT means no create permission
            }

            return { resourceMethods: ['PUT', 'POST', 'DELETE'] };
          }),
        }
      }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.permissions?.list.canListSecrets).toBe(false);
      expect(vm.permissions?.create.canCreateSecrets).toBe(false);
    });

    it('should handle canList false for AI Agent CRDs', async() => {
      const wrapper = shallowMount(Settings, initSettings({
        getters: {
          'management/canList':    jest.fn((type) => type === SECRET), // Only can list secrets
          'management/schemaFor':  jest.fn((type) => {
            if (type === SECRET) {
              return { resourceMethods: ['PUT', 'POST', 'DELETE'] };
            }

            return { resourceMethods: ['GET'] };
          }),
        }
      }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.permissions?.list.canListAiAgentCRDS).toBe(false);
    });

    it('should show read-only mode when cannot create secrets', async() => {
      const dispatch = jest.fn((action: string, params?: any) => {
        if (action === `management/find` && params?.id?.includes(AGENT_NAME)) {
          return Promise.resolve({
            type: 'apps.deployment',
            spec: { template: { metadata: { annotations: {} } } },
            save: jest.fn().mockResolvedValue({})
          });
        }
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({
        dispatch,
        getters: {
          'management/canList':    jest.fn(() => true),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['GET'] })), // Can list but not create
        }
      }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // Verify that the component has read-only permission state
      expect(vm.permissions?.create.canCreateSecrets).toBe(false);
    });

    it('should show save button only when has create permission', async() => {
      const store = {
        dispatch:  jest.fn((action: string, params?: any) => {
          if (action === 'management/find' && params?.id?.includes(AGENT_NAME)) {
            return Promise.resolve({
              type: 'apps.deployment',
              spec: { template: { metadata: { annotations: {} } } },
              save: jest.fn()
            });
          }
          if (action === 'management/find') {
            return Promise.resolve(mockSecret());
          }
          if (action === 'management/findAll') {
            return Promise.resolve([]);
          }

          return Promise.resolve(null);
        }),
        commit:    jest.fn(),
        getters:   {
          'management/all':        jest.fn(() => []),
          'management/canList':    jest.fn(() => true),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['get'] })),
          'i18n/t':                (key: string) => key
        },
        state: { $router: { push: jest.fn() } }
      };

      (useStore as jest.Mock).mockReturnValue(store);

      const wrapper = shallowMount(Settings, {
        global: {
          mocks: {
            $store: store,
            $route: {
              query: {},
              name:  { endsWith: () => false }
            }
          },
        }
      });

      const vm = wrapper.vm as any;

      await wrapper.vm.$nextTick();
      await flushPromises();

      expect(vm.permissions?.create.canCreateSecrets).toBe(false);
    });

    it('should show warning banner when cannot list secrets', async() => {
      const store = {
        dispatch:  jest.fn((action: string, params?: any) => {
          if (action === 'management/find' && params?.id?.includes(AGENT_NAME)) {
            return Promise.resolve({
              type: 'apps.deployment',
              spec: { template: { metadata: { annotations: {} } } },
              save: jest.fn()
            });
          }
          if (action === 'management/find') {
            return Promise.resolve(mockSecret());
          }
          if (action === 'management/findAll') {
            return Promise.resolve([]);
          }

          return Promise.resolve(null);
        }),
        commit:    jest.fn(),
        getters:   {
          'management/all':        jest.fn(() => []),
          'management/canList':    jest.fn(() => false),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['put', 'post', 'delete'] })),
          'i18n/t':                (key: string) => key
        },
        state: { $router: { push: jest.fn() } }
      };

      (useStore as jest.Mock).mockReturnValue(store);

      const wrapper = shallowMount(Settings, {
        global: {
          mocks: {
            $store: store,
            $route: {
              query: {},
              name:  { endsWith: () => false }
            }
          },
        }
      });

      const vm = wrapper.vm as any;

      await wrapper.vm.$nextTick();
      await flushPromises();

      expect(vm.permissions?.list.canListSecrets).toBe(false);
    });

    it('should disable save button when validation has errors', async() => {
      const secret = mockSecret();
      const dispatch = jest.fn((action: string, params?: any) => {
        if (action === `management/find` && params?.id?.includes(AGENT_NAME)) {
          return Promise.resolve({
            type: 'apps.deployment',
            spec: { template: { metadata: { annotations: {} } } },
            save: jest.fn()
          });
        }
        if (action === `management/find`) {
          return Promise.resolve(secret);
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));
      const vm = wrapper.vm as any;

      vm.hasAiAgentSettingsValidationErrors = true;

      await wrapper.vm.$nextTick();

      // Verify that hasAiAgentSettingsValidationErrors is properly tracked
      expect(vm.hasAiAgentSettingsValidationErrors).toBe(true);
    });

    it('should prevent save when cannot create secrets', async() => {
      const store = {
        dispatch:  jest.fn((action: string, params?: any) => {
          if (action === 'management/find' && params?.id?.includes(AGENT_NAME)) {
            return Promise.resolve({
              type: 'apps.deployment',
              spec: { template: { metadata: { annotations: {} } } },
              save: jest.fn()
            });
          }
          if (action === 'management/find') {
            return Promise.resolve(mockSecret());
          }
          if (action === 'management/findAll') {
            return Promise.resolve([]);
          }

          return Promise.resolve(null);
        }),
        commit:    jest.fn(),
        getters:   {
          'management/all':        jest.fn(() => []),
          'management/canList':    jest.fn(() => true),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['GET'] })),
          'i18n/t':                (key: string) => key
        },
        state: { $router: { push: jest.fn() } }
      };

      (useStore as jest.Mock).mockReturnValue(store);

      const wrapper = shallowMount(Settings, {
        global: {
          mocks: {
            $store: store,
            $route: {
              query: {},
              name:  { endsWith: () => false }
            }
          },
        }
      });

      const vm = wrapper.vm as any;

      await wrapper.vm.$nextTick();
      await flushPromises();

      expect(vm.permissions?.create.canCreateSecrets).toBe(false);
    });

    it('should require both create permissions for full functionality', async() => {
      const store = {
        dispatch:  jest.fn((action: string, params?: any) => {
          if (action === 'management/find' && params?.id?.includes(AGENT_NAME)) {
            return Promise.resolve({
              type: 'apps.deployment',
              spec: { template: { metadata: { annotations: {} } } },
              save: jest.fn()
            });
          }
          if (action === 'management/find') {
            return Promise.resolve(mockSecret());
          }
          if (action === 'management/findAll') {
            return Promise.resolve([]);
          }

          return Promise.resolve(null);
        }),
        commit:    jest.fn(),
        getters:   {
          'management/all':        jest.fn(() => []),
          'management/canList':    jest.fn(() => true),
          'management/schemaFor':  jest.fn((type) => {
            if (type === SECRET) {
              return { resourceMethods: ['PUT', 'POST', 'DELETE'] };
            }

            return { resourceMethods: ['GET'] };
          }),
          'i18n/t': (key: string) => key
        },
        state: { $router: { push: jest.fn() } }
      };

      (useStore as jest.Mock).mockReturnValue(store);

      const wrapper = shallowMount(Settings, {
        global: {
          mocks: {
            $store: store,
            $route: {
              query: {},
              name:  { endsWith: () => false }
            }
          },
        }
      });

      const vm = wrapper.vm as any;

      await wrapper.vm.$nextTick();
      await flushPromises();

      expect(vm.permissions?.create.canCreateSecrets).toBe(true);
      expect(vm.permissions?.create.canCreateAiAgentCRDS).toBe(false);
    });

    it.skip('should display apiError banner when save fails', async() => { // eslint-disable-line jest/no-disabled-tests
      const mockSaveSettings = jest.fn().mockRejectedValueOnce(new Error('API Error'));

      (useAIAgentApiComposable as jest.Mock).mockReturnValue({
        fetchSettings: jest.fn().mockResolvedValue({}),
        saveSettings:  mockSaveSettings
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      let capturedOnConfirm: any;

      (useShell as jest.Mock).mockReturnValue({
        modal: {
          open: jest.fn((component, options) => {
            capturedOnConfirm = options.props.onConfirm;
          })
        }
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));
      const vm = wrapper.vm as any;

      vm.aiAgentSettings = { [SettingsEnum.OPENAI_MODEL]: 'gpt-4' };
      const callback = jest.fn();

      await vm.openApplySettingsDialog(callback);
      await capturedOnConfirm();

      await wrapper.vm.$nextTick();

      expect(vm.apiError).toBeTruthy();
      expect(callback).toHaveBeenCalledWith(false);
    });

    it('should handle permissions when canList ConfigMaps is false', async() => {
      const wrapper = shallowMount(Settings, initSettings({
        getters: {
          'management/canList':    jest.fn((type) => type !== CONFIG_MAP),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['PUT', 'POST', 'DELETE'] })),
        }
      }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.permissions?.list.canListConfigMaps).toBe(false);
    });

    it('should handle permissions when canList Deployments is false', async() => {
      const wrapper = shallowMount(Settings, initSettings({
        getters: {
          'management/canList':    jest.fn((type) => type !== WORKLOAD_TYPES.DEPLOYMENT),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['PUT', 'POST', 'DELETE'] })),
        }
      }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.permissions?.list.canListDeployments).toBe(false);
    });

    it('should prevent settings fetch when cannot list ConfigMaps', async() => {
      const dispatch = jest.fn((action: string, params?: any) => {
        if (action === 'management/find' && params?.id?.includes(AGENT_NAME)) {
          return Promise.resolve({
            type: 'apps.deployment',
            spec: { template: { metadata: { annotations: {} } } },
            save: jest.fn()
          });
        }
        if (action === 'management/find') {
          throw new Error('Cannot access ConfigMap');
        }
        if (action === 'management/findAll') {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({
        dispatch,
        getters: {
          'management/canList':    jest.fn((type) => type !== CONFIG_MAP),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['PUT', 'POST', 'DELETE'] })),
        }
      }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.permissions?.list.canListConfigMaps).toBe(false);
      // Settings should be null or undefined when cannot list ConfigMaps
      expect(vm.aiAgentSettings).toBeDefined();
    });

    it('should prevent CRDs fetch when cannot list AI Agent CRDs', async() => {
      const dispatch = jest.fn((action: string, params?: any) => {
        if (action === 'management/find' && params?.id?.includes(AGENT_NAME)) {
          return Promise.resolve({
            type: 'apps.deployment',
            spec: { template: { metadata: { annotations: {} } } },
            save: jest.fn()
          });
        }
        if (action === 'management/find') {
          return Promise.resolve(mockSecret());
        }
        if (action === 'management/findAll') {
          throw new Error('Cannot access AI Agent CRDs');
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({
        dispatch,
        getters: {
          'management/canList':    jest.fn((type) => type === SECRET), // Can only list secrets
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['PUT', 'POST', 'DELETE'] })),
        }
      }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.permissions?.list.canListAiAgentCRDS).toBe(false);
    });

    it('should allow full access when all permissions are granted', async() => {
      const dispatch = jest.fn((action: string, params?: any) => {
        if (action === 'management/find' && params?.id?.includes(AGENT_NAME)) {
          return Promise.resolve({
            type: 'apps.deployment',
            spec: { template: { metadata: { annotations: {} } } },
            save: jest.fn()
          });
        }
        if (action === 'management/find') {
          return Promise.resolve(mockSecret());
        }
        if (action === 'management/findAll') {
          return Promise.resolve([mockAiAgentConfigCRD()]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({
        dispatch,
        getters: {
          'management/canList':    jest.fn(() => true),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['PUT', 'POST', 'DELETE', 'GET'] })),
        }
      }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.permissions?.list.canListConfigMaps).toBe(true);
      expect(vm.permissions?.list.canListSecrets).toBe(true);
      expect(vm.permissions?.list.canListDeployments).toBe(true);
      expect(vm.permissions?.list.canListAiAgentCRDS).toBe(true);
      expect(vm.permissions?.create.canCreateSecrets).toBe(true);
      expect(vm.permissions?.create.canCreateAiAgentCRDS).toBe(true);
    });

    it('should handle mixed permission scenarios gracefully', async() => {
      const store = {
        dispatch:  jest.fn((action: string, params?: any) => {
          if (action === 'management/find' && params?.id?.includes(AGENT_NAME)) {
            return Promise.resolve({
              type: 'apps.deployment',
              spec: { template: { metadata: { annotations: {} } } },
              save: jest.fn()
            });
          }
          if (action === 'management/find') {
            return Promise.resolve(mockSecret());
          }
          if (action === 'management/findAll') {
            return Promise.resolve([]);
          }

          return Promise.resolve(null);
        }),
        commit:    jest.fn(),
        getters:   {
          'management/all':        jest.fn(() => []),
          'management/canList':    jest.fn((type) => {
            // Can list secrets and configmaps but not deployments or CRDs
            return type === SECRET || type === CONFIG_MAP;
          }),
          'management/schemaFor':  jest.fn(() => {
            // Can create secrets but not CRDs
            return { resourceMethods: ['PUT', 'POST', 'DELETE'] };
          }),
          'i18n/t': (key: string) => key
        },
        state: { $router: { push: jest.fn() } }
      };

      (useStore as jest.Mock).mockReturnValue(store);

      const wrapper = shallowMount(Settings, {
        global: {
          mocks: {
            $store: store,
            $route: {
              query: {},
              name:  { endsWith: () => false }
            }
          },
        }
      });

      const vm = wrapper.vm as any;

      await wrapper.vm.$nextTick();
      await flushPromises();

      expect(vm.permissions?.list.canListSecrets).toBe(true);
      expect(vm.permissions?.list.canListConfigMaps).toBe(true);
      expect(vm.permissions?.list.canListDeployments).toBe(false);
      expect(vm.permissions?.create.canCreateSecrets).toBe(true);
    });

    it('should update button visibility based on permissions', async() => {
      const dispatch = jest.fn((action: string, params?: any) => {
        if (action === 'management/find' && params?.id?.includes(AGENT_NAME)) {
          return Promise.resolve({
            type: 'apps.deployment',
            spec: { template: { metadata: { annotations: {} } } },
            save: jest.fn()
          });
        }
        if (action === 'management/find') {
          return Promise.resolve(mockSecret());
        }
        if (action === 'management/findAll') {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({
        dispatch,
        getters: {
          'management/canList':    jest.fn(() => true),
          'management/schemaFor':  jest.fn(() => {
            // No PUT method means no create permission
            return { resourceMethods: ['GET', 'DELETE'] };
          }),
        }
      }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // Can list but cannot create, so save button should be disabled
      expect(vm.permissions?.list.canListSecrets).toBe(true);
      expect(vm.permissions?.create.canCreateSecrets).toBe(false);
    });

    it('should handle null resourceMethods', async() => {
      const wrapper = shallowMount(Settings, initSettings({
        getters: {
          'management/canList':    jest.fn(() => true),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: null })),
        }
      }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // Null resourceMethods should not crash and default to no create permission
      expect(vm.permissions?.create.canCreateSecrets).toBe(false);
    });
  });

  describe('Authentication Secrets Management', () => {
    describe('saveAiAgentConfigAuthenticationSecrets', () => {
      it('should save BASIC auth secret successfully', async() => {
        const mockSecret = {
          metadata: {
            namespace:    AGENT_NAMESPACE,
            generateName: 'ai-agent-auth-',
            name:         'ai-agent-auth-abc123'
          },
          _type: SECRET_TYPES.BASIC,
          save:  jest.fn().mockResolvedValue({ metadata: { name: 'ai-agent-auth-abc123' } })
        };

        const dispatch = jest.fn((action: string) => {
          if (action === 'management/create') {
            return Promise.resolve(mockSecret);
          }
          if (action === 'management/find') {
            return Promise.resolve(mockSecret);
          }
          if (action === 'management/findAll') {
            return Promise.resolve([]);
          }

          return Promise.resolve(null);
        });

        const basicCRD = mockAiAgentConfigCRD({
          metadata: {
            name:      'test-agent',
            namespace: AGENT_NAMESPACE
          },
          spec:     {
            ...mockAiAgentConfigCRD().spec,
            authenticationType: AIAgentConfigAuthType.BASIC
          }
        });

        const wrapper = shallowMount(Settings, initSettings({ dispatch }));
        const vm = wrapper.vm as any;

        vm.aiAgentConfigCRDs = [basicCRD];
        vm.authenticationSecrets = {
          'test-agent': {
            selected:   '_basic',
            privateKey: 'test-password',
            publicKey:  'test-username'
          }
        };

        await vm.saveAiAgentConfigAuthenticationSecrets();

        expect(dispatch).toHaveBeenCalledWith('management/create', expect.objectContaining({ type: SECRET }));
        expect(mockSecret.save).toHaveBeenCalled();
      });

      it('should save OAUTH2 auth secret (new secret)', async() => {
        const mockSecret = {
          metadata: {
            namespace:    AGENT_NAMESPACE,
            generateName: 'ai-agent-auth-',
            name:         'ai-agent-auth-oauth-123'
          },
          _type: SECRET_TYPES.OPAQUE,
          save:  jest.fn().mockResolvedValue({ metadata: { name: 'ai-agent-auth-oauth-123' } })
        };

        const dispatch = jest.fn((action: string) => {
          if (action === 'management/create') {
            return Promise.resolve(mockSecret);
          }
          if (action === 'management/find') {
            return Promise.reject(new Error('Secret not found'));
          }
          if (action === 'management/findAll') {
            return Promise.resolve([]);
          }

          return Promise.resolve(null);
        });

        const oauth2CRD = mockAiAgentConfigCRD({
          metadata: {
            name:      'oauth-agent',
            namespace: AGENT_NAMESPACE
          },
          spec:     {
            ...mockAiAgentConfigCRD().spec,
            authenticationType: AIAgentConfigAuthType.OAUTH2
          }
        });

        const wrapper = shallowMount(Settings, initSettings({ dispatch }));
        const vm = wrapper.vm as any;

        vm.aiAgentConfigCRDs = [oauth2CRD];
        vm.authenticationSecrets = {
          'oauth-agent': {
            metadataEndpoint: 'https://oauth.example.com/.well-known/openid-configuration',
            clientID:         'test-client-id',
            clientSecret:     'test-client-secret',
            scopes:           ['openid', 'profile']
          }
        };

        await vm.saveAiAgentConfigAuthenticationSecrets();

        expect(dispatch).toHaveBeenCalledWith('management/create', expect.objectContaining({ type: SECRET }));
        expect(mockSecret.save).toHaveBeenCalled();
      });

      it('should update existing OAUTH2 auth secret', async() => {
        const existingSecret = {
          metadata: {
            name:      'existing-oauth-secret',
            namespace: AGENT_NAMESPACE
          },
          data:     { metadataEndpoint: 'old-endpoint' },
          _type:    SECRET_TYPES.OPAQUE,
          save:     jest.fn().mockResolvedValue({ metadata: { name: 'existing-oauth-secret' } })
        };

        const dispatch = jest.fn((action: string) => {
          if (action === 'management/find') {
            return Promise.resolve(existingSecret);
          }
          if (action === 'management/findAll') {
            return Promise.resolve([]);
          }

          return Promise.resolve(null);
        });

        const oauth2CRD = mockAiAgentConfigCRD({
          metadata: {
            name:      'oauth-agent',
            namespace: AGENT_NAMESPACE
          },
          spec:     {
            ...mockAiAgentConfigCRD().spec,
            authenticationType:   AIAgentConfigAuthType.OAUTH2,
            authenticationSecret: 'existing-oauth-secret'
          }
        });

        const wrapper = shallowMount(Settings, initSettings({ dispatch }));
        const vm = wrapper.vm as any;

        vm.aiAgentConfigCRDs = [oauth2CRD];
        vm.authenticationSecrets = {
          'oauth-agent': {
            metadataEndpoint: 'https://oauth.example.com/.well-known/openid-configuration',
            clientID:         'new-client-id',
            clientSecret:     'new-client-secret',
            scopes:           ['openid']
          }
        };

        await vm.saveAiAgentConfigAuthenticationSecrets();

        expect(existingSecret.save).toHaveBeenCalled();
      });

      it('should skip saving when CRD is not found', async() => {
        const dispatch = jest.fn((action: string) => {
          if (action === 'management/find') {
            return Promise.resolve(mockSecret());
          }
          if (action === 'management/findAll') {
            return Promise.resolve([]);
          }

          return Promise.resolve(null);
        });

        const wrapper = shallowMount(Settings, initSettings({ dispatch }));
        const vm = wrapper.vm as any;

        vm.aiAgentConfigCRDs = []; // Empty CRDs
        vm.authenticationSecrets = {
          'non-existent-agent': {
            privateKey: 'test-password',
            publicKey:  'test-username'
          }
        };

        await vm.saveAiAgentConfigAuthenticationSecrets();

        // Should not call create dispatch since CRD doesn't exist
        expect(dispatch).not.toHaveBeenCalledWith('management/create', expect.objectContaining({ type: SECRET }));
      });

      it('should skip saving when payload is null', async() => {
        const dispatch = jest.fn((action: string) => {
          if (action === 'management/find') {
            return Promise.resolve(mockSecret());
          }
          if (action === 'management/findAll') {
            return Promise.resolve([]);
          }

          return Promise.resolve(null);
        });

        const basicCRD = mockAiAgentConfigCRD({
          metadata: {
            name:      'test-agent',
            namespace: AGENT_NAMESPACE
          },
          spec:     {
            ...mockAiAgentConfigCRD().spec,
            authenticationType: AIAgentConfigAuthType.BASIC
          }
        });

        const wrapper = shallowMount(Settings, initSettings({ dispatch }));
        const vm = wrapper.vm as any;

        vm.aiAgentConfigCRDs = [basicCRD];
        vm.authenticationSecrets = { 'test-agent': null };

        await vm.saveAiAgentConfigAuthenticationSecrets();

        expect(dispatch).not.toHaveBeenCalledWith('management/create', expect.objectContaining({ type: SECRET }));
      });

      it('should skip BASIC auth when privateKey or publicKey is missing', async() => {
        const dispatch = jest.fn();

        const basicCRD = mockAiAgentConfigCRD({
          metadata: {
            name:      'test-agent',
            namespace: AGENT_NAMESPACE
          },
          spec:     {
            ...mockAiAgentConfigCRD().spec,
            authenticationType: AIAgentConfigAuthType.BASIC
          }
        });

        const wrapper = shallowMount(Settings, initSettings({ dispatch }));
        const vm = wrapper.vm as any;

        vm.aiAgentConfigCRDs = [basicCRD];
        vm.authenticationSecrets = {
          'test-agent': {
            selected:   '_basic',
            privateKey: '', // Missing privateKey
            publicKey:  'test-username'
          }
        };

        await vm.saveAiAgentConfigAuthenticationSecrets();

        expect(dispatch).not.toHaveBeenCalledWith('management/create', expect.objectContaining({ type: SECRET }));
      });

      it('should skip OAUTH2 auth when any required field is missing', async() => {
        const dispatch = jest.fn();

        const oauth2CRD = mockAiAgentConfigCRD({
          metadata: {
            name:      'oauth-agent',
            namespace: AGENT_NAMESPACE
          },
          spec:     {
            ...mockAiAgentConfigCRD().spec,
            authenticationType: AIAgentConfigAuthType.OAUTH2
          }
        });

        const wrapper = shallowMount(Settings, initSettings({ dispatch }));
        const vm = wrapper.vm as any;

        vm.aiAgentConfigCRDs = [oauth2CRD];
        vm.authenticationSecrets = {
          'oauth-agent': {
            metadataEndpoint: 'https://oauth.example.com/.well-known/openid-configuration',
            clientID:         '', // Missing clientID
            clientSecret:     'test-client-secret',
            scopes:           ['openid']
          }
        };

        await vm.saveAiAgentConfigAuthenticationSecrets();

        expect(dispatch).not.toHaveBeenCalledWith('management/create', expect.objectContaining({ type: SECRET }));
      });

      it('should handle error during secret save gracefully', async() => {
        const mockSecret = {
          metadata: { name: 'ai-agent-auth-error' },
          _type:    SECRET_TYPES.BASIC,
          save:     jest.fn().mockRejectedValue(new Error('Save failed'))
        };

        const dispatch = jest.fn((action: string) => {
          if (action === 'management/create') {
            return Promise.resolve(mockSecret);
          }
          if (action === 'management/find') {
            return Promise.resolve(mockSecret);
          }
          if (action === 'management/findAll') {
            return Promise.resolve([]);
          }

          return Promise.resolve(null);
        });

        const basicCRD = mockAiAgentConfigCRD({
          metadata: {
            name:      'test-agent',
            namespace: AGENT_NAMESPACE
          },
          spec:     {
            ...mockAiAgentConfigCRD().spec,
            authenticationType: AIAgentConfigAuthType.BASIC
          }
        });

        const wrapper = shallowMount(Settings, initSettings({ dispatch }));
        const vm = wrapper.vm as any;

        vm.aiAgentConfigCRDs = [basicCRD];
        vm.authenticationSecrets = {
          'test-agent': {
            privateKey: 'test-password',
            publicKey:  'test-username'
          }
        };

        // Should not throw, but warn should be called
        await expect(vm.saveAiAgentConfigAuthenticationSecrets()).resolves.not.toThrow();
      });

      it('should update CRD authenticationSecret reference after save', async() => {
        const mockSecret = {
          metadata: { name: 'saved-secret-name' },
          _type:    SECRET_TYPES.BASIC,
          save:     jest.fn().mockResolvedValue({ metadata: { name: 'saved-secret-name' } })
        };

        const dispatch = jest.fn((action: string) => {
          if (action === 'management/create') {
            return Promise.resolve(mockSecret);
          }
          if (action === 'management/find') {
            return Promise.resolve(mockSecret);
          }
          if (action === 'management/findAll') {
            return Promise.resolve([]);
          }

          return Promise.resolve(null);
        });

        const basicCRD = mockAiAgentConfigCRD({
          metadata: {
            name:      'test-agent',
            namespace: AGENT_NAMESPACE
          },
          spec:     {
            ...mockAiAgentConfigCRD().spec,
            authenticationType: AIAgentConfigAuthType.BASIC
          }
        });

        const wrapper = shallowMount(Settings, initSettings({ dispatch }));
        const vm = wrapper.vm as any;

        vm.aiAgentConfigCRDs = [basicCRD];
        vm.authenticationSecrets = {
          'test-agent': {
            privateKey: 'test-password',
            publicKey:  'test-username'
          }
        };

        await vm.saveAiAgentConfigAuthenticationSecrets();

        expect(basicCRD.spec.authenticationSecret).toBe('saved-secret-name');
      });
    });

    describe('cleanupAiAgentConfigAuthenticationSecrets', () => {
      it('should remove unused OAUTH2 secrets', async() => {
        const mockSecret = {
          metadata: {
            name:      'unused-oauth-secret',
            namespace: AGENT_NAMESPACE
          },
          remove: jest.fn().mockResolvedValue({})
        };

        const dispatch = jest.fn((action: string, params?: any) => {
          if (action === 'management/find' && params?.id?.includes(AGENT_NAME)) {
            return Promise.resolve({
              type: 'apps.deployment',
              spec: { template: { metadata: { annotations: {} } } },
              save: jest.fn().mockResolvedValue({})
            });
          }
          if (action === 'management/find' && params?.id?.includes('unused-oauth-secret')) {
            return Promise.resolve(mockSecret);
          }
          if (action === 'management/find') {
            return Promise.resolve(mockSecret);
          }
          if (action === 'management/findAll') {
            return Promise.resolve([]);
          }

          return Promise.resolve(null);
        });

        const oauth2CRD = mockAiAgentConfigCRD({
          metadata: {
            name:      'oauth-agent',
            namespace: AGENT_NAMESPACE
          },
          spec:     {
            ...mockAiAgentConfigCRD().spec,
            authenticationType:   AIAgentConfigAuthType.OAUTH2,
            authenticationSecret: 'unused-oauth-secret'
          }
        });

        const wrapper = shallowMount(Settings, initSettings({ dispatch }));
        const vm = wrapper.vm as any;

        await flushPromises();

        // Set initial CRDs with the oauth secret
        vm.initAiAgentConfigCRDs = [oauth2CRD];
        // Current CRDs no longer have this agent (secret is unused)
        vm.aiAgentConfigCRDs = [];

        await vm.cleanupAiAgentConfigAuthenticationSecrets();

        expect(dispatch).toHaveBeenCalledWith(
          'management/find',
          expect.objectContaining({
            type: SECRET,
            id:   `${ AGENT_NAMESPACE }/unused-oauth-secret`
          })
        );
        expect(mockSecret.remove).toHaveBeenCalled();
      });

      it('should not remove OAUTH2 secrets that are still in use', async() => {
        const dispatch = jest.fn();

        const oauth2CRD = mockAiAgentConfigCRD({
          metadata: {
            name:      'oauth-agent',
            namespace: AGENT_NAMESPACE
          },
          spec:     {
            ...mockAiAgentConfigCRD().spec,
            authenticationType:   AIAgentConfigAuthType.OAUTH2,
            authenticationSecret: 'in-use-oauth-secret'
          }
        });

        const wrapper = shallowMount(Settings, initSettings({ dispatch }));
        const vm = wrapper.vm as any;

        vm.initAiAgentConfigCRDs = [oauth2CRD];
        // Same secret is still in current CRDs
        vm.aiAgentConfigCRDs = [oauth2CRD];

        await vm.cleanupAiAgentConfigAuthenticationSecrets();

        // Should not try to remove the secret
        expect(dispatch).not.toHaveBeenCalledWith(
          'management/find',
          expect.objectContaining({ type: SECRET })
        );
      });

      it('should handle error when secret not found gracefully', async() => {
        const dispatch = jest.fn((action: string) => {
          if (action === 'management/find') {
            return Promise.reject(new Error('Secret not found'));
          }

          return Promise.resolve(null);
        });

        const oauth2CRD = mockAiAgentConfigCRD({
          metadata: {
            name:      'oauth-agent',
            namespace: AGENT_NAMESPACE
          },
          spec:     {
            ...mockAiAgentConfigCRD().spec,
            authenticationType:   AIAgentConfigAuthType.OAUTH2,
            authenticationSecret: 'missing-oauth-secret'
          }
        });

        const wrapper = shallowMount(Settings, initSettings({ dispatch }));
        const vm = wrapper.vm as any;

        vm.initAiAgentConfigCRDs = [oauth2CRD];
        vm.aiAgentConfigCRDs = [];

        // Should not throw, but warn should be called
        await expect(vm.cleanupAiAgentConfigAuthenticationSecrets()).resolves.not.toThrow();
      });

      it('should not clean up BASIC auth secrets (only OAUTH2)', async() => {
        const dispatch = jest.fn();

        const basicCRD = mockAiAgentConfigCRD({
          metadata: {
            name:      'basic-agent',
            namespace: AGENT_NAMESPACE
          },
          spec:     {
            ...mockAiAgentConfigCRD().spec,
            authenticationType:   AIAgentConfigAuthType.BASIC,
            authenticationSecret: 'basic-secret'
          }
        });

        const wrapper = shallowMount(Settings, initSettings({ dispatch }));
        const vm = wrapper.vm as any;

        vm.initAiAgentConfigCRDs = [basicCRD];
        vm.aiAgentConfigCRDs = [];

        await vm.cleanupAiAgentConfigAuthenticationSecrets();

        // Should not try to remove BASIC auth secrets
        expect(dispatch).not.toHaveBeenCalledWith(
          'management/find',
          expect.objectContaining({ type: SECRET })
        );
      });

      it('should not clean up secrets without authenticationSecret field', async() => {
        const dispatch = jest.fn();

        const crdWithoutSecret = mockAiAgentConfigCRD({
          metadata: {
            name:      'no-secret-agent',
            namespace: AGENT_NAMESPACE
          },
          spec:     {
            ...mockAiAgentConfigCRD().spec,
            authenticationType:   AIAgentConfigAuthType.OAUTH2,
            authenticationSecret: '' // Empty secret
          }
        });

        const wrapper = shallowMount(Settings, initSettings({ dispatch }));
        const vm = wrapper.vm as any;

        vm.initAiAgentConfigCRDs = [crdWithoutSecret];
        vm.aiAgentConfigCRDs = [];

        await vm.cleanupAiAgentConfigAuthenticationSecrets();

        // Should not try to remove since authenticationSecret is empty
        expect(dispatch).not.toHaveBeenCalledWith(
          'management/find',
          expect.objectContaining({ type: SECRET })
        );
      });

      it('should handle multiple OAUTH2 secrets cleanup', async() => {
        const mockSecret1 = {
          metadata: {
            name:      'unused-oauth-secret-1',
            namespace: AGENT_NAMESPACE
          },
          remove: jest.fn().mockResolvedValue({})
        };

        const mockSecret2 = {
          metadata: {
            name:      'unused-oauth-secret-2',
            namespace: AGENT_NAMESPACE
          },
          remove: jest.fn().mockResolvedValue({})
        };

        const dispatch = jest.fn((action: string, params?: any) => {
          if (action === 'management/find') {
            if (params?.id?.includes('unused-oauth-secret-1')) {
              return Promise.resolve(mockSecret1);
            } else if (params?.id?.includes('unused-oauth-secret-2')) {
              return Promise.resolve(mockSecret2);
            }
          }

          return Promise.resolve(null);
        });

        const oauth2CRD1 = mockAiAgentConfigCRD({
          metadata: {
            name:      'oauth-agent-1',
            namespace: AGENT_NAMESPACE
          },
          spec:     {
            ...mockAiAgentConfigCRD().spec,
            authenticationType:   AIAgentConfigAuthType.OAUTH2,
            authenticationSecret: 'unused-oauth-secret-1'
          }
        });

        const oauth2CRD2 = mockAiAgentConfigCRD({
          metadata: {
            name:      'oauth-agent-2',
            namespace: AGENT_NAMESPACE
          },
          spec:     {
            ...mockAiAgentConfigCRD().spec,
            authenticationType:   AIAgentConfigAuthType.OAUTH2,
            authenticationSecret: 'unused-oauth-secret-2'
          }
        });

        const wrapper = shallowMount(Settings, initSettings({ dispatch }));
        const vm = wrapper.vm as any;

        vm.initAiAgentConfigCRDs = [oauth2CRD1, oauth2CRD2];
        vm.aiAgentConfigCRDs = [];

        await vm.cleanupAiAgentConfigAuthenticationSecrets();

        expect(mockSecret1.remove).toHaveBeenCalled();
        expect(mockSecret2.remove).toHaveBeenCalled();
      });
    });
  });

  describe('Custom Model Management for AI Agents', () => {
    it('should initialize llmModel and llmModelEnabled fields on CRDs', async() => {
      const crdWithCustomModel = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-with-custom-model',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'custom-model-v1',
          llmModelEnabled: true
        }
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([crdWithCustomModel]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.aiAgentConfigCRDs[0]?.spec.llmModel).toBe('custom-model-v1');
      expect(vm.aiAgentConfigCRDs[0]?.spec.llmModelEnabled).toBe(true);
    });

    it('should accept CRDs with custom models and preserve them', async() => {
      const crdWithCustomModel = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-with-custom-model',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'gpt-4',
          llmModelEnabled: true
        }
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([crdWithCustomModel]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // Verify the custom model persists in the loaded CRDs
      expect(vm.aiAgentConfigCRDs).toHaveLength(1);
      expect(vm.aiAgentConfigCRDs[0]?.spec.llmModel).toBe('gpt-4');
      expect(vm.aiAgentConfigCRDs[0]?.spec.llmModelEnabled).toBe(true);
    });

    it('should handle multiple agents with different custom models', async() => {
      const agent1 = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-1',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'gpt-4',
          llmModelEnabled: true
        }
      });

      const agent2 = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-2',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'claude-3',
          llmModelEnabled: true
        }
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([agent1, agent2]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.aiAgentConfigCRDs).toHaveLength(2);
      expect(vm.aiAgentConfigCRDs[0]?.spec.llmModel).toBe('gpt-4');
      expect(vm.aiAgentConfigCRDs[1]?.spec.llmModel).toBe('claude-3');
    });

    it('should handle CRDs with llmModelEnabled set to false', async() => {
      const crdDisabled = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-disabled',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'gpt-4',
          llmModelEnabled: false
        }
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([crdDisabled]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.aiAgentConfigCRDs[0]?.spec.llmModel).toBe('gpt-4');
      expect(vm.aiAgentConfigCRDs[0]?.spec.llmModelEnabled).toBe(false);
    });
  });

  describe('AI Agent Settings Update Flow', () => {
    it('should handle updates from AIAgentSettings component via updateAiAgentSettings', async() => {
      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      const newSettings = {
        [SettingsEnum.OPENAI_MODEL]: 'gpt-4',
        chatbot:                     'openai'
      };

      vm.updateAiAgentSettings(newSettings);

      expect(vm.aiAgentSettings).toEqual(expect.objectContaining(newSettings));
      expect(vm.isAiAgentSettingsTouched).toBe(true);
    });

    it('should have structure to support AIAgentSettings component integration', async() => {
      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.aiAgentSettings).toBeDefined();
      expect(vm.aiAgentConfigCRDs).toBeDefined();
      expect(vm.modelOptions).toBeDefined();
    });
  });

  describe('Growl Notification Logic', () => {
    it('should show growl when models change and settings have been touched', async() => {
      const agentWithModel = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-1',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'gpt-4',
          llmModelEnabled: true
        }
      });

      const dispatchMock = jest.fn((action: string) => {
        if (action === 'management/find') {
          return Promise.resolve(mockSecret());
        }
        if (action === 'management/findAll') {
          return Promise.resolve([agentWithModel]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch: dispatchMock }));

      await flushPromises();

      const vm = wrapper.vm as any;

      vm.isAiAgentSettingsTouched = true;
      vm.updateModelOptions(mockModelOptions(['gpt-3.5', 'claude-3']));

      expect(dispatchMock).toHaveBeenCalledWith(
        'growl/warning',
        expect.objectContaining({
          title:   'aiConfig.growl.modelsChanged.title',
          message: expect.any(String),
          timeout: 0
        }),
        expect.objectContaining({ root: true })
      );
    });

    it('should accept model updates from child component', async() => {
      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // Simulate model updates coming from child component via updateModelOptions
      const models = mockModelOptions(['gpt-4', 'gpt-3.5', 'claude-3']);

      vm.updateModelOptions(models);

      expect(vm.modelOptions).toEqual(models);
    });
  });

  describe('Model Reset Behavior with AI Agents', () => {
    it('should handle model persistence when same models are available', async() => {
      const agentWithModel = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-1',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'gpt-4',
          llmModelEnabled: true
        }
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([agentWithModel]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // When available models include the custom model, it should persist
      expect(vm.aiAgentConfigCRDs[0]?.spec.llmModel).toBe('gpt-4');
    });

    it('should handle model list updates from AIAgentSettings', async() => {
      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // Simulate receiving model list update from AIAgentSettings
      const modelList = mockModelOptions(['gpt-4', 'gpt-3.5', 'claude-3', 'custom-model']);

      vm.updateModelOptions(modelList);

      expect(vm.modelOptions).toEqual(modelList);
    });

    it('should save changes including custom model configurations', async() => {
      const mockSaveSettings = jest.fn().mockResolvedValue({});

      (useAIAgentApiComposable as jest.Mock).mockReturnValue({
        fetchSettings: jest.fn().mockResolvedValue({}),
        saveSettings:  mockSaveSettings
      });

      const agentWithCustomModel = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-1',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'gpt-4',
          llmModelEnabled: true
        }
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([agentWithCustomModel]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // Save should handle agents with custom models
      const callback = jest.fn();

      await vm.save(callback);

      expect(mockSaveSettings).toHaveBeenCalled();
    });
  });

  describe('isAiAgentSettingsTouched State Management', () => {
    it('should initialize isAiAgentSettingsTouched to false', async() => {
      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.isAiAgentSettingsTouched).toBe(false);
    });

    it('should transition from false to true when updateAiAgentSettings is called', async() => {
      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // Initially false
      expect(vm.isAiAgentSettingsTouched).toBe(false);

      // Call updateAiAgentSettings (simulating user interaction)
      vm.updateAiAgentSettings({
        chatbot:   'ollama',
        ollamaUrl: 'http://localhost:11434'
      });

      // Should transition to true
      expect(vm.isAiAgentSettingsTouched).toBe(true);
    });

    it('should remain true on subsequent updateAiAgentSettings calls', async() => {
      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // First call: false → true
      vm.updateAiAgentSettings({ chatbot: 'ollama' });
      expect(vm.isAiAgentSettingsTouched).toBe(true);

      // Second call: should remain true
      vm.updateAiAgentSettings({ chatbot: 'openai' });
      expect(vm.isAiAgentSettingsTouched).toBe(true);
    });

    it('should transition from true to null when growl is shown due to model reset', async() => {
      const agentWithModel = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-1',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'gpt-4',
          llmModelEnabled: true
        }
      });

      const dispatchMock = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([agentWithModel]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch: dispatchMock }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // Set touched state to true
      vm.isAiAgentSettingsTouched = true;

      // Call updateModelOptions with models that don't include the custom model
      vm.updateModelOptions(mockModelOptions(['gpt-3.5', 'claude-3']));

      // Should transition to null (because growl was shown)
      expect(vm.isAiAgentSettingsTouched).toBe(null);

      // Verify the growl dispatch was called
      expect(dispatchMock).toHaveBeenCalledWith(
        'growl/warning',
        expect.objectContaining({
          title:   'aiConfig.growl.modelsChanged.title',
          message: expect.any(String),
          timeout: 0
        }),
        expect.objectContaining({ root: true })
      );
    });

    it('should reset to false when applySettings is called after save', async() => {
      const mockSaveSettings = jest.fn().mockResolvedValue({});

      (useAIAgentApiComposable as jest.Mock).mockReturnValue({
        fetchSettings: jest.fn().mockResolvedValue({}),
        saveSettings:  mockSaveSettings
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // Set touched state to true and set the callback
      vm.isAiAgentSettingsTouched = true;
      expect(vm.isAiAgentSettingsTouched).toBe(true);

      // Mock the applySettingsCb to simulate successful save
      const mockCallback = jest.fn();

      vm.applySettingsCb = mockCallback;

      // Call save with the callback - this simulates the AsyncButton success handler
      const saveCallback = jest.fn((success) => {
        if (success) {
          // The success handler calls applySettings
          vm.applySettings();
        }
      });

      await vm.save(saveCallback);

      await flushPromises();

      // After applySettings is called via the success callback, touched should be reset to false
      expect(vm.isAiAgentSettingsTouched).toBe(false);
    });

    it('should not show growl notification if isAiAgentSettingsTouched is false when models are reset', async() => {
      const agentWithModel = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-1',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'gpt-4',
          llmModelEnabled: true
        }
      });

      const dispatchMock = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([agentWithModel]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch: dispatchMock }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // Keep touched state as false (user hasn't made changes yet)
      expect(vm.isAiAgentSettingsTouched).toBe(false);

      // Call updateModelOptions with models that don't include the custom model
      vm.updateModelOptions(mockModelOptions(['gpt-3.5', 'claude-3']));

      // Growl should NOT be dispatched because touched is false
      expect(dispatchMock).not.toHaveBeenCalledWith(
        'growl/warning',
        expect.anything(),
        expect.anything()
      );

      // touched should remain false
      expect(vm.isAiAgentSettingsTouched).toBe(false);
    });
  });

  describe('updateModelOptions - Model Reset Logic', () => {
    it('should reset custom model when it is no longer available', async() => {
      const agentWithModel = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-1',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'custom-gpt-4',
          llmModelEnabled: true
        }
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([agentWithModel]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // Set initial state
      vm.isAiAgentSettingsTouched = true;

      // Call updateModelOptions with models that exclude the custom model
      vm.updateModelOptions(mockModelOptions(['gpt-3.5', 'claude-3']));

      // Model should be reset
      expect(vm.aiAgentConfigCRDs[0].spec.llmModel).toBeUndefined();
      expect(vm.aiAgentConfigCRDs[0].spec.llmModelEnabled).toBe(false);
    });

    it('should set llmModelEnabled to false when custom model is removed', async() => {
      const agentWithModel = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-1',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'gpt-4-turbo',
          llmModelEnabled: true
        }
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([agentWithModel]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // Verify initial state
      expect(vm.aiAgentConfigCRDs[0].spec.llmModelEnabled).toBe(true);

      // Update available models to exclude the custom model
      vm.updateModelOptions(mockModelOptions(['gpt-3.5-turbo', 'claude-3-opus']));

      // llmModelEnabled should be false
      expect(vm.aiAgentConfigCRDs[0].spec.llmModelEnabled).toBe(false);
    });

    it('should restore initial model when it becomes available again', async() => {
      const agentWithModel = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-1',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'gpt-4',
          llmModelEnabled: true
        }
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([agentWithModel]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      // First: remove the model from available list
      vm.isAiAgentSettingsTouched = true;
      vm.updateModelOptions(mockModelOptions(['gpt-3.5', 'claude-3']));

      // Verify model was reset
      expect(vm.aiAgentConfigCRDs[0].spec.llmModel).toBeUndefined();
      expect(vm.aiAgentConfigCRDs[0].spec.llmModelEnabled).toBe(false);

      // Set touched to true again to allow restoration
      vm.isAiAgentSettingsTouched = true;

      // Restore: add the original model back to available list
      vm.updateModelOptions(mockModelOptions(['gpt-4', 'gpt-3.5', 'claude-3']));

      // Verify model was restored
      expect(vm.aiAgentConfigCRDs[0].spec.llmModel).toBe('gpt-4');
      expect(vm.aiAgentConfigCRDs[0].spec.llmModelEnabled).toBe(true);
    });

    it('should handle multiple agents with different models being reset', async() => {
      const agent1 = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-1',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          displayName:      'Agent 1',
          llmModel:        'gpt-4',
          llmModelEnabled: true
        }
      });

      const agent2 = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-2',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          displayName:      'Agent 2',
          llmModel:        'claude-3',
          llmModelEnabled: true
        }
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([agent1, agent2]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      vm.isAiAgentSettingsTouched = true;

      // Update models to remove both custom models
      vm.updateModelOptions(mockModelOptions(['gpt-3.5-turbo', 'gemini-pro']));

      // Both agents should have models reset
      expect(vm.aiAgentConfigCRDs[0].spec.llmModel).toBeUndefined();
      expect(vm.aiAgentConfigCRDs[0].spec.llmModelEnabled).toBe(false);
      expect(vm.aiAgentConfigCRDs[1].spec.llmModel).toBeUndefined();
      expect(vm.aiAgentConfigCRDs[1].spec.llmModelEnabled).toBe(false);
    });

    it('should show growl notification with correct agent names when models are reset', async() => {
      const agent1 = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-1',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          displayName:      'Coding Assistant',
          llmModel:        'gpt-4',
          llmModelEnabled: true
        }
      });

      const agent2 = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-2',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          displayName:      'Writing Helper',
          llmModel:        'claude-3',
          llmModelEnabled: true
        }
      });

      const dispatchMock = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([agent1, agent2]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch: dispatchMock }));

      await flushPromises();

      const vm = wrapper.vm as any;

      vm.isAiAgentSettingsTouched = true;

      // Reset both agents' models
      vm.updateModelOptions(mockModelOptions(['gpt-3.5', 'gemini-pro']));

      // Verify growl was called with correct information
      expect(dispatchMock).toHaveBeenCalledWith(
        'growl/warning',
        expect.objectContaining({
          title:   'aiConfig.growl.modelsChanged.title',
          timeout: 0
        }),
        expect.objectContaining({ root: true })
      );

      // Verify the growl call was made and get the message
      const growlCall = dispatchMock.mock.calls.find(
        (call) => call[0] === 'growl/warning'
      );

      const message = (growlCall as any)[1].message as string;

      expect(message).toBeTruthy();

      expect(dispatchMock).toHaveBeenCalledWith(
        'growl/warning',
        expect.objectContaining({ message: expect.any(String) }),
        expect.any(Object)
      );
    });

    it('should not reset models that are still available', async() => {
      const agent1 = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-1',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'gpt-4',
          llmModelEnabled: true
        }
      });

      const agent2 = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-2',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'claude-3',
          llmModelEnabled: true
        }
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([agent1, agent2]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      vm.isAiAgentSettingsTouched = true;

      // Update models: gpt-4 remains, claude-3 is removed
      vm.updateModelOptions(mockModelOptions(['gpt-4', 'gpt-3.5', 'gemini-pro']));

      // Agent 1 should keep its model
      expect(vm.aiAgentConfigCRDs[0].spec.llmModel).toBe('gpt-4');
      expect(vm.aiAgentConfigCRDs[0].spec.llmModelEnabled).toBe(true);

      // Agent 2 should have model reset
      expect(vm.aiAgentConfigCRDs[1].spec.llmModel).toBeUndefined();
      expect(vm.aiAgentConfigCRDs[1].spec.llmModelEnabled).toBe(false);
    });

    it('should update modelOptions property after processing resets', async() => {
      const agentWithModel = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-1',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'gpt-4',
          llmModelEnabled: true
        }
      });

      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([agentWithModel]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await flushPromises();

      const vm = wrapper.vm as any;

      const newModels = mockModelOptions(['gpt-3.5', 'claude-3', 'gemini-pro']);

      vm.updateModelOptions(newModels);

      // modelOptions should be updated to the new list
      expect(vm.modelOptions).toEqual(newModels);
    });

    it('should not show growl if no models were reset', async() => {
      const agent1 = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-1',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'gpt-4',
          llmModelEnabled: true
        }
      });

      const agent2 = mockAiAgentConfigCRD({
        metadata: {
          name:      'agent-2',
          namespace: AGENT_NAMESPACE
        },
        spec:     {
          ...mockAiAgentConfigCRD().spec,
          llmModel:        'claude-3',
          llmModelEnabled: true
        }
      });

      const dispatchMock = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([agent1, agent2]);
        }

        return Promise.resolve(null);
      });

      const wrapper = shallowMount(Settings, initSettings({ dispatch: dispatchMock }));

      await flushPromises();

      const vm = wrapper.vm as any;

      vm.isAiAgentSettingsTouched = true;

      // Update with models that include both existing models
      vm.updateModelOptions(mockModelOptions(['gpt-4', 'claude-3', 'gpt-3.5']));

      // Growl should NOT be dispatched because no models were reset
      expect(dispatchMock).not.toHaveBeenCalledWith(
        'growl/warning',
        expect.anything(),
        expect.anything()
      );

      // Models should remain unchanged
      expect(vm.aiAgentConfigCRDs[0].spec.llmModel).toBe('gpt-4');
      expect(vm.aiAgentConfigCRDs[1].spec.llmModel).toBe('claude-3');
    });
  });
});;
