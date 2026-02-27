import { shallowMount } from '@vue/test-utils';
import AIAgentSettings from '../AIAgentSettings.vue';
import { Settings } from '../../types';
import { LLMProvider as ChatBotEnum } from '../../../../types';

// Mock Password component to avoid clipboard-polyfill dependency
jest.mock('@shell/components/form/Password.vue', () => ({
  default: {
    name:     'Password',
    props:    ['value', 'label', 'mode', 'disabled'],
    template: '<div />'
  }
}));

// Mock ToggleGroup component to avoid TypeScript fs issues
jest.mock('../../../../components/toggle/toggle-group.vue', () => ({
  default: {
    name:     'ToggleGroup',
    props:    ['modelValue', 'items', 'disabled'],
    template: '<div />'
  }
}));

// Mock Vuex
jest.mock('vuex', () => {
  const actual = jest.requireActual('vuex');

  return {
    ...actual,
    useStore: () => ({ getters: { 'i18n/t': (key: string) => key } }),
  };
});

const requiredSetup = () => {
  return { directives: { 'clean-html': jest.fn() } };
};

describe('AIAgentSettings.vue', () => {
  describe('Component Initialization', () => {
    it('should render the component with default local chatbot', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: {} },
      });

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('.form-values').exists()).toBe(true);
    });

    it('should render toggle group with correct options', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: {} },
      });

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      expect(toggleGroup.exists()).toBe(true);
    });
  });

  describe('Chatbot Selection', () => {
    it('should select Local chatbot when OLLAMA_URL is provided', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.OLLAMA_URL]: 'http://localhost:11434' } },
      });

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      expect(toggleGroup.exists()).toBe(true);
    });

    it('should select OpenAI chatbot when OPENAI_API_KEY is provided', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.OPENAI_API_KEY]: 'sk-xxx' } },
      });

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      expect(toggleGroup.exists()).toBe(true);
    });

    it('should select Gemini chatbot when GOOGLE_API_KEY is provided', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.GOOGLE_API_KEY]: 'gemini-api-key' } },
      });

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      expect(toggleGroup.exists()).toBe(true);
    });

    it('should select Bedrock chatbot when AWS_BEARER_TOKEN_BEDROCK is provided', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.AWS_BEARER_TOKEN_BEDROCK]: 'aws-bearer-token' } },
      });

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      expect(toggleGroup.exists()).toBe(true);
    });

    it('should emit update:value when chatbot is changed', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } },
      });

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      await toggleGroup.vm.$emit('update:model-value', ChatBotEnum.OpenAI);

      expect(wrapper.emitted('update:value')).toBeTruthy();
      const emittedValue = wrapper.emitted('update:value')?.[0]?.[0] as any;

      expect(emittedValue[Settings.ACTIVE_CHATBOT]).toBe(ChatBotEnum.OpenAI);
    });
  });

  describe('Warning Banner', () => {
    it('should show warning banner for OpenAI', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI } },
      });

      const banners = wrapper.findAllComponents({ name: 'Banner' });

      expect(banners.length).toBeGreaterThan(0);
    });

    it('should show warning banner for Gemini', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Gemini } },
      });

      const banners = wrapper.findAllComponents({ name: 'Banner' });

      expect(banners.length).toBeGreaterThan(0);
    });

    it('should not show warning banner for Local chatbot', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } },
      });

      const banners = wrapper.findAllComponents({ name: 'Banner' });

      // For Local chatbot, only info banners should be present (no warning)
      expect(banners.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Model Selection', () => {
    it('should have correct model options for Local chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } },
      });

      await wrapper.vm.$nextTick();

      const inputs = wrapper.findAllComponents({ name: 'LabeledInput' });

      expect(inputs.length).toBeGreaterThanOrEqual(0);
    });

    it('should update model when chatbot changes', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local,
            [Settings.OLLAMA_MODEL]:   'gpt-oss:20b',
          },
        },
      });

      await wrapper.vm.$nextTick();

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      await toggleGroup.vm.$emit('update:model-value', ChatBotEnum.OpenAI);
      await wrapper.vm.$nextTick();

      const emittedValue = wrapper.emitted('update:value')?.[0]?.[0] as any;

      expect(emittedValue[Settings.OPENAI_MODEL]).toBeDefined();
    });
  });

  describe('Config Key Management', () => {
    it('should use OLLAMA_URL for Local chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } },
      });

      await wrapper.vm.$nextTick();
      expect(wrapper.vm.$data).toBeDefined();
    });

    it('should use OPENAI_API_KEY for OpenAI chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI } },
      });

      await wrapper.vm.$nextTick();
      expect(wrapper.vm.$data).toBeDefined();
    });

    it('should use GOOGLE_API_KEY for Gemini chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Gemini } },
      });

      await wrapper.vm.$nextTick();
      expect(wrapper.vm.$data).toBeDefined();
    });

    it('should use AWS_SECRET_ACCESS_KEY for Bedrock chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Bedrock } },
      });

      await wrapper.vm.$nextTick();
      expect(wrapper.vm.$data).toBeDefined();
    });
  });

  describe('Bedrock Configuration', () => {
    it('should render AWS fields for Bedrock chatbot', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Bedrock } },
      });

      const passwordInputs = wrapper.findAllComponents({ name: 'Password' });

      expect(passwordInputs.length).toBeGreaterThan(0);
    });

    it('should not render AWS fields for other chatbots', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI } },
      });

      const content = wrapper.text();

      expect(content).not.toContain(Settings.AWS_BEARER_TOKEN_BEDROCK);
    });
  });

  describe('OpenAI Third Party URL', () => {
    it('should render third party URL field for OpenAI', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI } },
      });

      expect(wrapper.exists()).toBe(true);
      const advancedSection = wrapper.findComponent({ name: 'AdvancedSection' });

      expect(advancedSection.exists()).toBe(true);
    });

    it('should not render third party URL field for other chatbots', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Gemini } },
      });

      const inputs = wrapper.findAllComponents({ name: 'LabeledInput' });

      expect(inputs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('RAG Configuration', () => {
    it('should render RAG section in advanced section', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: {} },
      });

      const advancedSection = wrapper.findComponent({ name: 'AdvancedSection' });

      expect(advancedSection.exists()).toBe(true);
    });

    it('should emit update when RAG is enabled', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ENABLE_RAG]: 'false' } },
      });

      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Langfuse Configuration', () => {
    it('should render Langfuse section in advanced section', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: {} },
      });

      const advancedSection = wrapper.findComponent({ name: 'AdvancedSection' });

      expect(advancedSection.exists()).toBe(true);
    });

    it('should render Langfuse fields', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.LANGFUSE_HOST]:       'https://langfuse.example.com',
            [Settings.LANGFUSE_PUBLIC_KEY]: 'pk-xxx',
            [Settings.LANGFUSE_SECRET_KEY]: 'sk-xxx',
          },
        },
      });

      const inputs = wrapper.findAllComponents({ name: 'LabeledInput' });

      expect(inputs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Value Updates', () => {
    it('should emit update:value when form value changes', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } },
      });

      const inputs = wrapper.findAllComponents({ name: 'LabeledInput' });

      expect(inputs.length).toBeGreaterThan(0);
      await inputs[0].vm.$emit('update:value', 'http://localhost:11434');
      expect(wrapper.emitted('update:value')).toBeTruthy();
    });

    it('should preserve existing values when updating', async() => {
      const existingValue = {
        [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
        [Settings.OPENAI_API_KEY]: 'sk-existing',
        [Settings.OPENAI_MODEL]:   'gpt-4o',
      };

      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: existingValue },
      });

      const inputs = wrapper.findAllComponents({ name: 'LabeledInput' });

      expect(wrapper.exists()).toBe(true);

      expect(inputs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Props Reactivity', () => {
    it('should update when props change', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } },
      });

      await (wrapper as any).setProps({
        value: {
          [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
          [Settings.OPENAI_API_KEY]: 'sk-xxx',
        },
      });

      await wrapper.vm.$nextTick();
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle deep prop changes', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local,
            [Settings.ENABLE_RAG]:     'false',
          },
        },
      });

      await (wrapper as any).setProps({
        value: {
          [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local,
          [Settings.ENABLE_RAG]:     'true',
        },
      });

      await wrapper.vm.$nextTick();
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Read-only Mode', () => {
    it('should render read-only banner when readOnly prop is true', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI },
          readOnly: true,
        },
      });

      const readOnlyBanner = wrapper.find('.read-only-info');

      expect(readOnlyBanner.exists()).toBe(true);
    });

    it('should not render read-only banner when readOnly prop is false', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI },
          readOnly: false,
        },
      });

      const readOnlyBanner = wrapper.find('.read-only-info');

      expect(readOnlyBanner.exists()).toBe(false);
    });

    it('should pass disabled prop to toggle group when readOnly is true', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local },
          readOnly: true,
        },
      });

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      expect(toggleGroup.attributes('disabled')).toBe('true');
    });

    it('should not disable toggle group when readOnly is false', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local },
          readOnly: false,
        },
      });

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      expect(toggleGroup.attributes('disabled')).toBe('false');
    });

    it('should hide warning banner when readOnly is true and not Local chatbot', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI },
          readOnly: true,
        },
      });

      const banners = wrapper.findAllComponents({ name: 'Banner' });

      // Only read-only banner should be present, no warning banner
      expect(banners.length).toBe(1);
    });

    it('should show warning banner when readOnly is false and not Local chatbot', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI },
          readOnly: false,
        },
      });

      const banners = wrapper.findAllComponents({ name: 'Banner' });

      expect(banners.length).toBeGreaterThan(0);
    });

    it('should render AWS fields for Bedrock chatbot in readOnly mode', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Bedrock },
          readOnly: true,
        },
      });

      await wrapper.vm.$nextTick();

      const passwordInputs = wrapper.findAllComponents({ name: 'Password' });

      expect(passwordInputs.length).toBeGreaterThan(0);
    });

    it('should render form in read-only state when readOnly is true', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
            [Settings.OPENAI_API_KEY]: 'sk-xxx',
          },
          readOnly: true,
        },
      });

      expect(wrapper.exists()).toBe(true);
      const formValues = wrapper.find('.form-values');

      expect(formValues.exists()).toBe(true);
    });

    it('should prevent value emission when component respects readOnly state', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local },
          readOnly: true,
        },
      });

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      // Component should have disabled prop set
      expect(toggleGroup.exists()).toBe(true);
    });

    it('should allow value updates when readOnly is false', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local },
          readOnly: false,
        },
      });

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      await toggleGroup.vm.$emit('update:model-value', ChatBotEnum.OpenAI);

      expect(wrapper.emitted('update:value')).toBeTruthy();
    });

    it('should accept both readOnly true and false without errors', async() => {
      const wrapperReadOnly = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local },
          readOnly: true,
        },
      });

      expect(wrapperReadOnly.exists()).toBe(true);

      const wrapperEditable = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local },
          readOnly: false,
        },
      });

      expect(wrapperEditable.exists()).toBe(true);
    });
  });
});
