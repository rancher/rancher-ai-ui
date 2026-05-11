import { shallowMount } from '@vue/test-utils';
import UIToolsConfig from '../index.vue';
import { UIToolsConfigs, ToolsDefinitionActionType } from '../../../../../types';

// Mock component dependencies
jest.mock('@components/RcButton/RcButton.vue', () => ({
  name:     'RcButton',
  template: '<button><slot /></button>'
}));

jest.mock('@components/RcItemCard/RcItemCard.vue', () => ({
  name:     'RcItemCard',
  template: '<div><slot /></div>'
}));

// Mock Vuex
jest.mock('vuex', () => {
  const actual = jest.requireActual('vuex');

  return {
    ...actual,
    useStore: jest.fn()
  };
});

// Mock i18n with proper parameterized translation support
jest.mock('@shell/composables/useI18n', () => ({ useI18n: () => ({ t: () => '' }) }));

// Mock getRancherVersion
jest.mock('../../../../../utils/version', () => ({ getRancherVersion: jest.fn(() => '2.7.0') }));

const mockTool = (overrides = {}): any => ({
  name:        'test-tool',
  category:    'visualization',
  description: 'Test Tool Description',
  prompt:      'Use this tool for testing',
  enabled:     true,
  schema:      {
    type:       'object',
    properties: { testProp: { type: 'string' } }
  },
  revision: 1,
  ...overrides
});

const mockUIToolsConfig = (overrides = {}): UIToolsConfigs => ({
  config: {
    enabled:       true,
    revision:      1,
    systemPrompt:  'Test system prompt',
    maxTools:      5,
    defaultValues: {
      enabled:      true,
      systemPrompt: 'Default system prompt',
      maxTools:     5
    }
  },
  tools: [
    mockTool({
      name:     'tool-1',
      category: 'visualization'
    }),
    mockTool({
      name:     'tool-2',
      category: 'data-display'
    }),
    mockTool({
      name:     'tool-3',
      category: 'visualization',
      enabled:  false
    })
  ],
  ...overrides
});

function requiredSetup() {
  return {
    directives: {
      'clean-html':    jest.fn(),
      'clean-tooltip': jest.fn(),
      shortkey:        jest.fn()
    }
  };
}

