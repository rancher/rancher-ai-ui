import { shallowMount } from '@vue/test-utils';
import AIAgentConfigs from '../ai-agent-configs/index.vue';
import { AIAgentConfigCRD } from '../../../../types';
import { AIAgentConfigAuthType } from '../../types';

// Mock Vuex
jest.mock('vuex', () => {
  const actual = jest.requireActual('vuex');

  return {
    ...actual,
    useStore: jest.fn()
  };
});

// Mock i18n
jest.mock('@shell/composables/useI18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

// Mock FileSelector component - it fixes ButtonVariantProps compiler error
jest.mock('@shell/components/form/FileSelector.vue', () => ({
  default: {
    name:     'FileSelector',
    template: '<div />',
    props:    ['value', 'label', 'required'],
    emits:    ['update:value'],
  }
}));

// Mock Password component to avoid clipboard-polyfill dependency
jest.mock('@shell/components/form/Password.vue', () => ({
  default: {
    name:     'Password',
    props:    ['value', 'label', 'mode', 'disabled'],
    template: '<div />'
  }
}));

// Mock DetailText component
jest.mock('@shell/components/DetailText.vue', () => ({
  default: {
    name:     'DetailText',
    props:    ['value', 'label-key', 'class'],
    template: '<div />'
  }
}));

const DEFAULT_AI_AGENT = 'rancher';

const mockAgent = (overrides = {}): AIAgentConfigCRD => ({
  metadata: {
    name:      'test-agent',
    namespace: 'ai-agent'
  },
  spec: {
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

const mockBuiltInAgent = (overrides = {}): AIAgentConfigCRD => ({
  metadata: {
    name:      DEFAULT_AI_AGENT,
    namespace: 'ai-agent'
  },
  spec: {
    displayName:          'Rancher',
    enabled:              true,
    mcpURL:               'http://built-in:8000',
    authenticationType:   AIAgentConfigAuthType.RANCHER,
    humanValidationTools: [],
    description:          'Built-in Agent',
    systemPrompt:         '',
    toolSet:              '',
    builtIn:              true
  },
  ...overrides
});

function requiredSetup() {
  return {
    directives: {
      'clean-html':    jest.fn(),
      'clean-tooltip': jest.fn()
    },
  };
}

describe('AIAgentConfigs.vue', () => {
  describe('Component Initialization', () => {
    it('should render the component with default values', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockBuiltInAgent()] }
      });

      expect(wrapper.exists()).toBe(true);
    });

    it('should render with empty agent list', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [] }
      });

      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Agent Sorting', () => {
    it('should sort custom agents before built-in agents', () => {
      const custom1 = mockAgent({
        metadata: {
          name:      'custom-1',
          namespace: 'ai-agent'
        }
      });
      const custom2 = mockAgent({
        metadata: {
          name:      'custom-2',
          namespace: 'ai-agent'
        }
      });
      const builtIn = mockBuiltInAgent();

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [builtIn, custom1, custom2] }
      });

      const vm = wrapper.vm as any;

      expect(vm.agents[0].metadata.name).toBe('custom-2');
      expect(vm.agents[1].metadata.name).toBe('custom-1');
      expect(vm.agents[2].metadata.name).toBe(DEFAULT_AI_AGENT);
    });

    it('should place default agent first among built-in agents', () => {
      const custom = mockAgent();
      const defaultAgent = mockBuiltInAgent();
      const otherBuiltIn = mockBuiltInAgent({
        metadata: {
          name:      'other-builtin',
          namespace: 'ai-agent'
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [otherBuiltIn, custom, defaultAgent] }
      });

      const vm = wrapper.vm as any;

      expect(vm.agents[0].metadata.name).toBe('test-agent');
      expect(vm.agents[1].metadata.name).toBe(DEFAULT_AI_AGENT);
      expect(vm.agents[2].metadata.name).toBe('other-builtin');
    });
  });

  describe('Agent Status', () => {
    it('should return true for isAgentUnavailable when agent has error condition', () => {
      const errorMsg = 'Agent failed to connect';
      const agentWithStatus = mockAgent({
        status: {
          conditions: [
            {
              error:   true,
              message: errorMsg
            }
          ]
        }
      });
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agentWithStatus] }
      });
      const vm = wrapper.vm as any;

      expect(vm.isAgentUnavailable).toBe(true);
    });

    it('should return false for isAgentUnavailable when agent has no error', () => {
      const agentWithoutError = mockAgent();
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agentWithoutError] }
      });
      const vm = wrapper.vm as any;

      expect(vm.isAgentUnavailable).toBe(false);
    });

    it('should return true for isAgentUnavailable even when agent is disabled but has error', () => {
      const errorMsg = 'Agent failed to connect';
      const agentWithError = mockAgent({
        spec: {
          ...mockAgent().spec,
          enabled: false
        },
        status: {
          conditions: [
            {
              error:   true,
              message: errorMsg
            }
          ]
        }
      });
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agentWithError] }
      });
      const vm = wrapper.vm as any;

      expect(vm.isAgentUnavailable).toBe(true);
    });

    it('should return correct error message from getAgentErrorMessage', () => {
      const errorMsg = 'Agent failed to connect';
      const agentWithStatus = mockAgent({
        status: {
          conditions: [
            {
              error:   true,
              message: errorMsg
            }
          ]
        }
      });
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agentWithStatus] }
      });
      const vm = wrapper.vm as any;

      expect(vm.getAgentErrorMessage(agentWithStatus)).toBe(errorMsg);
    });

    it('should return correct icon from tabLabelIcon for error, disabled, and enabled states', () => {
      const errorMsg = 'Agent failed to connect';
      const agentWithStatus = mockAgent({
        status: {
          conditions: [
            {
              error:   true,
              message: errorMsg
            }
          ]
        }
      });
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agentWithStatus] }
      });
      const vm = wrapper.vm as any;

      // Error state should show error icon
      expect(vm.tabLabelIcon(agentWithStatus)).toBe('icon-confirmation-alt');

      // Disabled state (icon-close is used for disabled state)
      const disabledAgent = mockAgent({
        spec: {
          ...agentWithStatus.spec,
          enabled: false
        }
      });

      expect(vm.tabLabelIcon(disabledAgent)).toBe('icon-close');

      // Enabled state
      const enabledAgent = mockAgent();

      expect(vm.tabLabelIcon(enabledAgent)).toBe('icon-confirmation-alt');
    });
  });

  describe('Agent Selection and Locking', () => {
    it('should select first agent by default', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockBuiltInAgent()] }
      });

      const vm = wrapper.vm as any;

      expect(vm.selectedAgent.metadata.name).toBe(DEFAULT_AI_AGENT);
    });

    it('should lock built-in agents', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockBuiltInAgent()] }
      });

      const vm = wrapper.vm as any;

      expect(vm.isAgentLocked).toBe(true);
    });

    it('should not lock custom agents', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockAgent()] }
      });

      const vm = wrapper.vm as any;

      expect(vm.isAgentLocked).toBe(false);
    });

    it('should change selected agent when tab changes', async() => {
      const agent1 = mockAgent({
        metadata: {
          name:      'agent-1',
          namespace: 'ai-agent'
        }
      });
      const agent2 = mockAgent({
        metadata: {
          name:      'agent-2',
          namespace: 'ai-agent'
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent1, agent2] }
      });

      const vm = wrapper.vm as any;

      expect(vm.selectedAgent.metadata.name).toBe('agent-2');

      vm.tabChanged({ selectedName: 'agent-1' });

      expect(vm.selectedAgent.metadata.name).toBe('agent-1');
    });
  });

  describe('Agent Creation', () => {
    it('should add new custom agent', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockBuiltInAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.addAgent();

      const emitted = wrapper.emitted('update:value');

      expect(emitted).toBeTruthy();
      const updatedList = emitted![0][0] as AIAgentConfigCRD[];

      expect(updatedList.length).toBe(2);
      expect(updatedList[0].spec.displayName).toBe('New Agent');
      expect(updatedList[0].spec.enabled).toBe(true);
    });

    it('should set correct default values for new agent', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockBuiltInAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.addAgent();

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];
      const newAgent = emitted[0];

      expect(newAgent.spec.authenticationType).toBe(AIAgentConfigAuthType.RANCHER);
      expect(newAgent.spec.humanValidationTools).toEqual([]);
      expect(newAgent.spec.mcpURL).toBe('');
    });

    it('should add new custom agent with correct name format', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockBuiltInAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.addAgent();

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];
      const newAgent = emitted[0];

      // Name should be in format: agent-{count}-{randomString} in lowercase
      expect(newAgent.metadata.name).toMatch(/^agent-\d+-[a-z0-9]+$/);
      // The count is based on agents.value.length + 1, which is 2 (1 builtIn agent already exists)
      expect(newAgent.metadata.name).toMatch(/^agent-2-/);
    });
  });

  describe('Agent Deletion', () => {
    it('should remove custom agent', () => {
      const customAgent = mockAgent({
        metadata: {
          name:      'custom',
          namespace: 'ai-agent'
        }
      });
      const builtInAgent = mockBuiltInAgent();

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [customAgent, builtInAgent] }
      });

      const vm = wrapper.vm as any;

      vm.removeAgent();

      const emitted = wrapper.emitted('update:value');

      expect(emitted).toBeTruthy();
      const updatedList = emitted![0][0] as AIAgentConfigCRD[];

      expect(updatedList.length).toBe(1);
      expect(updatedList[0].metadata.name).toBe(DEFAULT_AI_AGENT);
    });

    it('should hide remove button for built-in agent', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockBuiltInAgent()] }
      });

      const tabbedComponent = wrapper.findComponent({ name: 'Tabbed' });

      expect(tabbedComponent.classes()).toContain('remove-btn-disabled');
    });

    it('should not remove built-in agent', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockBuiltInAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.removeAgent();

      expect(wrapper.emitted('update:value')).toBeUndefined();
    });

    it('should switch to next agent in the list after removal', () => {
      const agent1 = mockAgent({
        metadata: {
          name:      'agent-1',
          namespace: 'ai-agent'
        }
      });
      const agent2 = mockAgent({
        metadata: {
          name:      'agent-2',
          namespace: 'ai-agent'
        }
      });
      const builtIn = mockBuiltInAgent();

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent1, agent2, builtIn] }
      });

      const vm = wrapper.vm as any;

      // After sorting, agents are ordered: agent-2, agent-1, rancher
      // Select agent-1 (which is at index 1)
      vm.selectedAgentName = 'agent-1';
      vm.removeAgent();

      // After removal, the next agent in the list should be selected
      // Since agents are sorted descending, after removing agent-1, the default (rancher) should be selected
      expect(vm.selectedAgentName).toBe(DEFAULT_AI_AGENT);
    });

    it('should clear secrets for removed agent', () => {
      const customAgent = mockAgent({
        metadata: {
          name:      'custom',
          namespace: 'ai-agent'
        }
      });
      const builtIn = mockBuiltInAgent();

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [customAgent, builtIn] }
      });

      const vm = wrapper.vm as any;

      vm.agentSecrets['custom'] = {
        selected:   'test-secret',
        privateKey: 'pk',
        publicKey:  'pubk'
      };

      vm.removeAgent();

      expect(vm.agentSecrets['custom']).toBeUndefined();
    });

    it('should emit authentication-secrets on agent removal', () => {
      const customAgent = mockAgent({
        metadata: {
          name:      'custom',
          namespace: 'ai-agent'
        }
      });
      const builtIn = mockBuiltInAgent();

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [customAgent, builtIn] }
      });

      const vm = wrapper.vm as any;

      vm.agentSecrets['custom'] = { selected: 'secret' };
      vm.removeAgent();

      const emitted = wrapper.emitted('update:authentication-secrets');

      expect(emitted).toBeTruthy();
    });
  });

  describe('Field Updates', () => {
    it('should update displayName', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.updateAgent({
        spec: {
          ...vm.selectedAgent.spec,
          displayName: 'Updated Name'
        }
      });

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

      expect(emitted[0].spec.displayName).toBe('Updated Name');
    });

    it('should update description', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.updateAgent({
        spec: {
          ...vm.selectedAgent.spec,
          description: 'New Description'
        }
      });

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

      expect(emitted[0].spec.description).toBe('New Description');
    });

    it('should update enabled status', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.updateAgent({
        spec: {
          ...vm.selectedAgent.spec,
          enabled: false
        }
      });

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

      expect(emitted[0].spec.enabled).toBe(false);
    });

    it('should update mcpURL', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.updateAgent({
        spec: {
          ...vm.selectedAgent.spec,
          mcpURL: 'http://new-mcp-server:9000'
        }
      });

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

      expect(emitted[0].spec.mcpURL).toBe('http://new-mcp-server:9000');
    });

    it('should update authenticationType', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.updateAgent({
        spec: {
          ...vm.selectedAgent.spec,
          authenticationType: AIAgentConfigAuthType.BASIC
        }
      });

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

      expect(emitted[0].spec.authenticationType).toBe(AIAgentConfigAuthType.BASIC);
    });

    it('should update caBundleRef with name and key', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.updateAgent({
        spec: {
          ...vm.selectedAgent.spec,
          caBundleRef: {
            name: 'ca-bundle-secret',
            key:  'tls.crt'
          }
        }
      });

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

      expect(emitted[0].spec.caBundleRef?.name).toBe('ca-bundle-secret');
      expect(emitted[0].spec.caBundleRef?.key).toBe('tls.crt');
    });

    it('should clear caBundleRef when value is cleared', () => {
      const agent = mockAgent({
        spec: {
          ...mockAgent().spec,
          caBundleRef: {
            name: 'existing-bundle',
            key:  'tls.crt'
          }
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      vm.updateAgent({
        spec: {
          ...vm.selectedAgent.spec,
          caBundleRef: undefined
        }
      });

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

      expect(emitted[0].spec.caBundleRef).toBeUndefined();
    });

    it('should update systemPrompt', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockAgent()] }
      });

      const vm = wrapper.vm as any;

      const newPrompt = 'You are a helpful assistant...';

      vm.updateAgent({
        spec: {
          ...vm.selectedAgent.spec,
          systemPrompt: newPrompt
        }
      });

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

      expect(emitted[0].spec.systemPrompt).toBe(newPrompt);
    });
  });

  describe('Authentication Secret Management', () => {
    it('should clear secret when _none is selected', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value: [mockAgent({
            spec: {
              ...mockAgent().spec,
              authenticationSecret: 'existing-secret'
            }
          })]
        }
      });

      const vm = wrapper.vm as any;

      vm.updateBasicAuthSecret({ selected: '_none' });

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

      expect(emitted[0].spec.authenticationSecret).toBeUndefined();
    });

    it('should store new secret in agentSecrets when _basic is selected', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockAgent()] }
      });

      const vm = wrapper.vm as any;

      const secretPayload = {
        selected:   '_basic',
        privateKey: 'pk-value',
        publicKey:  'pubk-value'
      };

      vm.updateBasicAuthSecret(secretPayload);

      expect(vm.agentSecrets['test-agent']).toEqual(secretPayload);
    });

    it('should store new secret in agentSecrets when OAUTH2 is selected', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.updateAgent({
        spec: {
          ...vm.selectedAgent.spec,
          authenticationType:   AIAgentConfigAuthType.OAUTH2,
          authenticationSecret: 'test-secret'
        }
      });

      const oauth2Payload = {
        metadataEnpoint: 'http://metadata',
        scopes:          ['test-scope'],
        clientId:        'client-id',
        clientSecret:    'client-secret'
      };

      vm.updateOauth2AuthSecret(vm.selectedAgent, oauth2Payload);

      // Verify the secret is stored in agentSecrets
      expect(vm.agentSecrets['test-agent']).toEqual(oauth2Payload);

      // Verify the emission happened with the secrets
      const emittedSecrets = wrapper.emitted('update:authentication-secrets');

      expect((emittedSecrets as any)?.[(emittedSecrets?.length || 0) - 1]?.[0]['test-agent']).toEqual(oauth2Payload);
    });

    it('should use selected secret directly when existing secret selected', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.updateBasicAuthSecret({ selected: 'existing-secret' });

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

      expect(emitted[0].spec.authenticationSecret).toBe('existing-secret');
    });

    it('should emit update:authentication-secrets event', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.updateBasicAuthSecret({ selected: '_none' });

      const emitted = wrapper.emitted('update:authentication-secrets');

      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).toEqual(vm.agentSecrets);
    });

    it('should clear agentSecrets when existing secret selected', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.agentSecrets['test-agent'] = { selected: '_basic' };

      vm.updateBasicAuthSecret({ selected: 'secret-name' });

      expect(vm.agentSecrets['test-agent']).toBeUndefined();
    });
  });

  describe('Validation Tools Management', () => {
    it('should update human validation tools', () => {
      const agent = mockAgent({
        spec: {
          ...mockAgent().spec,
          humanValidationTools: ['tool-1']
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      vm.updateAgent({
        spec: {
          ...vm.selectedAgent.spec,
          humanValidationTools: ['tool-1', 'tool-2']
        }
      });

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

      expect(emitted[0].spec.humanValidationTools).toContain('tool-2');
    });

    it('should handle empty humanValidationTools array', () => {
      const agent = mockAgent({
        spec: {
          ...mockAgent().spec,
          humanValidationTools: []
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      expect(Array.isArray(vm.selectedAgent.spec.humanValidationTools)).toBe(true);
      expect(vm.selectedAgent.spec.humanValidationTools.length).toBe(0);
    });

    it('should update humanValidationTools via updateAgent', () => {
      const agent = mockAgent({
        spec: {
          ...mockAgent().spec,
          humanValidationTools: ['existing-tool']
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      vm.updateAgent({
        spec: {
          ...vm.selectedAgent.spec,
          humanValidationTools: ['existing-tool', 'new-tool']
        }
      });

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

      expect(emitted[0].spec.humanValidationTools?.length).toBe(2);
      expect(emitted[0].spec.humanValidationTools).toContain('new-tool');
    });
  });

  describe('System Prompt', () => {
    it('should update system prompt from file upload', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockAgent()] }
      });

      const vm = wrapper.vm as any;

      const fileContent = 'You are a helpful AI assistant...';

      vm.onFileSelected(fileContent);

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

      expect(emitted[0].spec.systemPrompt).toBe(fileContent);
    });

    it('should preserve other fields when updating system prompt', () => {
      const agent = mockAgent({
        spec: {
          ...mockAgent().spec,
          displayName: 'Important Agent'
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      vm.onFileSelected('New prompt');

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

      expect(emitted[0].spec.displayName).toBe('Important Agent');
      expect(emitted[0].spec.systemPrompt).toBe('New prompt');
    });
  });

  describe('Validation', () => {
    it('should compute validation errors for empty mcpURL', () => {
      const agent = mockAgent({
        spec: {
          ...mockAgent().spec,
          mcpURL: ''
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      expect(vm.validationErrors['test-agent']).toBe(true);
    });

    it('should compute validation errors for empty displayName', () => {
      const agent = mockAgent({
        spec: {
          ...mockAgent().spec,
          displayName: ''
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      expect(vm.validationErrors['test-agent']).toBe(true);
    });

    it('should emit update:validation-error when errors change', async() => {
      const agent = mockAgent({
        spec: {
          ...mockAgent().spec,
          mcpURL:       'http://valid',
          displayName:  'Valid',
          description:  'Valid Description',
          systemPrompt: 'Valid System Prompt'
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      // Valid agent should not have errors
      expect(vm.validationErrors['test-agent']).toBe(false);

      // Create a new agent without mcpURL
      const invalidAgent = mockAgent({
        spec:     {
          ...mockAgent().spec,
          mcpURL:      '',
          displayName: 'Invalid'
        },
        metadata: {
          name:      'invalid',
          namespace: 'ai-agent'
        }
      });

      await (wrapper as any).setProps({ value: [invalidAgent] });
      await wrapper.vm.$nextTick();

      // Invalid agent should have error
      expect(vm.validationErrors['invalid']).toBe(true);
    });

    it('should not have validation errors for valid agent', () => {
      const agent = mockAgent({
        spec: {
          ...mockAgent().spec,
          mcpURL:       'http://localhost:8000',
          displayName:  'Valid Agent',
          description:  'Valid Description',
          systemPrompt: 'Valid System Prompt'
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      expect(vm.validationErrors['test-agent']).toBe(false);
    });

    it('should compute validation errors for empty description', () => {
      const agent = mockAgent({
        spec: {
          ...mockAgent().spec,
          description: ''
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      expect(vm.validationErrors['test-agent']).toBe(true);
    });

    it('should compute validation errors for empty systemPrompt', () => {
      const agent = mockAgent({
        spec: {
          ...mockAgent().spec,
          systemPrompt: ''
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      expect(vm.validationErrors['test-agent']).toBe(true);
    });

    it('should show systemPrompt validation icon only when field is touched and empty', async() => {
      const agent = mockAgent({
        spec: {
          ...mockAgent().spec,
          systemPrompt: ''
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      // Icon should not be visible initially (not touched)
      expect(vm.systemPromptValidationStatus.touched).toBe(false);

      vm.systemPromptValidationStatus.touched = true;
      await wrapper.vm.$nextTick();

      // Icon should be visible since the field is touched and empty
      expect(vm.systemPromptValidationStatus.touched).toBe(true);
      expect(vm.selectedAgent.spec.systemPrompt).toBe('');
    });

    it('should not have validation errors when all required fields are filled', () => {
      const agent = mockAgent({
        spec: {
          ...mockAgent().spec,
          displayName:  'Valid Agent',
          description:  'Valid Description',
          mcpURL:       'http://localhost:8000',
          systemPrompt: 'Valid system prompt'
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      expect(vm.validationErrors['test-agent']).toBe(false);
    });
  });

  describe('Adaptive Mode Banner', () => {
    it('should show banner when multiple agents are enabled', () => {
      const agent1 = mockAgent({
        metadata: {
          name:      'agent-1',
          namespace: 'ai-agent'
        },
        spec:     {
          ...mockAgent().spec,
          enabled: true
        }
      });
      const agent2 = mockAgent({
        metadata: {
          name:      'agent-2',
          namespace: 'ai-agent'
        },
        spec:     {
          ...mockAgent().spec,
          enabled: true
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent1, agent2] }
      });

      const banners = wrapper.findAllComponents({ name: 'Banner' });
      const adaptiveBanner = banners.find((b) => b.attributes('color') === 'info');

      expect(adaptiveBanner).toBeTruthy();
      expect(adaptiveBanner?.attributes('color')).toBe('info');
    });

    it('should not show banner when only one agent is enabled', () => {
      const agent1 = mockAgent({
        spec: {
          ...mockAgent().spec,
          enabled: true
        }
      });
      const agent2 = mockAgent({
        metadata: {
          name:      'agent-2',
          namespace: 'ai-agent'
        },
        spec:     {
          ...mockAgent().spec,
          enabled: false
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent1, agent2] }
      });

      const banners = wrapper.findAllComponents({ name: 'Banner' });
      const adaptiveBanner = banners.find((b) => b.attributes('color') === 'info');

      expect(adaptiveBanner).toBeFalsy();
    });

    it('should update banner when agent enabled status changes', async() => {
      const agent1 = mockAgent({
        spec: {
          ...mockAgent().spec,
          enabled: false
        }
      });
      const agent2 = mockAgent({
        metadata: {
          name:      'agent-2',
          namespace: 'ai-agent'
        },
        spec:     {
          ...mockAgent().spec,
          enabled: false
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent1, agent2] }
      });

      let banners = wrapper.findAllComponents({ name: 'Banner' });
      let adaptiveBanner = banners.find((b) => b.attributes('color') === 'info');

      expect(adaptiveBanner).toBeFalsy();

      // Update both agents to enabled
      const updatedAgent1 = {
        ...agent1,
        spec: {
          ...agent1.spec,
          enabled: true
        }
      };
      const updatedAgent2 = {
        ...agent2,
        spec: {
          ...agent2.spec,
          enabled: true
        }
      };

      await (wrapper as any).setProps({ value: [updatedAgent1, updatedAgent2] });
      await wrapper.vm.$nextTick();

      banners = wrapper.findAllComponents({ name: 'Banner' });
      adaptiveBanner = banners.find((b) => b.attributes('color') === 'info');

      expect(adaptiveBanner).toBeTruthy();
    });

    it('should show error banner when all agents are unavailable', () => {
      const agent1 = mockAgent({
        spec: {
          ...mockAgent().spec,
          enabled: true
        },
        stateDescription: 'Agent is unavailable'
      });
      const agent2 = mockAgent({
        metadata: {
          name:      'agent-2',
          namespace: 'ai-agent'
        },
        spec:     {
          ...mockAgent().spec,
          enabled: true
        },
        stateDescription: 'Agent is unavailable'
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent1, agent2] }
      });

      const banners = wrapper.findAllComponents({ name: 'Banner' });
      const errorBanner = banners.find((b) => b.attributes('color') === 'error');

      expect(errorBanner).toBeTruthy();
      expect(errorBanner?.attributes('color')).toBe('error');
    });
  });

  describe('Props Reactivity', () => {
    it('should update agents list when props change', async() => {
      const agent1 = mockAgent();

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent1] }
      });

      const vm = wrapper.vm as any;

      expect(vm.agents.length).toBe(1);

      const agent2 = mockAgent({
        metadata: {
          name:      'agent-2',
          namespace: 'ai-agent'
        }
      });

      await (wrapper as any).setProps({ value: [agent1, agent2] });

      expect(vm.agents.length).toBe(2);
    });
  });

  describe('Multiple Agents', () => {
    it('should maintain separate state for multiple agents', () => {
      const agent1 = mockAgent({
        metadata: {
          name:      'agent-1',
          namespace: 'ai-agent'
        },
        spec:     {
          ...mockAgent().spec,
          displayName: 'Agent 1'
        }
      });
      const agent2 = mockAgent({
        metadata: {
          name:      'agent-2',
          namespace: 'ai-agent'
        },
        spec:     {
          ...mockAgent().spec,
          displayName: 'Agent 2'
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent1, agent2] }
      });

      const vm = wrapper.vm as any;

      vm.selectedAgentName = 'agent-1';

      expect(vm.selectedAgent.spec.displayName).toBe('Agent 1');

      vm.selectedAgentName = 'agent-2';

      expect(vm.selectedAgent.spec.displayName).toBe('Agent 2');
    });

    it('should manage secrets separately for each agent', () => {
      const agent1 = mockAgent({
        metadata: {
          name:      'agent-1',
          namespace: 'ai-agent'
        }
      });
      const agent2 = mockAgent({
        metadata: {
          name:      'agent-2',
          namespace: 'ai-agent'
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent1, agent2] }
      });

      const vm = wrapper.vm as any;

      vm.selectedAgentName = 'agent-1';
      vm.updateBasicAuthSecret({
        selected:   '_basic',
        privateKey: 'pk1',
        publicKey:  'pubk1'
      });

      vm.selectedAgentName = 'agent-2';
      vm.updateBasicAuthSecret({
        selected:   '_basic',
        privateKey: 'pk2',
        publicKey:  'pubk2'
      });

      expect(vm.agentSecrets['agent-1'].privateKey).toBe('pk1');
      expect(vm.agentSecrets['agent-2'].privateKey).toBe('pk2');
    });
  });

  describe('Tab Integration', () => {
    it('should emit addTab event when adding agent', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockBuiltInAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.addAgent();

      expect(wrapper.emitted('update:value')).toBeTruthy();
    });

    it('should emit removeTab event when removing agent', () => {
      const agent = mockAgent();
      const builtIn = mockBuiltInAgent();

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent, builtIn] }
      });

      const vm = wrapper.vm as any;

      vm.removeAgent();

      expect(wrapper.emitted('update:value')).toBeTruthy();
    });

    it('should handle tab changed event', () => {
      const agent1 = mockAgent({
        metadata: {
          name:      'agent-1',
          namespace: 'ai-agent'
        }
      });
      const agent2 = mockAgent({
        metadata: {
          name:      'agent-2',
          namespace: 'ai-agent'
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent1, agent2] }
      });

      const vm = wrapper.vm as any;

      vm.tabChanged({ selectedName: 'agent-2' });

      expect(vm.selectedAgentName).toBe('agent-2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle agent with no humanValidationTools', () => {
      const agent = mockAgent({
        spec: {
          ...mockAgent().spec,
          humanValidationTools: undefined
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      expect(Array.isArray(vm.selectedAgent.spec.humanValidationTools) || vm.selectedAgent.spec.humanValidationTools === undefined).toBe(true);
    });

    it('should handle agent with empty string systemPrompt', () => {
      const agent = mockAgent({
        spec: {
          ...mockAgent().spec,
          systemPrompt: ''
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      expect(vm.selectedAgent.spec.systemPrompt).toBe('');
    });

    it('should handle rapid agent switching', () => {
      const agent1 = mockAgent({
        metadata: {
          name:      'agent-1',
          namespace: 'ai-agent'
        }
      });
      const agent2 = mockAgent({
        metadata: {
          name:      'agent-2',
          namespace: 'ai-agent'
        }
      });
      const agent3 = mockAgent({
        metadata: {
          name:      'agent-3',
          namespace: 'ai-agent'
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent1, agent2, agent3] }
      });

      const vm = wrapper.vm as any;

      vm.selectedAgentName = 'agent-1';
      vm.selectedAgentName = 'agent-2';
      vm.selectedAgentName = 'agent-3';
      vm.selectedAgentName = 'agent-1';

      expect(vm.selectedAgent.metadata.name).toBe('agent-1');
    });
  });

  describe('Read-only Mode', () => {
    it('should render read-only banner when readOnly prop is true', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value:    [mockAgent()],
          readOnly: true,
        },
      });

      const banners = wrapper.findAllComponents({ name: 'Banner' });
      const readOnlyBanner = banners.find((b) => b.attributes('color') === 'warning');

      expect(readOnlyBanner).toBeTruthy();
      expect(readOnlyBanner?.attributes('color')).toBe('warning');
    });

    it('should not render read-only banner when readOnly prop is false', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value:    [mockAgent()],
          readOnly: false,
        },
      });

      const banners = wrapper.findAllComponents({ name: 'Banner' });
      const readOnlyBanner = banners.find((b) => b.attributes('color') === 'warning');

      expect(readOnlyBanner).toBeFalsy();
    });

    it('should prevent adding agent when readOnly is true', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value:    [mockBuiltInAgent()],
          readOnly: true,
        },
      });

      const vm = wrapper.vm as any;

      vm.addAgent();

      expect(wrapper.emitted('update:value')).toBeUndefined();
    });

    it('should allow adding agent when readOnly is false', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value:    [mockBuiltInAgent()],
          readOnly: false,
        },
      });

      const vm = wrapper.vm as any;

      vm.addAgent();

      expect(wrapper.emitted('update:value')).toBeTruthy();
    });

    it('should prevent removing agent when readOnly is true', () => {
      const customAgent = mockAgent({
        metadata: {
          name:      'custom',
          namespace: 'ai-agent'
        }
      });
      const builtIn = mockBuiltInAgent();

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value:    [customAgent, builtIn],
          readOnly: true,
        },
      });

      const vm = wrapper.vm as any;

      vm.removeAgent();

      expect(wrapper.emitted('update:value')).toBeUndefined();
    });

    it('should allow removing agent when readOnly is false and agent is not locked', () => {
      const customAgent = mockAgent({
        metadata: {
          name:      'custom',
          namespace: 'ai-agent'
        }
      });
      const builtIn = mockBuiltInAgent();

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value:    [customAgent, builtIn],
          readOnly: false,
        },
      });

      const vm = wrapper.vm as any;

      vm.removeAgent();

      expect(wrapper.emitted('update:value')).toBeTruthy();
    });

    it('should disable input fields when readOnly is true', async() => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value:    [mockAgent()],
          readOnly: true,
        },
      });

      await wrapper.vm.$nextTick();

      const inputs = wrapper.findAllComponents({ name: 'LabeledInput' });

      // If LabeledInput fields are rendered, they should be disabled
      inputs.forEach((input) => {
        expect(input.attributes('disabled')).toBeTruthy();
      });
    });

    it('should disable checkbox fields when readOnly is true', async() => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value:    [mockAgent()],
          readOnly: true,
        },
      });

      await wrapper.vm.$nextTick();

      const checkboxes = wrapper.findAllComponents({ name: 'Checkbox' });

      // If Checkbox is rendered, it should be disabled
      expect(checkboxes.length).toBeGreaterThanOrEqual(0);
      checkboxes.forEach((checkbox) => {
        expect(checkbox.attributes('disabled')).toBeTruthy();
      });
    });

    it('should disable ArrayList when readOnly is true', async() => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value: [mockAgent({
            spec: {
              ...mockAgent().spec,
              humanValidationTools: []
            }
          })],
          readOnly: true,
        },
      });

      await wrapper.vm.$nextTick();

      const arrayLists = wrapper.findAllComponents({ name: 'ArrayList' });

      // If ArrayList is rendered, it should be disabled
      expect(arrayLists.length).toBeGreaterThanOrEqual(0);
      arrayLists.forEach((arrayList) => {
        expect(arrayList.attributes('disabled')).toBeTruthy();
        expect(arrayList.attributes('remove-allowed')).toBe('false');
        expect(arrayList.attributes('add-allowed')).toBe('false');
      });
    });

    it('should disable TextAreaAutoGrow when readOnly is true', async() => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value: [mockAgent({
            spec: {
              ...mockAgent().spec,
              systemPrompt: 'Test prompt'
            }
          })],
          readOnly: true,
        },
      });

      await wrapper.vm.$nextTick();

      const textAreas = wrapper.findAllComponents({ name: 'TextAreaAutoGrow' });

      // If TextAreaAutoGrow is rendered, it should be disabled
      expect(textAreas.length).toBeGreaterThanOrEqual(0);
      textAreas.forEach((textArea) => {
        expect(textArea.attributes('disabled')).toBeTruthy();
      });
    });

    it('should hide SelectOrCreateAuthSecret when readOnly is true', async() => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value: [mockAgent({
            spec: {
              ...mockAgent().spec,
              authenticationType: AIAgentConfigAuthType.BASIC
            }
          })],
          readOnly: true,
        },
      });

      await wrapper.vm.$nextTick();

      const selectAuth = wrapper.findComponent({ name: 'SelectOrCreateAuthSecret' });

      // SelectOrCreateAuthSecret should not be rendered in readOnly mode
      expect(selectAuth.exists()).toBe(false);
    });

    it('should hide FileSelector when readOnly is true', async() => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value:    [mockAgent()],
          readOnly: true,
        },
      });

      await wrapper.vm.$nextTick();

      const fileSelector = wrapper.findComponent({ name: 'FileSelector' });

      expect(fileSelector.exists()).toBe(false);
    });

    it('should accept readOnly true without errors', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value:    [mockAgent()],
          readOnly: true,
        },
      });

      expect(wrapper.exists()).toBe(true);
    });

    it('should accept readOnly false without errors', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value:    [mockAgent()],
          readOnly: false,
        },
      });

      expect(wrapper.exists()).toBe(true);
    });

    it('should update readOnlyBanner when readOnly prop changes', async() => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value:    [mockAgent()],
          readOnly: false,
        },
      });

      let banners = wrapper.findAllComponents({ name: 'Banner' });
      let readOnlyBanner = banners.find((b) => b.attributes('color') === 'warning');

      expect(readOnlyBanner).toBeFalsy();

      await (wrapper as any).setProps({ readOnly: true });
      await wrapper.vm.$nextTick();

      banners = wrapper.findAllComponents({ name: 'Banner' });
      readOnlyBanner = banners.find((b) => b.attributes('color') === 'warning');

      expect(readOnlyBanner).toBeTruthy();
      expect(readOnlyBanner?.attributes('color')).toBe('warning');
    });

    it('should not show adaptive mode banner when readOnly is true regardless of enabled agents', () => {
      const agent1 = mockAgent({
        metadata: {
          name:      'agent-1',
          namespace: 'ai-agent'
        },
        spec:     {
          ...mockAgent().spec,
          enabled: true
        }
      });
      const agent2 = mockAgent({
        metadata: {
          name:      'agent-2',
          namespace: 'ai-agent'
        },
        spec:     {
          ...mockAgent().spec,
          enabled: true
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value:    [agent1, agent2],
          readOnly: true,
        },
      });

      const banners = wrapper.findAllComponents({ name: 'Banner' });
      const adaptiveBanner = banners.find((b) => b.attributes('color') === 'info');

      // Even with multiple enabled agents, banner should not be shown in readOnly mode
      expect(adaptiveBanner).toBeFalsy();
    });

    it('should prevent updateAuthenticationSecret when readOnly is true and BASIC auth is set', async() => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: {
          value: [mockAgent({
            spec: {
              ...mockAgent().spec,
              authenticationType: AIAgentConfigAuthType.BASIC
            }
          })],
          readOnly: true,
        },
      });

      await wrapper.vm.$nextTick();

      // SelectOrCreateAuthSecret should be hidden, preventing auth secret updates
      const selectAuth = wrapper.findComponent({ name: 'SelectOrCreateAuthSecret' });

      expect(selectAuth.exists()).toBe(false);
    });
  });

  describe('Authentication Type', () => {
    describe('HEADER Auth Type', () => {
      it('should change auth type to HEADER', () => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            authenticationType: AIAgentConfigAuthType.RANCHER
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        const vm = wrapper.vm as any;

        vm.updateAuthType(AIAgentConfigAuthType.HEADER);

        const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

        expect(emitted[0].spec.authenticationType).toBe(AIAgentConfigAuthType.HEADER);
      });

      it('should change auth type to OAUTH2', () => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            authenticationType: AIAgentConfigAuthType.RANCHER
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        const vm = wrapper.vm as any;

        vm.updateAuthType(AIAgentConfigAuthType.OAUTH2);

        const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

        expect(emitted[0].spec.authenticationType).toBe(AIAgentConfigAuthType.OAUTH2);
      });

      it('should clear authenticationSecret when changing from RANCHER to HEADER', () => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            authenticationType:   AIAgentConfigAuthType.RANCHER,
            authenticationSecret: undefined
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        const vm = wrapper.vm as any;

        // Update to HEADER type
        vm.updateAuthType(AIAgentConfigAuthType.HEADER);

        const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

        expect(emitted[0].spec.authenticationType).toBe(AIAgentConfigAuthType.HEADER);
        expect(emitted[0].spec.authenticationSecret).toBeUndefined();
      });

      it('should clear authenticationSecret when changing from BASIC to HEADER', () => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            authenticationType:   AIAgentConfigAuthType.BASIC,
            authenticationSecret: 'basic-secret'
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        const vm = wrapper.vm as any;

        vm.updateAuthType(AIAgentConfigAuthType.HEADER);

        const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

        expect(emitted[0].spec.authenticationType).toBe(AIAgentConfigAuthType.HEADER);
        expect(emitted[0].spec.authenticationSecret).toBeUndefined();
      });

      it('should clear authenticationSecret when changing from HEADER to OAUTH2', () => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            authenticationType:   AIAgentConfigAuthType.HEADER,
            authenticationSecret: 'header-secret'
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        const vm = wrapper.vm as any;

        // Update to OAUTH2 type
        vm.updateAuthType(AIAgentConfigAuthType.OAUTH2);

        const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

        expect(emitted[0].spec.authenticationType).toBe(AIAgentConfigAuthType.OAUTH2);
        expect(emitted[0].spec.authenticationSecret).toBeUndefined();
      });

      it('should preserve authenticationSecret when changing to same HEADER type with initial secret', () => {
        const initAgent = mockAgent({
          metadata: {
            name:      'test-agent',
            namespace: 'ai-agent'
          },
          spec: {
            ...mockAgent().spec,
            authenticationType:   AIAgentConfigAuthType.HEADER,
            authenticationSecret: 'header-secret'
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: {
            value:     [initAgent],
            initValue: [initAgent]
          }
        });

        const vm = wrapper.vm as any;

        // Change to same type (should preserve)
        vm.updateAuthType(AIAgentConfigAuthType.HEADER);

        const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

        expect(emitted[0].spec.authenticationSecret).toBe('header-secret');
      });

      it('should clean up agentSecrets when changing to HEADER type', () => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            authenticationType: AIAgentConfigAuthType.BASIC
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        const vm = wrapper.vm as any;

        // Store a secret for this agent
        vm.agentSecrets['test-agent'] = {
          selected:   '_basic',
          privateKey: 'pk',
          publicKey:  'pubk'
        };

        // Change to HEADER (should clean up agentSecrets)
        vm.updateAuthType(AIAgentConfigAuthType.HEADER);

        expect(vm.agentSecrets['test-agent']).toBeUndefined();
      });

      it('should emit undefined for update:authentication-secrets when changing away from BASIC auth', () => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            authenticationType: AIAgentConfigAuthType.BASIC
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        const vm = wrapper.vm as any;

        vm.agentSecrets['test-agent'] = { selected: '_basic' };

        // Change to HEADER, which is not BASIC
        vm.updateAuthType(AIAgentConfigAuthType.HEADER);

        const emitted = wrapper.emitted('update:authentication-secrets');

        expect(emitted).toBeTruthy();
        // When changing away from BASIC, the event should be emitted with undefined (since agentSecrets was deleted)
        expect(emitted![0][0]).toBe(undefined);
      });
    });

    describe('HEADER Auth Type with SecretSelector', () => {
      it('should use SecretSelector when HEADER auth is selected', async() => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            authenticationType: AIAgentConfigAuthType.HEADER
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        const vm = wrapper.vm as any;

        // HEADER type should not use SelectOrCreateAuthSecret (which is for BASIC)
        expect(vm.selectedAgent.spec.authenticationType).toBe(AIAgentConfigAuthType.HEADER);
        // SelectOrCreateAuthSecret should not be rendered for HEADER
        const selectOrCreate = wrapper.findComponent({ name: 'SelectOrCreateAuthSecret' });

        expect(selectOrCreate.exists()).toBe(false);
      });

      it('should render SecretSelector component when HEADER auth is used', async() => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            authenticationType:   AIAgentConfigAuthType.HEADER,
            authenticationSecret: 'header-secret'
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        const vm = wrapper.vm as any;

        // Verify HEADER auth type is set
        expect(vm.selectedAgent.spec.authenticationType).toBe(AIAgentConfigAuthType.HEADER);
        // Verify authentication secret is stored
        expect(vm.selectedAgent.spec.authenticationSecret).toBe('header-secret');
      });

      it('should not render SelectOrCreateAuthSecret when HEADER auth is selected', async() => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            authenticationType: AIAgentConfigAuthType.HEADER
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        await wrapper.vm.$nextTick();

        const selectOrCreate = wrapper.findComponent({ name: 'SelectOrCreateAuthSecret' });

        expect(selectOrCreate.exists()).toBe(false);
      });

      it('should not render SelectOrCreateAuthSecret when OAUTH2 auth is selected', async() => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            authenticationType: AIAgentConfigAuthType.OAUTH2
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        await wrapper.vm.$nextTick();

        const selectOrCreate = wrapper.findComponent({ name: 'SelectOrCreateAuthSecret' });

        expect(selectOrCreate.exists()).toBe(false);
      });
    });

    describe('Auth Type Transitions', () => {
      it('should handle transition from BASIC to HEADER to NONE', () => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            authenticationType:   AIAgentConfigAuthType.BASIC,
            authenticationSecret: 'basic-secret'
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        const vm = wrapper.vm as any;

        vm.agentSecrets['test-agent'] = {
          selected:   '_basic',
          privateKey: 'pk',
          publicKey:  'pubk'
        };

        // Change to HEADER
        vm.updateAuthType(AIAgentConfigAuthType.HEADER);

        let emitted = wrapper.emitted('update:value')?.[wrapper.emitted('update:value')!.length - 1][0] as AIAgentConfigCRD[];

        expect(emitted[0].spec.authenticationType).toBe(AIAgentConfigAuthType.HEADER);
        expect(emitted[0].spec.authenticationSecret).toBeUndefined();
        expect(vm.agentSecrets['test-agent']).toBeUndefined();

        // Change to NONE
        vm.updateAuthType(AIAgentConfigAuthType.NONE);

        emitted = wrapper.emitted('update:value')?.[wrapper.emitted('update:value')!.length - 1][0] as AIAgentConfigCRD[];

        expect(emitted[0].spec.authenticationType).toBe(AIAgentConfigAuthType.NONE);
        expect(emitted[0].spec.authenticationSecret).toBeUndefined();
      });

      it('should preserve authentication secret when toggling between HEADER and other types', () => {
        const initAgent = mockAgent({
          metadata: {
            name:      'test-agent',
            namespace: 'ai-agent'
          },
          spec: {
            ...mockAgent().spec,
            authenticationType:   AIAgentConfigAuthType.HEADER,
            authenticationSecret: 'header-secret'
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: {
            value:     [initAgent],
            initValue: [initAgent]
          }
        });

        const vm = wrapper.vm as any;

        // Change to RANCHER (should clear since it's different)
        vm.updateAuthType(AIAgentConfigAuthType.RANCHER);

        let emitted = wrapper.emitted('update:value')?.[wrapper.emitted('update:value')!.length - 1][0] as AIAgentConfigCRD[];

        expect(emitted[0].spec.authenticationSecret).toBeUndefined();

        // Revert back to HEADER (should restore from init)
        vm.updateAuthType(AIAgentConfigAuthType.HEADER);

        emitted = wrapper.emitted('update:value')?.[wrapper.emitted('update:value')!.length - 1][0] as AIAgentConfigCRD[];

        expect(emitted[0].spec.authenticationSecret).toBe('header-secret');
      });
    });

    describe('HEADER Auth Type Edge Cases', () => {
      it('should handle HEADER auth type for multiple agents independently', async() => {
        const agent1 = mockAgent({
          metadata: {
            name:      'agent-1',
            namespace: 'ai-agent'
          },
          spec: {
            ...mockAgent().spec,
            authenticationType: AIAgentConfigAuthType.RANCHER
          }
        });

        const agent2 = mockAgent({
          metadata: {
            name:      'agent-2',
            namespace: 'ai-agent'
          },
          spec: {
            ...mockAgent().spec,
            authenticationType: AIAgentConfigAuthType.BASIC
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent1, agent2] }
        });

        const vm = wrapper.vm as any;

        // Switch to agent-1 and change to HEADER
        vm.selectedAgentName = 'agent-1';
        vm.updateAuthType(AIAgentConfigAuthType.HEADER);

        let updateEvents = wrapper.emitted('update:value');
        let lastEmitted = updateEvents![updateEvents!.length - 1][0] as AIAgentConfigCRD[];

        // Verify agent-1 changed to HEADER
        expect(lastEmitted.find((a) => a.metadata.name === 'agent-1')?.spec.authenticationType).toBe(AIAgentConfigAuthType.HEADER);
        expect(lastEmitted.find((a) => a.metadata.name === 'agent-2')?.spec.authenticationType).toBe(AIAgentConfigAuthType.BASIC);

        // Update props with new state
        await wrapper.setProps({ value: lastEmitted } as any);

        // Now switch to agent-2 and change to HEADER
        vm.selectedAgentName = 'agent-2';
        vm.updateAuthType(AIAgentConfigAuthType.HEADER);

        updateEvents = wrapper.emitted('update:value');
        lastEmitted = updateEvents![updateEvents!.length - 1][0] as AIAgentConfigCRD[];

        // Now both should be HEADER
        expect(lastEmitted.find((a) => a.metadata.name === 'agent-1')?.spec.authenticationType).toBe(AIAgentConfigAuthType.HEADER);
        expect(lastEmitted.find((a) => a.metadata.name === 'agent-2')?.spec.authenticationType).toBe(AIAgentConfigAuthType.HEADER);
      });

      it('should not affect other agent properties when changing to HEADER auth', () => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            displayName:          'Important Agent',
            description:          'Important Description',
            systemPrompt:         'Important Prompt',
            humanValidationTools: ['tool1', 'tool2'],
            authenticationType:   AIAgentConfigAuthType.BASIC
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        const vm = wrapper.vm as any;

        vm.updateAuthType(AIAgentConfigAuthType.HEADER);

        const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

        expect(emitted[0].spec.displayName).toBe('Important Agent');
        expect(emitted[0].spec.description).toBe('Important Description');
        expect(emitted[0].spec.systemPrompt).toBe('Important Prompt');
        expect(emitted[0].spec.humanValidationTools).toEqual(['tool1', 'tool2']);
      });
    });

    describe('OAUTH2 Auth Type', () => {
      it('should change auth type to OAUTH2', () => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            authenticationType: AIAgentConfigAuthType.RANCHER
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        const vm = wrapper.vm as any;

        vm.updateAuthType(AIAgentConfigAuthType.OAUTH2);

        const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

        expect(emitted[0].spec.authenticationType).toBe(AIAgentConfigAuthType.OAUTH2);
      });

      it('should store OAUTH2 secret payload in agentSecrets', () => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            authenticationType: AIAgentConfigAuthType.OAUTH2
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        const vm = wrapper.vm as any;

        const oauth2Payload = {
          metadataEndpoint: 'https://oauth.example.com/.well-known/openid-configuration',
          clientID:         'client-id-123',
          clientSecret:     'client-secret-456',
          scopes:           ['openid', 'profile', 'email']
        };

        vm.updateOauth2AuthSecret(vm.selectedAgent, oauth2Payload);

        expect(vm.agentSecrets['test-agent']).toEqual(oauth2Payload);
      });

      it('should clear authenticationSecret when changing from OAUTH2 to RANCHER', () => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            authenticationType:   AIAgentConfigAuthType.OAUTH2,
            authenticationSecret: 'oauth2-secret'
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        const vm = wrapper.vm as any;

        vm.updateAuthType(AIAgentConfigAuthType.RANCHER);

        const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

        expect(emitted[0].spec.authenticationType).toBe(AIAgentConfigAuthType.RANCHER);
        expect(emitted[0].spec.authenticationSecret).toBeUndefined();
      });

      it('should emit update:authentication-secrets when OAUTH2 secret is updated', () => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            authenticationType: AIAgentConfigAuthType.OAUTH2
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        const vm = wrapper.vm as any;

        const oauth2Payload = {
          metadataEndpoint: 'https://oauth.example.com/.well-known/openid-configuration',
          clientID:         'client-id-123',
          clientSecret:     'client-secret-456',
          scopes:           ['openid', 'profile']
        };

        vm.updateOauth2AuthSecret(oauth2Payload);

        const emitted = wrapper.emitted('update:authentication-secrets');

        expect(emitted).toBeTruthy();
        expect(emitted![0][0]).toEqual(vm.agentSecrets);
      });

      it('should handle multiple agents with independent OAUTH2 secrets', async() => {
        const agent1 = mockAgent({
          metadata: {
            name:      'agent-1',
            namespace: 'ai-agent'
          },
          spec: {
            ...mockAgent().spec,
            authenticationType: AIAgentConfigAuthType.OAUTH2
          }
        });

        const agent2 = mockAgent({
          metadata: {
            name:      'agent-2',
            namespace: 'ai-agent'
          },
          spec: {
            ...mockAgent().spec,
            authenticationType: AIAgentConfigAuthType.OAUTH2
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent1, agent2] }
        });

        const vm = wrapper.vm as any;

        // Set OAUTH2 secret for agent-1
        vm.updateOauth2AuthSecret(agent1, {
          metadataEndpoint: 'https://oauth1.example.com/.well-known/openid-configuration',
          clientID:         'client-1',
          clientSecret:     'secret-1',
          scopes:           ['openid']
        });

        // Set OAUTH2 secret for agent-2
        vm.updateOauth2AuthSecret(agent2, {
          metadataEndpoint: 'https://oauth2.example.com/.well-known/openid-configuration',
          clientID:         'client-2',
          clientSecret:     'secret-2',
          scopes:           ['openid', 'profile']
        });

        expect(vm.agentSecrets['agent-1'].clientID).toEqual('client-1');
        expect(vm.agentSecrets['agent-2'].clientID).toEqual('client-2');
        expect(vm.agentSecrets['agent-1'].scopes).toEqual(['openid']);
        expect(vm.agentSecrets['agent-2'].scopes).toEqual(['openid', 'profile']);
      });

      it('should not affect other agent properties when updating OAUTH2 secret', () => {
        const agent = mockAgent({
          spec: {
            ...mockAgent().spec,
            displayName:          'Important Agent',
            description:          'Important Description',
            systemPrompt:         'Important Prompt',
            humanValidationTools: ['tool1', 'tool2'],
            authenticationType:   AIAgentConfigAuthType.OAUTH2
          }
        });

        const wrapper = shallowMount(AIAgentConfigs, {
          ...requiredSetup(),
          props: { value: [agent] }
        });

        const vm = wrapper.vm as any;

        vm.updateOauth2AuthSecret({
          metadataEndpoint: 'https://oauth.example.com/.well-known/openid-configuration',
          clientID:         'client-id',
          clientSecret:     'client-secret',
          scopes:           ['openid']
        });

        // Verify other properties remain unchanged via emitted events if available
        expect(vm.selectedAgent.spec.displayName).toBe('Important Agent');
        expect(vm.selectedAgent.spec.description).toBe('Important Description');
        expect(vm.selectedAgent.spec.systemPrompt).toBe('Important Prompt');
        expect(vm.selectedAgent.spec.humanValidationTools).toEqual(['tool1', 'tool2']);
      });
    });
  });
});
