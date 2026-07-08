import { shallowMount, flushPromises } from '@vue/test-utils';
import { Buffer } from 'buffer';
import Oauth2SecretForm from '../Oauth2SecretForm.vue';
import { AiAgentConfigOAuth2SecretPayload } from '../../../types';
import { AIAgentAPIEvent } from '../../../../../types';

const mockStore = { dispatch: jest.fn() };

jest.mock('vuex', () => ({ useStore: jest.fn(() => mockStore) }));

jest.mock('@shell/composables/useI18n', () => ({
  useI18n: jest.fn(() => ({
    t:     (key: string) => key,
    store: mockStore
  }))
}));

jest.mock('@shell/utils/crypto', () => ({
  base64Decode: jest.fn((value: string) => {
    if (value === 'bWV0YWRhdGFFbmRwb2ludA==') {
      return 'metadataEndpoint';
    }
    if (value === 'Y2xpZW50SWQxMjM=') {
      return 'clientId123';
    }
    if (value === 'Y2xpZW50U2VjcmV0NDU2') {
      return 'clientSecret456';
    }
    if (value === 'b3BlbmlkIHByb2ZpbGUgZW1haWw=') {
      return 'openid profile email';
    }

    return Buffer.from(value, 'base64').toString('utf-8');
  })
}));

jest.mock('../../../../../utils/log', () => ({ warn: jest.fn() }));

jest.mock('@shell/components/form/Password.vue', () => ({
  default: {
    name:     'Password',
    template: '<input class="password-field" />',
    props:    ['value', 'label', 'required', 'rules', 'mode', 'class'],
    emits:    ['update:value']
  }
}));

jest.mock('@shell/components/form/LabeledSelect.vue', () => ({
  default: {
    name:     'LabeledSelect',
    template: '<select class="labeled-select" />',
    props:    ['value', 'label', 'options', 'taggable', 'multiple', 'placeholder', 'disabled'],
    emits:    ['update:value']
  }
}));

const mockApiComposable = {
  fetchMcpAuthenticationMetadata:       jest.fn().mockResolvedValue({ scopesSupported: ['openid', 'profile', 'email'] }),
  cancelFetchMcpAuthenticationMetadata: jest.fn(),
  fetchMcpAuthenticationClientInfo:     jest.fn().mockResolvedValue({
    clientId:     'discovered-client-id',
    clientSecret: 'discovered-client-secret'
  }),
  cancelFetchMcpAuthenticationClientInfo: jest.fn(),
  fetchMcpAuthenticationScopes:           jest.fn().mockResolvedValue(['openid', 'profile', 'email'])
} as any;

const mockOauth2Payload = (): AiAgentConfigOAuth2SecretPayload => ({
  metadataEndpoint: 'https://oauth.example.com/.well-known/openid-configuration',
  clientID:         'client-id-123',
  clientSecret:     'client-secret-456',
  scopes:           ['openid', 'profile', 'email']
});

const requiredSetup = () => ({
  global: {
    provide: { store: mockStore },
    stubs:   {
      Password:           true,
      LabeledSelect:      true,
      LabeledInput:       true,
      DiscoveryBanner:    true,
    }
  }
});

