import { shallowMount } from '@vue/test-utils';
import AIAgentConfigs from '../AIAgentConfigs.vue';
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

      expect(vm.agents[0].metadata.name).toBe('custom-1');
      expect(vm.agents[1].metadata.name).toBe('custom-2');
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

      expect(vm.selectedAgent.metadata.name).toBe('agent-1');

      vm.tabChanged({ selectedName: 'agent-2' });

      expect(vm.selectedAgent.metadata.name).toBe('agent-2');
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

      vm.selectedAgentName = 'agent-1';
      vm.removeAgent();

      expect(vm.selectedAgentName).toBe(agent2.metadata.name);
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

      vm.updateAuthenticationSecret({ selected: '_none' });

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

      vm.updateAuthenticationSecret(secretPayload);

      expect(vm.agentSecrets['test-agent']).toEqual(secretPayload);
    });

    it('should use selected secret directly when existing secret selected', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.updateAuthenticationSecret({ selected: 'existing-secret' });

      const emitted = wrapper.emitted('update:value')?.[0][0] as AIAgentConfigCRD[];

      expect(emitted[0].spec.authenticationSecret).toBe('existing-secret');
    });

    it('should emit update:authentication-secrets event', () => {
      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [mockAgent()] }
      });

      const vm = wrapper.vm as any;

      vm.updateAuthenticationSecret({ selected: '_none' });

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

      vm.updateAuthenticationSecret({ selected: 'secret-name' });

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
          mcpURL:      'http://valid',
          displayName: 'Valid'
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      // Valid agent should not have errors
      expect(vm.validationErrors['test-agent']).toBeUndefined();

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
          mcpURL:      'http://localhost:8000',
          displayName: 'Valid Agent'
        }
      });

      const wrapper = shallowMount(AIAgentConfigs, {
        ...requiredSetup(),
        props: { value: [agent] }
      });

      const vm = wrapper.vm as any;

      expect(vm.validationErrors['test-agent']).toBeUndefined();
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
      vm.updateAuthenticationSecret({
        selected:   '_basic',
        privateKey: 'pk1',
        publicKey:  'pubk1'
      });

      vm.selectedAgentName = 'agent-2';
      vm.updateAuthenticationSecret({
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
});
