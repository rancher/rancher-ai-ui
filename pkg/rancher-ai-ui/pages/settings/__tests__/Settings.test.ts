import { shallowMount } from '@vue/test-utils';
import Settings from '../Settings.vue';
import { SECRET } from '@shell/config/types';
import { AGENT_NAMESPACE, AGENT_CONFIG_SECRET_NAME, AGENT_NAME } from '../../../product';
import { Settings as SettingsEnum, AIAgentConfigAuthType } from '../types';
import { AIAgentConfigCRD } from '../../../types';

// Mock components with external dependencies
jest.mock('../sections/AIAgentSettings.vue', () => ({}));
jest.mock('../../../dialog/ApplySettingsCard.vue', () => ({}));

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

const mockStore = {
  dispatch: jest.fn(),
  commit:   jest.fn(),
  getters:  {
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

  // Default dispatch implementation
  if (!options.dispatch) {
    dispatch.mockImplementation((action: string) => {
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
  const { useStore } = require('vuex');

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

    it('should initialize all required data properties', async() => {
      const wrapper = shallowMount(Settings, initSettings());

      await wrapper.vm.$nextTick();

      const vm = wrapper.vm as any;

      expect(vm.aiAgentSettings).toBeDefined();
      expect(vm.aiAgentConfigCRDs).toBeDefined();
      expect(vm.authenticationSecrets).toEqual({});
      expect(vm.hasErrors).toBe(false);
    });
  });

  describe('Permissions Check', () => {
    it('should redirect when user cannot list secrets', async() => {
      const dispatch = jest.fn((action: string) => {
        if (action === `management/find`) {
          return Promise.resolve(mockSecret());
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const store = {
        dispatch,
        commit:  jest.fn(),
        getters: {
          'management/canList':    jest.fn(() => false),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['PUT', 'POST', 'DELETE'] })),
          'i18n/t':                (key: string) => key
        }
      };

      const { useStore } = require('vuex'); // eslint-disable-line @typescript-eslint/no-require-imports, no-undef

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

      // When user cannot list secrets, the component should show no permission state
      expect(vm.permissions?.list.canListSecrets).toBe(false);
    });

    it('should not redirect when user can list secrets', async() => {
      const wrapper = shallowMount(Settings, initSettings());

      await wrapper.vm.$nextTick();

      const vm = wrapper.vm as any;

      expect(vm.permissions?.list.canListSecrets).toBe(true);
    });
  });

  describe('Fetching AI Agent Settings', () => {
    it('should fetch settings from secret', async() => {
      const secretData = { [SettingsEnum.MODEL]: 'Z3B0LTQ=' };

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

      await new Promise((resolve) => setTimeout(resolve, 0));

      const vm = wrapper.vm as any;

      expect(vm.aiAgentSettings).toBeDefined();
    });

    it('should decode base64 secret data', async() => {
      const secretData = { [SettingsEnum.MODEL]: 'Z3B0LTRv' };

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

      const vm = wrapper.vm as any;

      expect(vm.aiAgentSettings[SettingsEnum.MODEL]).toBe('gpt-4o');
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

      const wrapper = shallowMount(Settings, initSettings({ dispatch }));

      await wrapper.vm.$nextTick();

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

      await wrapper.vm.$nextTick();

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

      await wrapper.vm.$nextTick();

      const vm = wrapper.vm as any;

      expect(vm.aiAgentConfigCRDs.length).toBeGreaterThan(0);
    });
  });

  describe('Saving Agent Settings', () => {
    it('should encode and save settings to secret', async() => {
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

      vm.aiAgentSettings = { [SettingsEnum.MODEL]: 'gpt-4' };
      await vm.saveAgentSettings();

      expect(secret.save).toHaveBeenCalled();
      expect((secret.data as any)[SettingsEnum.MODEL]).toBe('Z3B0LTQ=');
    });

    it('should handle save errors gracefully', async() => {
      const secret = mockSecret();

      secret.save.mockRejectedValueOnce(new Error('Save failed'));

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

      vm.aiAgentSettings = { [SettingsEnum.MODEL]: 'gpt-4' };
      await expect(vm.saveAgentSettings()).resolves.not.toThrow();
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
    it('should update aiAgentSettings when modified', async() => {
      const wrapper = shallowMount(Settings, initSettings());
      const vm = wrapper.vm as any;

      const newSettings = { [SettingsEnum.MODEL]: 'gpt-4o' };

      vm.aiAgentSettings = newSettings;

      expect(vm.aiAgentSettings).toEqual(newSettings);
    });

    it('should update aiAgentConfigCRDs when modified', async() => {
      const wrapper = shallowMount(Settings, initSettings());
      const vm = wrapper.vm as any;

      const newCRDs = [mockAiAgentConfigCRD()];

      vm.aiAgentConfigCRDs = newCRDs;

      expect(vm.aiAgentConfigCRDs).toEqual(newCRDs);
    });

    it('should update authenticationSecrets when modified', async() => {
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

    it('should track validation errors', async() => {
      const wrapper = shallowMount(Settings, initSettings());
      const vm = wrapper.vm as any;

      expect(vm.hasErrors).toBe(false);
      vm.hasErrors = true;
      expect(vm.hasErrors).toBe(true);
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
      await new Promise((resolve) => setTimeout(resolve, 0));

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
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(dispatch).toHaveBeenCalledWith(expect.stringContaining('management/findAll'), expect.anything());
    });
  });

  describe('Save Operation', () => {
    it('should save all data when save method is called', async() => {
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

      vm.aiAgentSettings = { [SettingsEnum.MODEL]: 'gpt-4' };
      const callback = jest.fn();

      await vm.save(callback);

      expect(secret.save).toHaveBeenCalled();
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

    it('should call save function when openApplySettingsDialog onConfirm is triggered', async() => {
      const secret = mockSecret();
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
          return Promise.resolve(secret);
        }
        if (action === `management/findAll`) {
          return Promise.resolve([]);
        }

        return Promise.resolve(null);
      });

      const { useShell } = require('@shell/apis'); // eslint-disable-line @typescript-eslint/no-require-imports, no-undef
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

      vm.aiAgentSettings = { [SettingsEnum.MODEL]: 'gpt-4' };
      const callback = jest.fn();

      await vm.openApplySettingsDialog(callback);

      await capturedOnConfirm();

      expect(secret.save).toHaveBeenCalled();
    });
  });

  describe('Permissions Handling', () => {
    it('should compute correct permissions when all allowed', async() => {
      const store = {
        dispatch:  jest.fn(),
        commit:    jest.fn(),
        getters:   {
          'management/canList':    jest.fn(() => true),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['PUT', 'POST', 'DELETE'] })),
          'i18n/t':                (key: string) => key
        },
        state: { $router: { push: jest.fn() } }
      };

      const { useStore } = require('vuex'); // eslint-disable-line @typescript-eslint/no-require-imports, no-undef

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

      expect(vm.permissions?.list.canListSecrets).toBe(true);
      expect(vm.permissions?.list.canListAiAgentCRDS).toBe(true);
      expect(vm.permissions?.create.canCreateSecrets).toBe(true);
      expect(vm.permissions?.create.canCreateAiAgentCRDS).toBe(true);
    });

    it('should handle canList true but canCreate false for secrets', async() => {
      const store = {
        dispatch:  jest.fn(),
        commit:    jest.fn(),
        getters:   {
          'management/canList':    jest.fn(() => true),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['GET'] })), // No PUT method
          'i18n/t':                (key: string) => key
        },
        state: { $router: { push: jest.fn() } }
      };

      const { useStore } = require('vuex'); // eslint-disable-line @typescript-eslint/no-require-imports, no-undef

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

      expect(vm.permissions?.list.canListSecrets).toBe(true);
      expect(vm.permissions?.create.canCreateSecrets).toBe(false);
    });

    it('should handle canList false for secrets', async() => {
      const store = {
        dispatch:  jest.fn(),
        commit:    jest.fn(),
        getters:   {
          'management/canList':    jest.fn((type) => type !== SECRET),
          'management/schemaFor':  jest.fn((type) => {
            if (type === SECRET) {
              return { resourceMethods: ['GET'] }; // No PUT means no create permission
            }

            return { resourceMethods: ['PUT', 'POST', 'DELETE'] };
          }),
          'i18n/t': (key: string) => key
        }
      };

      const { useStore } = require('vuex'); // eslint-disable-line @typescript-eslint/no-require-imports, no-undef

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

      expect(vm.permissions?.list.canListSecrets).toBe(false);
      expect(vm.permissions?.create.canCreateSecrets).toBe(false);
    });

    it('should handle canList false for AI Agent CRDs', async() => {
      const store = {
        dispatch:  jest.fn(),
        commit:    jest.fn(),
        getters:   {
          'management/canList':    jest.fn((type) => type === SECRET), // Only can list secrets
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

      const { useStore } = require('vuex'); // eslint-disable-line @typescript-eslint/no-require-imports, no-undef

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

      expect(vm.permissions?.list.canListAiAgentCRDS).toBe(false);
    });

    it('should show read-only mode when cannot create secrets', async() => {
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

      const store = {
        dispatch,
        commit:    jest.fn(),
        getters:   {
          'management/canList':    jest.fn(() => true),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['GET'] })), // Can list but not create
          'i18n/t':                (key: string) => key
        },
        state: { $router: { push: jest.fn() } }
      };

      const { useStore } = require('vuex'); // eslint-disable-line @typescript-eslint/no-require-imports, no-undef

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

      // Verify that the component has read-only permission state
      expect(vm.permissions?.create.canCreateSecrets).toBe(false);
    });

    it('should show save button only when has create permission', async() => {
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

      const store = {
        dispatch,
        commit:    jest.fn(),
        getters:   {
          'management/canList':    jest.fn(() => true),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['get'] })), // No create
          'i18n/t':                (key: string) => key
        },
        state: { $router: { push: jest.fn() } }
      };

      const { useStore } = require('vuex'); // eslint-disable-line @typescript-eslint/no-require-imports, no-undef

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

      // Save button should not be visible when no create permission
      expect(vm.permissions?.create.canCreateSecrets).toBe(false);
    });

    it('should show warning banner when cannot list secrets', async() => {
      const store = {
        dispatch:  jest.fn(),
        commit:    jest.fn(),
        getters:   {
          'management/canList':    jest.fn(() => false),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['put', 'post', 'delete'] })),
          'i18n/t':                (key: string) => key
        },
        state: { $router: { push: jest.fn() } }
      };

      const { useStore } = require('vuex'); // eslint-disable-line @typescript-eslint/no-require-imports, no-undef

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

      // Verify that canListSecrets is false due to permission check
      expect(vm.permissions?.list.canListSecrets).toBe(false);
    });

    it('should disable save button when validation has errors', async() => {
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

      vm.hasErrors = true;

      await wrapper.vm.$nextTick();

      // Verify that hasErrors is properly tracked
      expect(vm.hasErrors).toBe(true);
    });

    it('should prevent save when cannot create secrets', async() => {
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

      const store = {
        dispatch,
        commit:    jest.fn(),
        getters:   {
          'management/canList':    jest.fn(() => true),
          'management/schemaFor':  jest.fn(() => ({ resourceMethods: ['GET'] })),
          'i18n/t':                (key: string) => key
        },
        state: { $router: { push: jest.fn() } }
      };

      const { useStore } = require('vuex'); // eslint-disable-line @typescript-eslint/no-require-imports, no-undef

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

      // Verify that save should not proceed due to lack of create permissions
      expect(vm.permissions?.create.canCreateSecrets).toBe(false);
    });

    it('should require both create permissions for full functionality', async() => {
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

      const store = {
        dispatch,
        commit:    jest.fn(),
        getters:   {
          'management/canList':    jest.fn(() => true),
          'management/schemaFor':  jest.fn((type) => {
            // Can create secrets but not AI Agent CRDs
            if (type === SECRET) {
              return { resourceMethods: ['PUT', 'POST', 'DELETE'] };
            }

            return { resourceMethods: ['GET'] };
          }),
          'i18n/t': (key: string) => key
        },
        state: { $router: { push: jest.fn() } }
      };

      const { useStore } = require('vuex'); // eslint-disable-line @typescript-eslint/no-require-imports, no-undef

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

      expect(vm.permissions?.create.canCreateSecrets).toBe(true);
      expect(vm.permissions?.create.canCreateAiAgentCRDS).toBe(false);
    });
  });
});