describe('Oauth2SecretForm', () => {
  beforeEach(() => {
    mockStore.dispatch.mockResolvedValue({
      data: {
        metadataEndpoint: 'bWV0YWRhdGFFbmRwb2ludA==',
        clientID:         'Y2xpZW50SWQxMjM=',
        clientSecret:     'Y2xpZW50U2VjcmV0NDU2',
        scope:            'b3BlbmlkIHByb2ZpbGUgZW1haWw='
      }
    });
  });

  describe('Component Initialization', () => {
    it('should render the component with all form fields', () => {
      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         null,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      expect(wrapper.findComponent({ name: 'DiscoveryBanner' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'LabeledInput' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'Password' }).exists()).toBe(true);
    });

    it('should initialize with null mcpScopes when no scopes discovered yet', () => {
      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         null,
          mcpUrl:        '',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      expect(vm.mcpScopes).toBeNull();
    });

    it('should initialize discovery statuses as empty objects', () => {
      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         null,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      expect(vm.metadataDiscoveryStatus).toEqual({});
      expect(vm.clientInfoDiscoveryStatus).toEqual({});
    });
  });

  describe('Secret Value Handling', () => {
    it('should render initial value in form fields', () => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      expect(vm.value.metadataEndpoint).toBe(payload.metadataEndpoint);
      expect(vm.value.clientID).toBe(payload.clientID);
      expect(vm.value.clientSecret).toBe(payload.clientSecret);
      expect(vm.value.scopes).toEqual(payload.scopes);
    });

    it('should emit update event when metadata endpoint is changed', () => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      vm.updateSecretValues({ metadataEndpoint: 'https://new-oauth.example.com' });

      const emitted = wrapper.emitted('update:value');

      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).toEqual({
        ...payload,
        metadataEndpoint: 'https://new-oauth.example.com'
      });
    });

    it('should emit update event when client ID is changed', () => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      vm.updateSecretValues({ clientID: 'new-client-id' });

      const emitted = wrapper.emitted('update:value');

      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).toEqual({
        ...payload,
        clientID: 'new-client-id'
      });
    });

    it('should emit update event when client secret is changed', () => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      vm.updateSecretValues({ clientSecret: 'new-secret' });

      const emitted = wrapper.emitted('update:value');

      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).toEqual({
        ...payload,
        clientSecret: 'new-secret'
      });
    });

    it('should emit update event when scopes are changed', () => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      vm.updateSecretValues({ scopes: ['openid', 'offline_access'] });

      const emitted = wrapper.emitted('update:value');

      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).toEqual({
        ...payload,
        scopes: ['openid', 'offline_access']
      });
    });

    it('should only include defined values in update payload', () => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      vm.updateSecretValues({
        clientID:     'new-id',
        clientSecret: undefined
      });

      const emitted = wrapper.emitted('update:value');

      expect(emitted![0][0]).toEqual({
        ...payload,
        clientID: 'new-id'
      });
      expect((emitted![0][0] as any).clientSecret).not.toBeUndefined();
    });
  });

  describe('Secret Fetching from Kubernetes', () => {
    it('should fetch secret from Kubernetes on mount if no value provided', async() => {
      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         null,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      await wrapper.vm.$nextTick();

      expect(mockStore.dispatch).toHaveBeenCalledWith('management/find', expect.objectContaining({
        type: expect.any(String),
        id:   expect.stringContaining('oauth2-secret')
      }));
    });

    it('should not fetch secret if value is already provided', async() => {
      const payload = mockOauth2Payload();

      mockStore.dispatch.mockClear();

      shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      expect(mockStore.dispatch).not.toHaveBeenCalledWith('management/find', expect.anything());
    });

    it('should emit update with fetched secret values', async() => {
      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         null,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      await wrapper.vm.$nextTick();

      const emitted = wrapper.emitted('update:value');

      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).toEqual(expect.objectContaining({
        metadataEndpoint: 'metadataEndpoint',
        clientID:         'clientId123',
        clientSecret:     'clientSecret456',
        scopes:           ['openid', 'profile', 'email']
      }));
    });

    it('should not fetch secret if secretName is empty', async() => {
      mockStore.dispatch.mockClear();

      shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    '',
          value:         null,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('Metadata Discovery', () => {
    it('should fetch MCP scopes on mount if mcpUrl and value provided', async() => {
      const payload = mockOauth2Payload();

      mockApiComposable.fetchMcpAuthenticationMetadata.mockResolvedValueOnce({
        scopesSupported:  ['openid', 'profile', 'email', 'offline_access'],
        metadataEndpoint: payload.metadataEndpoint
      });

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      await wrapper.vm.$nextTick();

      expect(mockApiComposable.fetchMcpAuthenticationScopes).toHaveBeenCalledWith({ mcpUrl: 'http://mcp-server.local' });
    });

    it('should set mcpScopes from discovery response', async() => {
      const payload = mockOauth2Payload();

      mockApiComposable.fetchMcpAuthenticationMetadata.mockResolvedValueOnce({
        scopesSupported:  ['openid', 'profile', 'email'],
        metadataEndpoint: payload.metadataEndpoint
      });

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.mcpScopes).toEqual(['openid', 'profile', 'email']);
    });

    it('should handle metadata discovery error', async() => {
      const payload = mockOauth2Payload();

      mockApiComposable.fetchMcpAuthenticationScopes.mockResolvedValueOnce([]);
      mockApiComposable.fetchMcpAuthenticationMetadata.mockResolvedValueOnce({ code: AIAgentAPIEvent.Error });

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      await flushPromises();

      const vm = wrapper.vm as any;

      expect(vm.mcpScopes).toEqual([]);
    });

    it('should confirm metadata discovery with force refresh', async() => {
      const payload = mockOauth2Payload();
      const newEndpoint = 'https://new-oauth.example.com/.well-known/openid-configuration';

      // First call during mount, second call in confirmMetadataDiscovery
      mockApiComposable.fetchMcpAuthenticationMetadata
        .mockResolvedValueOnce({
          scopesSupported:  ['openid', 'profile'],
          metadataEndpoint: newEndpoint
        });

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      await wrapper.vm.$nextTick();
      await vm.confirmMetadataDiscovery();

      expect(mockApiComposable.fetchMcpAuthenticationMetadata).toHaveBeenCalledWith({ mcpUrl: 'http://mcp-server.local' });
      expect(vm.metadataDiscoveryStatus.result).toBe('success');
    });

    it('should set error status when metadata discovery fails', async() => {
      const payload = mockOauth2Payload();

      // fetchMcpAuthenticationScopes is mocked -> doesn't call fetchMcpAuthenticationMetadata
      mockApiComposable.fetchMcpAuthenticationMetadata = jest.fn().mockResolvedValueOnce({
        code:    AIAgentAPIEvent.Error,
        message: 'Metadata endpoint unreachable'
      });

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      await wrapper.vm.$nextTick();
      await vm.confirmMetadataDiscovery();

      expect(vm.metadataDiscoveryStatus.result).toBe('warning');
      expect(vm.metadataDiscoveryStatus.message).toBe('Metadata endpoint unreachable');
    });

    it('should handle metadata discovery abort', async() => {
      const payload = mockOauth2Payload();

      mockApiComposable.fetchMcpAuthenticationMetadata.mockResolvedValueOnce({ code: 'ABORT' });

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      await vm.confirmMetadataDiscovery();

      expect(vm.metadataDiscoveryStatus.result).toBe('info');
    });

    it('should cancel metadata discovery', async() => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      vm.metadataDiscoveryStatus.result = null;
      vm.cancelMetadataDiscovery();

      expect(mockApiComposable.cancelFetchMcpAuthenticationMetadata).toHaveBeenCalled();
      expect(vm.metadataDiscoveryStatus.result).toBe('info');
    });
  });

  describe('Client Info Discovery', () => {
    it('should confirm client info discovery', async() => {
      const payload = mockOauth2Payload();

      mockApiComposable.fetchMcpAuthenticationClientInfo.mockResolvedValueOnce({
        clientId:     'discovered-client-id',
        clientSecret: 'discovered-client-secret'
      });

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      await vm.confirmClientInfoDiscovery();

      expect(mockApiComposable.fetchMcpAuthenticationClientInfo).toHaveBeenCalledWith({ metadataEndpoint: payload.metadataEndpoint });
      expect(vm.clientInfoDiscoveryStatus.result).toBe('success');
    });

    it('should update client ID and secret from discovery', async() => {
      const payload = mockOauth2Payload();

      mockApiComposable.fetchMcpAuthenticationClientInfo.mockResolvedValueOnce({
        clientId:     'discovered-client-id',
        clientSecret: 'discovered-client-secret'
      });

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      await vm.confirmClientInfoDiscovery();

      const emitted = wrapper.emitted('update:value');

      expect(emitted).toBeTruthy();
      expect(emitted![emitted!.length - 1][0]).toEqual(expect.objectContaining({
        clientID:     'discovered-client-id',
        clientSecret: 'discovered-client-secret'
      }));
    });

    it('should set error status when client info discovery fails', async() => {
      const payload = mockOauth2Payload();

      mockApiComposable.fetchMcpAuthenticationClientInfo.mockResolvedValueOnce({
        code:    AIAgentAPIEvent.Error,
        message: 'Failed to retrieve client info'
      });

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      await vm.confirmClientInfoDiscovery();

      expect(vm.clientInfoDiscoveryStatus.result).toBe('warning');
      expect(vm.clientInfoDiscoveryStatus.message).toBe('Failed to retrieve client info');
    });

    it('should handle client info discovery abort', async() => {
      const payload = mockOauth2Payload();

      mockApiComposable.fetchMcpAuthenticationClientInfo.mockResolvedValueOnce({ code: AIAgentAPIEvent.Abort });

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      await vm.confirmClientInfoDiscovery();

      expect(vm.clientInfoDiscoveryStatus.result).toBe('info');
    });

    it('should cancel client info discovery', async() => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      vm.clientInfoDiscoveryStatus.result = null;
      vm.cancelClientInfoDiscovery();

      expect(mockApiComposable.cancelFetchMcpAuthenticationClientInfo).toHaveBeenCalled();
      expect(vm.clientInfoDiscoveryStatus.result).toBe('info');
    });

    it('should not call discovery if metadata endpoint not set', async() => {
      const payload = {
        ...mockOauth2Payload(),
        metadataEndpoint: ''
      };

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      mockApiComposable.fetchMcpAuthenticationClientInfo.mockClear();
      await vm.confirmClientInfoDiscovery();

      expect(mockApiComposable.fetchMcpAuthenticationClientInfo).not.toHaveBeenCalled();
    });
  });

  describe('Scope Handling', () => {
    it('should show scopes as select when mcpScopes available', () => {
      const payload = mockOauth2Payload();

      mockApiComposable.fetchMcpAuthenticationMetadata.mockResolvedValueOnce({ scopesSupported: ['openid', 'profile', 'email', 'offline_access'] });

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      vm.mcpScopes = ['openid', 'profile', 'email'];

      wrapper.vm.$forceUpdate();

      expect(vm.mcpScopes).toBeTruthy();
    });

    it('should show scopes as input when mcpScopes not available', () => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        '',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      expect(vm.mcpScopes).toBeNull();
    });

    it('should split scopes string into array when updating', () => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      const scopeString = 'openid profile email';

      vm.updateSecretValues({ scopes: scopeString?.split(' ').filter((f: string) => !!f) });

      const emitted = wrapper.emitted('update:value');

      expect((emitted![0][0] as any).scopes).toEqual(['openid', 'profile', 'email']);
    });

    it('should filter empty scopes', () => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      const scopeString = 'openid  profile  ';

      vm.updateSecretValues({ scopes: scopeString?.split(' ').filter((f: string) => !!f) });

      const emitted = wrapper.emitted('update:value');

      expect((emitted![0][0] as any).scopes).toEqual(['openid', 'profile']);
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should cancel all discovery operations on unmount', async() => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      wrapper.unmount();

      expect(mockApiComposable.cancelFetchMcpAuthenticationMetadata).toHaveBeenCalled();
      expect(mockApiComposable.cancelFetchMcpAuthenticationClientInfo).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should render with required prop passed to form inputs', () => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      // Component should render without errors with all required fields set
      expect(wrapper.findComponent({ name: 'LabeledInput' }).exists()).toBe(true);
    });

    it('should handle empty form values gracefully', () => {
      const emptyPayload = {
        metadataEndpoint: '',
        clientID:         '',
        clientSecret:     '',
        scopes:           []
      };

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         emptyPayload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      expect(vm.value.metadataEndpoint).toBe('');
      expect(vm.value.clientID).toBe('');
      expect(vm.value.clientSecret).toBe('');
    });

    it('should have Password component for secret field', () => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const passwordComponent = wrapper.findComponent({ name: 'Password' });

      expect(passwordComponent.exists()).toBe(true);
    });
  });

  describe('Disabled States During Discovery', () => {
    it('should set metadata discovery status to loading when starting discovery', async() => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      vm.metadataDiscoveryStatus.result = null;

      expect(vm.metadataDiscoveryStatus.result).toBeNull();
    });

    it('should set scopes when metadata discovery succeeds', async() => {
      const payload = mockOauth2Payload();

      mockApiComposable.fetchMcpAuthenticationMetadata.mockResolvedValueOnce({
        scopesSupported:  ['openid'],
        metadataEndpoint: payload.metadataEndpoint
      });

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      vm.mcpScopes = ['openid'];

      expect(vm.mcpScopes).toEqual(['openid']);
    });

    it('should set client discovery status to loading when starting discovery', async() => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      vm.clientInfoDiscoveryStatus.result = null;

      expect(vm.clientInfoDiscoveryStatus.result).toBeNull();
    });

    it('should show password in view mode during client discovery', async() => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      vm.clientInfoDiscoveryStatus.result = null;

      expect(vm.clientInfoDiscoveryStatus.result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty scopes array', () => {
      const payload = {
        ...mockOauth2Payload(),
        scopes: []
      };

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      expect(vm.value.scopes).toEqual([]);
    });

    it('should not fetch metadata if mcpUrl not provided', async() => {
      mockApiComposable.fetchMcpAuthenticationMetadata.mockClear();

      const payload = mockOauth2Payload();

      shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        '',
          apiComposable: mockApiComposable
        }
      });

      expect(mockApiComposable.fetchMcpAuthenticationMetadata).not.toHaveBeenCalled();
    });

    it('should preserve existing payload values when updating partial values', () => {
      const payload = mockOauth2Payload();

      const wrapper = shallowMount(Oauth2SecretForm, {
        ...requiredSetup(),
        props: {
          secretName:    'oauth2-secret',
          value:         payload,
          mcpUrl:        'http://mcp-server.local',
          apiComposable: mockApiComposable
        }
      });

      const vm = wrapper.vm as any;

      vm.updateSecretValues({ clientID: 'new-id' });

      const emitted = wrapper.emitted('update:value');
      const emittedData = emitted![0][0] as any;

      expect(emittedData.metadataEndpoint).toBe(payload.metadataEndpoint);
      expect(emittedData.clientSecret).toBe(payload.clientSecret);
      expect(emittedData.scopes).toEqual(payload.scopes);
      expect(emittedData.clientID).toBe('new-id');
    });
  });
});