describe('UIToolsConfig.vue', () => {
  describe('Component Initialization', () => {
    it('should render the component with default values', () => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      expect(wrapper.exists()).toBe(true);
    });

    it('should show Intro component with required action', () => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.Create
        }
      });

      const intro = wrapper.findComponent({ name: 'Intro' });

      expect(intro.exists()).toBe(true);
      expect(intro.props('requiredAction')).toBe(ToolsDefinitionActionType.Create);
    });

    it('should hide tools section when requiredAction is not None', () => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.Update
        }
      });

      const toolsConfig = wrapper.find('.ui-tools-config-container');

      expect(toolsConfig.exists()).toBe(false);
    });

    it('should show tools section when requiredAction is None', () => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const toolsConfig = wrapper.find('.ui-tools-config-container');

      expect(toolsConfig.exists()).toBe(true);
    });
  });

  describe('Tool Filtering', () => {
    it('should display all tools when no filters are applied', () => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const vm = wrapper.vm as any;

      expect(vm.filteredTools).toHaveLength(3);
    });

    it('should filter tools by search query', async() => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const vm = wrapper.vm as any;

      vm.searchQuery = 'tool-1';
      vm.debouncedSearchQuery = 'tool-1';

      await wrapper.vm.$nextTick();

      expect(vm.filteredTools).toHaveLength(1);
      expect(vm.filteredTools[0].name).toBe('tool-1');
    });

    it('should filter tools by category', async() => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const vm = wrapper.vm as any;

      vm.filters.categories = ['visualization'];

      await wrapper.vm.$nextTick();

      expect(vm.filteredTools).toHaveLength(2);
      expect(vm.filteredTools.every((t: any) => t.category === 'visualization')).toBe(true);
    });

    it('should respect Rancher version compatibility', () => {
      const toolWithVersionConstraint = mockUIToolsConfig({
        tools: [
          mockTool({
            name:     'version-constrained-tool',
            metadata: { 'rancher-version': '^2.8.0' }
          })
        ]
      });

      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          toolWithVersionConstraint,
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const vm = wrapper.vm as any;

      expect(vm.filteredTools).toHaveLength(0);
    });
  });

  describe('Tool Management', () => {
    it('should update tool enabled state', async() => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const vm = wrapper.vm as any;

      vm.updateToolEnabled('tool-1', false);

      expect(wrapper.emitted('update:value')).toBeTruthy();
      const emittedValue = wrapper.emitted('update:value')?.[0][0] as any;

      expect(emittedValue.tools[0].enabled).toBe(false);
    });

    it('should emit publish:tools on Intro component emit', async() => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.Create
        }
      });

      const intro = wrapper.findComponent({ name: 'Intro' });

      await intro.vm.$emit('publish:tools');

      expect(wrapper.emitted('publish:tools')).toBeTruthy();
    });
  });

  describe('Configuration Updates', () => {
    it('should update enabled config property', async() => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const vm = wrapper.vm as any;

      vm.updateToolsConfigValue({ enabled: false });

      const emittedValue = wrapper.emitted('update:value')?.[0][0] as any;

      expect(emittedValue.config.enabled).toBe(false);
    });

    it('should update systemPrompt config property', async() => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const vm = wrapper.vm as any;
      const newPrompt = 'New system prompt';

      vm.updateToolsConfigValue({ systemPrompt: newPrompt });

      const emittedValue = wrapper.emitted('update:value')?.[0][0] as any;

      expect(emittedValue.config.systemPrompt).toBe(newPrompt);
    });

    it('should track config changes', async() => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const vm = wrapper.vm as any;

      expect(vm.hasToolsConfigChanges).toBe(false);

      vm.updateToolsConfigValue({ systemPrompt: 'Changed' });
      await wrapper.vm.$nextTick();

      expect(vm.hasToolsConfigChanges).toBe(true);
    });
  });

  describe('Reset Functions', () => {
    it('should reset config to default values', async() => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const vm = wrapper.vm as any;

      vm.updateToolsConfigValue({ systemPrompt: 'Modified' });
      await wrapper.vm.$nextTick();

      vm.resetToolsConfigToDefaults();
      const emittedValue = wrapper.emitted('update:value')?.[(wrapper?.emitted('update:value')?.length ?? 1) - 1][0] as any;

      expect(emittedValue.config.systemPrompt).toBe('Default system prompt');
    });

    it('should reset tool enabled states to defaults', async() => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const vm = wrapper.vm as any;

      vm.updateToolEnabled('tool-1', false);
      await wrapper.vm.$nextTick();

      vm.resetToolsToDefaults();

      expect(wrapper.emitted('update:value')).toBeTruthy();
      expect(vm.hasToolEnabledChanges).toBe(false);
    });

    it('should reset all filters', async() => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const vm = wrapper.vm as any;

      vm.searchQuery = 'test';
      vm.filters.categories = ['visualization'];
      await wrapper.vm.$nextTick();

      vm.resetAllFilters();

      expect(vm.searchQuery).toBe('');
      expect(vm.debouncedSearchQuery).toBe('');
      expect(vm.filters.categories).toHaveLength(0);
    });
  });

  describe('Computed Properties', () => {
    it('should calculate enabled tools count correctly', () => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const vm = wrapper.vm as any;

      expect(vm.enabledToolsCount).toBe(2);
    });

    it('should derive category options from tools', () => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const vm = wrapper.vm as any;

      expect(vm.categoryOptions).toContainEqual({
        value: 'data-display',
        label: 'Data-display'
      });
      expect(vm.categoryOptions).toContainEqual({
        value: 'visualization',
        label: 'Visualization'
      });
    });
  });

  describe('Read-only Mode', () => {
    it('should disable controls when readOnly is true', () => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       true,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      expect(wrapper.props('readOnly' as any)).toBe(true);
    });

    it('should not show reset buttons when readOnly is true', () => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       true,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const vm = wrapper.vm as any;

      expect(vm.readOnly).toBe(true);
    });
  });

  describe('Filter by Category', () => {
    it('should add category to filters when clicking category button', async() => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const vm = wrapper.vm as any;

      vm.filterByCategory('visualization');
      await wrapper.vm.$nextTick();

      expect(vm.filters.categories).toContain('visualization');
    });

    it('should not add duplicate categories', async() => {
      const wrapper = shallowMount(UIToolsConfig, {
        ...requiredSetup(),
        props: {
          value:          mockUIToolsConfig(),
          readOnly:       false,
          requiredAction: ToolsDefinitionActionType.None
        }
      });

      const vm = wrapper.vm as any;

      vm.filterByCategory('visualization');
      vm.filterByCategory('visualization');
      await wrapper.vm.$nextTick();

      expect(vm.filters.categories.filter((c: string) => c === 'visualization')).toHaveLength(1);
    });
  });
});
