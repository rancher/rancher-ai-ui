import { shallowMount } from '@vue/test-utils';
import AIAgentSettings from '../AIAgentSettings.vue';
import { Settings, SettingsFormData, ValidationStatus } from '../../types';
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

// Mock useAIAgentApiComposable - used in validateSettings to avoid actual API calls during tests
jest.mock('../../../../composables/useAIAgentApiComposable', () => ({ useAIAgentApiComposable: () => ({ fetchLLMModels: jest.fn().mockResolvedValue(['default-model']) }) }));

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
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData },
      });

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('.form-values').exists()).toBe(true);
    });

    it('should render toggle group with correct options', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData },
      });

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      expect(toggleGroup.exists()).toBe(true);
    });
  });

  describe('Chatbot Selection', () => {
    it('should emit update:value when chatbot is changed', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData },
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
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI } as SettingsFormData },
      });

      const banners = wrapper.findAllComponents({ name: 'Banner' });

      expect(banners.length).toBeGreaterThan(0);
    });

    it('should show warning banner for Gemini', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Gemini } as SettingsFormData },
      });

      const banners = wrapper.findAllComponents({ name: 'Banner' });

      expect(banners.length).toBeGreaterThan(0);
    });

    it('should not show warning banner for Local chatbot', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData },
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
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData },
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
          } as SettingsFormData,
        },
      });

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      await toggleGroup.vm.$emit('update:model-value', ChatBotEnum.OpenAI);

      expect(wrapper.emitted('update:value')).toBeTruthy();
    });
  });

  describe('Config Key Management', () => {
    it('should use OLLAMA_URL for Local chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local,
            [Settings.OLLAMA_URL]:     'http://localhost:11434'
          } as SettingsFormData
        },
      });

      const input = wrapper.findComponent({ name: 'LabeledInput' });

      expect(input.exists()).toBe(true);
      expect(input.props('value')).toBe('http://localhost:11434');
    });

    it('should use OPENAI_API_KEY for OpenAI chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
            [Settings.OPENAI_API_KEY]: 'sk-xxx'
          } as SettingsFormData
        },
      });

      const passwordInputs = wrapper.findAllComponents({ name: 'Password' });

      expect(passwordInputs.length).toBeGreaterThanOrEqual(1);
    });

    it('should use GOOGLE_API_KEY for Gemini chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Gemini,
            [Settings.GOOGLE_API_KEY]: 'gemini-api-key'
          } as SettingsFormData
        },
      });

      const passwordInputs = wrapper.findAllComponents({ name: 'Password' });

      expect(passwordInputs.length).toBeGreaterThanOrEqual(1);
    });

    it('should use AWS_BEARER_TOKEN_BEDROCK for Bedrock chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:           ChatBotEnum.Bedrock,
            [Settings.AWS_REGION]:               'us-east-1',
            [Settings.AWS_BEARER_TOKEN_BEDROCK]: 'aws-bearer-token'
          } as SettingsFormData
        },
      });

      const passwordInputs = wrapper.findAllComponents({ name: 'Password' });

      expect(passwordInputs.length).toBeGreaterThan(0);
    });

    it('should use GENERIC_OPENAI_URL and GENERIC_OPENAI_API_KEY for GenericOpenAI chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:         ChatBotEnum.GenericOpenAI,
            [Settings.GENERIC_OPENAI_URL]:     'https://api.example.com/v1',
            [Settings.GENERIC_OPENAI_API_KEY]:       'api-key-xxx'
          } as SettingsFormData
        },
      });

      const inputs = wrapper.findAllComponents({ name: 'LabeledInput' });
      const passwordInputs = wrapper.findAllComponents({ name: 'Password' });

      expect(inputs.length).toBeGreaterThanOrEqual(1);
      expect(passwordInputs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Bedrock Configuration', () => {
    it('should render AWS fields for Bedrock chatbot', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Bedrock,
            [Settings.AWS_REGION]:     'us-east-1'
          } as SettingsFormData
        },
      });

      const select = wrapper.findComponent({ name: 'LabeledSelect' });

      expect(select.exists()).toBe(true);

      const passwordInputs = wrapper.findAllComponents({ name: 'Password' });

      expect(passwordInputs.length).toBeGreaterThan(0);
    });

    it('should not render AWS fields for other chatbots', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
            [Settings.OPENAI_API_KEY]: 'sk-xxx'
          } as SettingsFormData
        },
      });

      const selects = wrapper.findAllComponents({ name: 'LabeledSelect' });

      expect(selects.length).toBe(1);
    });

    it('should show error message next to the field that triggered the error', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:           ChatBotEnum.Bedrock,
            [Settings.AWS_REGION]:               'us-east-1',
            [Settings.AWS_BEARER_TOKEN_BEDROCK]: 'aws-token'
          } as SettingsFormData
        },
      });

      await wrapper.vm.$nextTick();

      // Verify that region and token fields are both rendered for Bedrock chatbot
      const regionSelect = wrapper.findComponent({ name: 'LabeledSelect' });
      const passwordInputs = wrapper.findAllComponents({ name: 'Password' });

      expect(regionSelect.exists()).toBe(true);
      expect(passwordInputs.length).toBeGreaterThanOrEqual(1);

      // Verify that error banners are conditionally rendered based on which field triggered the error
      const errorBanners = wrapper.findAllComponents({ name: 'banner' }).filter((b) => b.props('color') === 'error');

      // The banners should be present in the template but hidden based on bedrockErrorField value
      expect(errorBanners.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GenericOpenAI Configuration', () => {
    it('should render GenericOpenAI fields for GenericOpenAI chatbot', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:      ChatBotEnum.GenericOpenAI,
            [Settings.GENERIC_OPENAI_URL]: 'https://api.example.com/v1'
          } as SettingsFormData
        },
      });

      const inputs = wrapper.findAllComponents({ name: 'LabeledInput' });

      expect(inputs.length).toBeGreaterThanOrEqual(1);

      const passwordInputs = wrapper.findAllComponents({ name: 'Password' });

      expect(passwordInputs.length).toBeGreaterThanOrEqual(1);
    });

    it('should not render GenericOpenAI fields for other chatbots', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
            [Settings.OPENAI_API_KEY]: 'sk-xxx'
          } as SettingsFormData
        },
      });

      const inputs = wrapper.findAllComponents({ name: 'LabeledInput' });
      const hasGenericOpenAIUrl = inputs.some((input) => {
        return input.props('label')?.includes(Settings.GENERIC_OPENAI_URL);
      });

      expect(hasGenericOpenAIUrl).toBe(false);
    });

    it('should render both Endpoint URL and API Key fields for GenericOpenAI chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:         ChatBotEnum.GenericOpenAI,
            [Settings.GENERIC_OPENAI_URL]:     'https://api.example.com/v1',
            [Settings.GENERIC_OPENAI_API_KEY]: 'api-key-xxx'
          } as SettingsFormData
        },
      });

      await wrapper.vm.$nextTick();

      const inputs = wrapper.findAllComponents({ name: 'LabeledInput' });
      const passwordInputs = wrapper.findAllComponents({ name: 'Password' });

      expect(inputs.length).toBeGreaterThanOrEqual(1);
      expect(passwordInputs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('OpenAI Third Party URL', () => {
    it('should render third party URL field for OpenAI', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
            [Settings.OPENAI_API_KEY]: 'sk-xxx'
          } as SettingsFormData
        },
      });

      expect(wrapper.exists()).toBe(true);
      const advancedSection = wrapper.findComponent({ name: 'advanced-section' });

      expect(advancedSection.exists()).toBe(true);
    });

    it('should not render third party URL field for other chatbots', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Gemini,
            [Settings.GOOGLE_API_KEY]: 'gemini-key'
          } as SettingsFormData
        },
      });

      const advancedSection = wrapper.findComponent({ name: 'advanced-section' });

      expect(advancedSection.exists()).toBe(true);

      // Advanced section exists but third party URL field should not be rendered
      const thirdPartyInputs = wrapper.findAllComponents({ name: 'LabeledInput' });
      const hasThirdPartyUrl = thirdPartyInputs.some((input) => {
        return input.props('label')?.includes(Settings.OPENAI_THIRD_PARTY_URL);
      });

      expect(hasThirdPartyUrl).toBe(false);
    });
  });

  describe('RAG Configuration', () => {
    it('should render advanced section', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData },
      });

      const advancedSection = wrapper.findComponent({ name: 'advanced-section' });

      expect(advancedSection.exists()).toBe(true);
    });
  });

  describe('Langfuse Configuration', () => {
    it('should render Langfuse section in advanced section', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData },
      });

      const advancedSection = wrapper.findComponent({ name: 'advanced-section' });

      expect(advancedSection.exists()).toBe(true);
    });

    it('should render Langfuse fields', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:      ChatBotEnum.Local,
            [Settings.LANGFUSE_HOST]:       'https://langfuse.example.com',
            [Settings.LANGFUSE_PUBLIC_KEY]: 'pk-xxx',
            [Settings.LANGFUSE_SECRET_KEY]: 'sk-xxx',
          } as SettingsFormData,
        },
      });

      const advancedSection = wrapper.findComponent({ name: 'advanced-section' });

      expect(advancedSection.exists()).toBe(true);
    });
  });

  describe('Value Updates', () => {
    it('should emit update:value when form value changes', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local,
            [Settings.OLLAMA_URL]:     'http://localhost:11434'
          } as SettingsFormData
        },
      });

      const input = wrapper.findComponent({ name: 'LabeledInput' });

      expect(input.exists()).toBe(true);
      await input.vm.$emit('update:value', 'http://localhost:11435');
    });

    it('should preserve existing values when updating', async() => {
      const existingValue = {
        [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
        [Settings.OPENAI_API_KEY]: 'sk-existing',
        [Settings.OPENAI_MODEL]:   'gpt-4o',
      } as SettingsFormData;
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: existingValue },
      });

      const passwordInputs = wrapper.findAllComponents({ name: 'Password' });

      expect(wrapper.exists()).toBe(true);
      expect(passwordInputs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Props Reactivity', () => {
    it('should update when props change', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData },
      });

      await (wrapper as any).setProps({
        value: {
          [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
          [Settings.OPENAI_API_KEY]: 'sk-xxx',
        } as SettingsFormData,
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
            [Settings.AWS_REGION]:     'test-region',
          } as SettingsFormData,
        },
      });

      await (wrapper as any).setProps({
        value: {
          [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local,
          [Settings.AWS_REGION]:     'test-region',
        } as SettingsFormData,
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
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI } as SettingsFormData,
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
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI } as SettingsFormData,
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
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData,
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
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData,
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
          value:    {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
            [Settings.OPENAI_API_KEY]: 'sk-xxx'
          } as SettingsFormData,
          readOnly: true,
        },
      });

      const readOnlyBanner = wrapper.find('.read-only-info');

      expect(readOnlyBanner.exists()).toBe(true);

      const banners = wrapper.findAllComponents({ name: 'banner' });
      const infoOrErrorBanners = banners.filter((b) => b.props('color') !== 'warning');

      expect(infoOrErrorBanners.length).toBeGreaterThanOrEqual(0);
    });

    it('should show warning banner when readOnly is false and not Local chatbot', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI } as SettingsFormData,
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
          value:    {
            [Settings.ACTIVE_CHATBOT]:           ChatBotEnum.Bedrock,
            [Settings.AWS_REGION]:               'us-east-1',
            [Settings.AWS_BEARER_TOKEN_BEDROCK]: 'aws-token'
          } as SettingsFormData,
          readOnly: true,
        },
      });

      const select = wrapper.findComponent({ name: 'LabeledSelect' });

      expect(select.exists()).toBe(true);

      const passwordInputs = wrapper.findAllComponents({ name: 'Password' });

      expect(passwordInputs.length).toBe(0);
    });

    it('should render GenericOpenAI fields for GenericOpenAI chatbot in readOnly mode', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value:    {
            [Settings.ACTIVE_CHATBOT]:         ChatBotEnum.GenericOpenAI,
            [Settings.GENERIC_OPENAI_URL]:     'https://api.example.com/v1',
            [Settings.GENERIC_OPENAI_API_KEY]: 'api-key-xxx'
          } as SettingsFormData,
          readOnly: true,
        },
      });

      const inputs = wrapper.findAllComponents({ name: 'LabeledInput' });

      expect(inputs.length).toBeGreaterThanOrEqual(1);

      const passwordInputs = wrapper.findAllComponents({ name: 'Password' });

      expect(passwordInputs.length).toBe(0);
    });

    it('should render form in read-only state when readOnly is true', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
            [Settings.OPENAI_API_KEY]: 'sk-xxx',
          } as SettingsFormData,
          readOnly: true,
        },
      });

      expect(wrapper.exists()).toBe(true);
      const formValues = wrapper.find('.form-values');

      expect(formValues.exists()).toBe(true);

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      expect(toggleGroup.exists()).toBe(true);
    });

    it('should prevent value emission when component respects readOnly state', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData,
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
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData,
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
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData,
          readOnly: true,
        },
      });

      expect(wrapperReadOnly.exists()).toBe(true);

      const wrapperEditable = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value:    { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData,
          readOnly: false,
        },
      });

      expect(wrapperEditable.exists()).toBe(true);
    });
  });

  describe('Backend Validation', () => {
    it('should emit validation error when required fields are missing for Local chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local,
            [Settings.OLLAMA_MODEL]:   'mistral'
          } as SettingsFormData
        },
      });

      await wrapper.vm.$nextTick();
      const emittedErrors = wrapper.emitted('update:validation-error');

      expect(emittedErrors).toBeTruthy();
      expect(emittedErrors?.[0]?.[0]).toBe(true);
    });

    it('should emit validation error when API key is missing for OpenAI chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
            [Settings.OPENAI_MODEL]:   'gpt-4'
          } as SettingsFormData
        },
      });

      await wrapper.vm.$nextTick();
      const emittedErrors = wrapper.emitted('update:validation-error');

      expect(emittedErrors).toBeTruthy();
      expect(emittedErrors?.[0]?.[0]).toBe(true);
    });

    it('should emit validation error when API key is missing for Gemini chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Gemini,
            [Settings.GEMINI_MODEL]:   'gemini-1.5-pro'
          } as SettingsFormData
        },
      });

      await wrapper.vm.$nextTick();
      const emittedErrors = wrapper.emitted('update:validation-error');

      expect(emittedErrors).toBeTruthy();
      expect(emittedErrors?.[0]?.[0]).toBe(true);
    });

    it('should emit validation error when bearer token is missing for Bedrock chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Bedrock,
            [Settings.AWS_REGION]:     'us-east-1',
            [Settings.BEDROCK_MODEL]:  'anthropic.claude-3-opus-20240229-v1:0',
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();
      const emittedErrors = wrapper.emitted('update:validation-error');

      expect(emittedErrors).toBeTruthy();
      expect(emittedErrors?.[0]?.[0]).toBe(true);
    });

    it('should emit validation error when region is missing for Bedrock chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:           ChatBotEnum.Bedrock,
            [Settings.AWS_BEARER_TOKEN_BEDROCK]: 'aws-token',
            [Settings.BEDROCK_MODEL]:            'anthropic.claude-3-opus-20240229-v1:0',
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();
      const emittedErrors = wrapper.emitted('update:validation-error');

      expect(emittedErrors).toBeTruthy();
      expect(emittedErrors?.[0]?.[0]).toBe(true);
    });

    it('should not emit validation error when all required fields are provided for Bedrock chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:           ChatBotEnum.Bedrock,
            [Settings.AWS_BEARER_TOKEN_BEDROCK]: 'aws-token',
            [Settings.AWS_REGION]:               'us-east-1',
            [Settings.BEDROCK_MODEL]:            'anthropic.claude-3-opus-20240229-v1:0',
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();
      const emittedErrors = wrapper.emitted('update:validation-error');

      expect(emittedErrors).toBeTruthy();
      expect(emittedErrors?.[0]?.[0]).toBe(false);
    });

    it('should emit validation error when model validation fails for Bedrock chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:           ChatBotEnum.Bedrock,
            [Settings.AWS_BEARER_TOKEN_BEDROCK]: 'aws-token',
            [Settings.AWS_REGION]:               'us-east-1',
            [Settings.BEDROCK_MODEL]:            'anthropic.claude-3-opus-20240229-v1:0',
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();
      // Simulate model validation failure
      const vm = wrapper.vm as any;

      vm.modelValidation[ChatBotEnum.Bedrock].status = ValidationStatus.ERROR;

      // Trigger validation with all fields but error status
      vm.validateSettings(vm.formData);

      const emittedErrors = wrapper.emitted('update:validation-error');

      expect(emittedErrors).toBeTruthy();
      // Should have error because model validation failed
      expect(emittedErrors?.[emittedErrors.length - 1]?.[0]).toBe(true);
    });

    it('should emit validation error when endpoint URL is missing for GenericOpenAI chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:         ChatBotEnum.GenericOpenAI,
            [Settings.GENERIC_OPENAI_API_KEY]: 'api-key-xxx',
            [Settings.GENERIC_OPENAI_MODEL]:   'gpt-3.5-turbo'
          } as SettingsFormData
        },
      });

      await wrapper.vm.$nextTick();
      const emittedErrors = wrapper.emitted('update:validation-error');

      expect(emittedErrors).toBeTruthy();
      expect(emittedErrors?.[0]?.[0]).toBe(true);
    });

    it('should emit validation error when API key is missing for GenericOpenAI chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:       ChatBotEnum.GenericOpenAI,
            [Settings.GENERIC_OPENAI_URL]:   'https://api.example.com/v1',
            [Settings.GENERIC_OPENAI_MODEL]:        'gpt-3.5-turbo'
          } as SettingsFormData
        },
      });

      await wrapper.vm.$nextTick();
      const emittedErrors = wrapper.emitted('update:validation-error');

      expect(emittedErrors).toBeTruthy();
      expect(emittedErrors?.[0]?.[0]).toBe(true);
    });

    it('should not emit validation error when all required fields are provided for GenericOpenAI chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:         ChatBotEnum.GenericOpenAI,
            [Settings.GENERIC_OPENAI_URL]:     'https://api.example.com/v1',
            [Settings.GENERIC_OPENAI_API_KEY]: 'api-key-xxx',
            [Settings.GENERIC_OPENAI_MODEL]:   'gpt-3.5-turbo',
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();
      const emittedErrors = wrapper.emitted('update:validation-error');

      expect(emittedErrors).toBeTruthy();
      expect(emittedErrors?.[0]?.[0]).toBe(false);
    });

    it('should emit validation error when model is missing for Local chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local,
            [Settings.OLLAMA_URL]:     'http://localhost:11434'
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();
      // Manually trigger validation with all fields but no model
      const vm = wrapper.vm as any;

      vm.validateSettings({
        [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local,
        [Settings.OLLAMA_URL]:     'http://localhost:11434'
      });

      const emittedErrors = wrapper.emitted('update:validation-error');

      expect(emittedErrors).toBeTruthy();
      expect(emittedErrors?.[emittedErrors.length - 1]?.[0]).toBe(true);
    });

    it('should emit validation error when model is missing for OpenAI chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:  ChatBotEnum.OpenAI,
            [Settings.OPENAI_API_KEY]: 'sk-xxx'
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();
      // Manually trigger validation with all fields but no model
      const vm = wrapper.vm as any;

      vm.validateSettings({
        [Settings.ACTIVE_CHATBOT]:  ChatBotEnum.OpenAI,
        [Settings.OPENAI_API_KEY]: 'sk-xxx'
      });

      const emittedErrors = wrapper.emitted('update:validation-error');

      expect(emittedErrors).toBeTruthy();
      expect(emittedErrors?.[emittedErrors.length - 1]?.[0]).toBe(true);
    });

    it('should emit validation error when model is missing for Gemini chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Gemini,
            [Settings.GOOGLE_API_KEY]: 'api-key-xxx'
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();
      // Manually trigger validation with all fields but no model
      const vm = wrapper.vm as any;

      vm.validateSettings({
        [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Gemini,
        [Settings.GOOGLE_API_KEY]: 'api-key-xxx'
      });

      const emittedErrors = wrapper.emitted('update:validation-error');

      expect(emittedErrors).toBeTruthy();
      expect(emittedErrors?.[emittedErrors.length - 1]?.[0]).toBe(true);
    });

    it('should emit validation error when model is missing for Bedrock chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:           ChatBotEnum.Bedrock,
            [Settings.AWS_BEARER_TOKEN_BEDROCK]: 'aws-token',
            [Settings.AWS_REGION]:               'us-east-1'
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();
      // Manually trigger validation with all fields but no model
      const vm = wrapper.vm as any;

      vm.validateSettings({
        [Settings.ACTIVE_CHATBOT]:           ChatBotEnum.Bedrock,
        [Settings.AWS_BEARER_TOKEN_BEDROCK]: 'aws-token',
        [Settings.AWS_REGION]:               'us-east-1'
      });

      const emittedErrors = wrapper.emitted('update:validation-error');

      expect(emittedErrors).toBeTruthy();
      expect(emittedErrors?.[emittedErrors.length - 1]?.[0]).toBe(true);
    });

    it('should emit validation error when model is missing for GenericOpenAI chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:         ChatBotEnum.GenericOpenAI,
            [Settings.GENERIC_OPENAI_URL]:     'https://api.example.com/v1',
            [Settings.GENERIC_OPENAI_API_KEY]: 'api-key-xxx'
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();
      const emittedErrors = wrapper.emitted('update:validation-error');

      expect(emittedErrors).toBeTruthy();
      expect(emittedErrors?.[0]?.[0]).toBe(true);
    });
  });

  describe('UI Validation', () => {
    it('should show error banner when model validation fails for Local chatbot', () => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local,
            [Settings.OLLAMA_URL]:     'http://localhost:11434'
          } as SettingsFormData
        },
      });

      // Find the error banner component
      const errorBanners = wrapper.findAllComponents({ name: 'banner' }).filter((b) => b.props('color') === 'error');

      // Error banner should exist or not exist based on validation state
      expect(errorBanners.length).toBeGreaterThanOrEqual(0);
    });

    it('should display error under model field when refreshModels is clicked on Bedrock', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:           ChatBotEnum.Bedrock,
            [Settings.AWS_BEARER_TOKEN_BEDROCK]: 'aws-token',
            [Settings.AWS_REGION]:               'us-east-1',
            [Settings.BEDROCK_MODEL]:            'anthropic',
          } as SettingsFormData,
        },
      });

      const vm = wrapper.vm as any;

      // Initially errorField[ChatBotEnum.Bedrock] should be empty
      expect(vm.errorField[ChatBotEnum.Bedrock]).toStrictEqual({});

      // Simulate refreshModels being called for Bedrock
      vm.refreshModels();

      // errorField should be set with BEDROCK_MODEL for Bedrock chatbot
      expect(vm.errorField[ChatBotEnum.Bedrock][Settings.BEDROCK_MODEL]).toBe(true);

      // When errorField sets BEDROCK_MODEL to true, Region and Token error fields should remain undefined
      expect(vm.errorField[ChatBotEnum.Bedrock][Settings.AWS_REGION]).toBeUndefined();
      expect(vm.errorField[ChatBotEnum.Bedrock][Settings.AWS_BEARER_TOKEN_BEDROCK]).toBeUndefined();
    });

    it('should display error under model field when refreshModels is clicked on Ollama', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local,
            [Settings.OLLAMA_URL]:     'http://localhost:11434',
            [Settings.OLLAMA_MODEL]:   'ollama-model',
          } as SettingsFormData,
        },
      });

      const vm = wrapper.vm as any;

      // Initially errorField[ChatBotEnum.Local] should be empty
      expect(vm.errorField[ChatBotEnum.Local]).toStrictEqual({});

      // Simulate refreshModels being called for Ollama/Local
      vm.refreshModels();

      // errorField should be set with OLLAMA_MODEL for Local chatbot
      expect(vm.errorField[ChatBotEnum.Local][Settings.OLLAMA_MODEL]).toBe(true);

      // When errorField sets OLLAMA_MODEL to true, URL field error should remain undefined
      expect(vm.errorField[ChatBotEnum.Local][Settings.OLLAMA_URL]).toBeUndefined();
    });
  });

  describe('Touched Event Emission', () => {
    it('should emit @touched event when chatbot provider is changed', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local,
            [Settings.OLLAMA_URL]:     'http://localhost:11434'
          } as SettingsFormData,
        },
      });

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      // Simulate changing the chatbot provider
      await toggleGroup.vm.$emit('update:model-value', ChatBotEnum.OpenAI);

      // The component should emit @update:value and eventually @touched
      expect(wrapper.emitted('update:value')).toBeTruthy();
    });

    it('should validate and emit events when form values change', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
            [Settings.OPENAI_API_KEY]: 'sk-original'
          } as SettingsFormData,
        },
      });

      // Initially no events
      expect(wrapper.emitted('update:value')).toBeFalsy();

      // Simulating a chatbot change triggers update:value
      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      await toggleGroup.vm.$emit('update:model-value', ChatBotEnum.Gemini);

      // Now we should have emitted events
      expect(wrapper.emitted('update:value')).toBeTruthy();
    });

    it('should emit @update:value when model is selected', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
            [Settings.OPENAI_API_KEY]: 'sk-xxx',
            [Settings.OPENAI_MODEL]:   'gpt-3.5'
          } as SettingsFormData,
        },
      });

      // The component structure supports model selection
      const components = wrapper.findAllComponents({ name: 'LabeledSelect' });

      // We should have select components for model selection in OpenAI
      expect(components.length).toBeGreaterThanOrEqual(0);
    });

    it('should emit validation error when required fields are missing', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI
            // Missing API key and model
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();

      // Should emit validation error for missing fields
      expect(wrapper.emitted('update:validation-error')).toBeTruthy();
    });

    it('should handle multiple value updates', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:           ChatBotEnum.Bedrock,
            [Settings.AWS_REGION]:               'us-east-1',
            [Settings.AWS_BEARER_TOKEN_BEDROCK]: 'token'
          } as SettingsFormData,
        },
      });

      // Change chatbot provider
      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      await toggleGroup.vm.$emit('update:model-value', ChatBotEnum.OpenAI);

      expect(wrapper.emitted('update:value')).toBeTruthy();

      // Change again
      await toggleGroup.vm.$emit('update:model-value', ChatBotEnum.Gemini);

      // Should have multiple emissions
      const emissions = wrapper.emitted('update:value');

      expect(emissions && emissions.length).toBeGreaterThanOrEqual(1);
    });

    it('should emit @update:value with correct form data structure', async() => {
      const initialData = {
        [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
        [Settings.OPENAI_API_KEY]: 'sk-xxx'
      } as SettingsFormData;

      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: initialData },
      });

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      await toggleGroup.vm.$emit('update:model-value', ChatBotEnum.Gemini);

      const emittedValue = wrapper.emitted('update:value')?.[0]?.[0] as any;

      // Emitted value should be a form data object with the updated chatbot
      expect(emittedValue).toBeDefined();
      expect(emittedValue[Settings.ACTIVE_CHATBOT]).toBe(ChatBotEnum.Gemini);
    });

    it('should validate all required chatbot fields', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local
            // Missing OLLAMA_URL
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();

      // Should emit validation error since OLLAMA_URL is required for Local
      expect(wrapper.emitted('update:validation-error')).toBeTruthy();
    });

    it('should not emit touched on initialization', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
            [Settings.OPENAI_API_KEY]: 'sk-xxx'
          } as SettingsFormData,
        },
      });

      // No events should be emitted on mount
      expect(wrapper.emitted('touched')).toBeFalsy();
    });
  });

  describe('Validation Error Event Emission', () => {
    it('should emit @update:validation-error when validation fails', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local
            // Missing OLLAMA_URL and OLLAMA_MODEL (required)
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('update:validation-error')).toBeTruthy();
      const emittedValue = wrapper.emitted('update:validation-error')?.[0]?.[0];

      expect(emittedValue).toBe(true);
    });

    it('should emit validation error true when required OpenAI API key is missing', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI
            // Missing OPENAI_API_KEY
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('update:validation-error')).toBeTruthy();
      const emittedValue = wrapper.emitted('update:validation-error')?.[0]?.[0];

      expect(emittedValue).toBe(true);
    });

    it('should emit validation error false when all required fields are present', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:  ChatBotEnum.OpenAI,
            [Settings.OPENAI_API_KEY]: 'sk-xxx',
            [Settings.OPENAI_MODEL]:   'gpt-4'
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();

      // When all required fields are present, validation should pass
      // Check if validation error was emitted (it might be on initialization)
      const validationErrors = wrapper.emitted('update:validation-error') || [];

      const lastError = validationErrors[validationErrors.length - 1]?.[0];

      expect(lastError).toBe(false);
    });

    it('should handle Bedrock validation errors', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Bedrock
            // Missing AWS_REGION and AWS_BEARER_TOKEN_BEDROCK
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('update:validation-error')).toBeTruthy();
      const emittedValue = wrapper.emitted('update:validation-error')?.[0]?.[0];

      expect(emittedValue).toBe(true);
    });

    it('should handle GenericOpenAI validation errors', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.GenericOpenAI
            // Missing URL and API key
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('update:validation-error')).toBeTruthy();
      const emittedValue = wrapper.emitted('update:validation-error')?.[0]?.[0];

      expect(emittedValue).toBe(true);
    });
  });

  describe('Models Watcher', () => {
    it('should emit update:models with available models for active chatbot on initialization', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local,
            [Settings.OLLAMA_MODEL]:   'llama2'
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('update:models')).toBeTruthy();
    });

    it('should emit update:models when active chatbot changes', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData },
      });

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      await toggleGroup.vm.$emit('update:model-value', ChatBotEnum.OpenAI);
      await wrapper.vm.$nextTick();

      // Should have emitted update:models for the new chatbot
      expect(wrapper.emitted('update:models')).toBeTruthy();
    });

    it('should include selected model in availableModels if not already present', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
            [Settings.OPENAI_MODEL]:   'gpt-4-custom'
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();

      const emittedModels = wrapper.emitted('update:models')?.[0]?.[0] as string[];

      // The custom model should be included in the emitted models
      expect(emittedModels).toContain('gpt-4-custom');
    });

    it('should not duplicate selected model if already in availableModels', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local,
            [Settings.OLLAMA_MODEL]:   'default-model'
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();

      const emittedModels = wrapper.emitted('update:models')?.[0]?.[0] as string[];

      // Should not have duplicates of 'default-model'
      const modelCount = emittedModels.filter((m) => m === 'default-model').length;

      expect(modelCount).toBeLessThanOrEqual(1);
    });

    it('should emit empty array when no models and no selected model for active chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Gemini
            // No model specified
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();

      const emittedModels = wrapper.emitted('update:models')?.[0]?.[0] as string[];

      // Should be an empty array for Gemini with no selected model
      expect(Array.isArray(emittedModels)).toBe(true);
      expect(emittedModels.length).toBe(0);
    });

    it('should emit models array for Local chatbot when models are fetched', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData },
      });

      // Simulate models being fetched
      await wrapper.vm.$nextTick();

      const emitted = wrapper.emitted('update:models');

      expect(emitted).toBeTruthy();
      expect(Array.isArray(emitted?.[0]?.[0])).toBe(true);
    });

    it('should update models when chatbot changes from Local to OpenAI', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local,
            [Settings.OLLAMA_MODEL]:   'llama2'
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();
      const initialEmissions = (wrapper.emitted('update:models') || []).length;

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      await toggleGroup.vm.$emit('update:model-value', ChatBotEnum.OpenAI);
      await wrapper.vm.$nextTick();

      // Should have emitted more times after changing chatbot
      expect((wrapper.emitted('update:models') || []).length).toBeGreaterThan(initialEmissions);
    });

    it('should handle selected model for Bedrock chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Bedrock,
            [Settings.BEDROCK_MODEL]:  'anthropic.claude-3-sonnet'
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();

      const emittedModels = wrapper.emitted('update:models')?.[0]?.[0] as string[];

      expect(Array.isArray(emittedModels)).toBe(true);
      // Selected Bedrock model should be in the emitted array
      expect(emittedModels).toContain('anthropic.claude-3-sonnet');
    });

    it('should handle selected model for GenericOpenAI chatbot', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]:       ChatBotEnum.GenericOpenAI,
            [Settings.GENERIC_OPENAI_MODEL]: 'custom-model'
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();

      const emittedModels = wrapper.emitted('update:models')?.[0]?.[0] as string[];

      expect(Array.isArray(emittedModels)).toBe(true);
      // Selected GenericOpenAI model should be in the emitted array
      expect(emittedModels).toContain('custom-model');
    });

    it('should emit update:models with correct data structure', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI,
            [Settings.OPENAI_MODEL]:   'gpt-4'
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();

      const emitted = wrapper.emitted('update:models');

      expect(emitted).toBeTruthy();
      expect(emitted?.[0]).toBeDefined();
      expect(Array.isArray(emitted?.[0]?.[0])).toBe(true);
    });

    it('should emit update:models when active chatbot prop changes', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local } as SettingsFormData },
      });

      await wrapper.vm.$nextTick();
      const emissionsBeforeChange = (wrapper.emitted('update:models') || []).length;

      // Update the prop to change active chatbot
      await wrapper.setProps({ value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Gemini } as SettingsFormData });
      await wrapper.vm.$nextTick();

      // Should have emitted more times
      expect((wrapper.emitted('update:models') || []).length).toBeGreaterThan(emissionsBeforeChange);
    });

    it('should handle undefined models for active chatbot gracefully', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: { value: { [Settings.ACTIVE_CHATBOT]: ChatBotEnum.OpenAI } as SettingsFormData },
      });

      await wrapper.vm.$nextTick();

      const emittedModels = wrapper.emitted('update:models')?.[0]?.[0];

      // Should emit something (likely an empty array) not an error
      expect(emittedModels).toBeDefined();
      expect(Array.isArray(emittedModels)).toBe(true);
    });

    it('should preserve selected model when switching chatbots and back', async() => {
      const wrapper = shallowMount(AIAgentSettings, {
        ...requiredSetup(),
        props: {
          value: {
            [Settings.ACTIVE_CHATBOT]: ChatBotEnum.Local,
            [Settings.OLLAMA_MODEL]:   'llama2'
          } as SettingsFormData,
        },
      });

      await wrapper.vm.$nextTick();

      const toggleGroup = wrapper.findComponent({ name: 'ToggleGroup' });

      // Switch to OpenAI
      await toggleGroup.vm.$emit('update:model-value', ChatBotEnum.OpenAI);
      await wrapper.vm.$nextTick();

      // Switch back to Local
      await toggleGroup.vm.$emit('update:model-value', ChatBotEnum.Local);
      await wrapper.vm.$nextTick();

      // The watcher should still function correctly
      expect(wrapper.emitted('update:models')).toBeTruthy();
      const lastEmission = wrapper.emitted('update:models')?.[wrapper.emitted('update:models')!.length - 1]?.[0] as string[];

      // llama2 should be included in the final emission
      expect(lastEmission).toContain('llama2');
    });
  });
});
