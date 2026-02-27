<script setup lang="ts">
import { cloneDeep, debounce } from 'lodash';
import {
  ref, computed,
  onMounted,
} from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import Banner from '@components/Banner/Banner.vue';
import { _EDIT, _VIEW } from '@shell/config/query-params';
import AdvancedSection from '@shell/components/AdvancedSection.vue';
import Password from '@shell/components/form/Password.vue';
import RichTranslation from '@shell/components/RichTranslation.vue';
import formRulesGenerator from '@shell/utils/validators/formRules';
import { LLMProvider as ChatBotEnum } from '../../../types';
import { Settings, SettingsFormData, ValidationStatus } from '../types';
import ToggleGroup from '../../../components/toggle/toggle-group.vue';
import { useChatApiComposable } from '../../../composables/useChatApiComposable';

interface ModelValidationPayload {
  status?: ValidationStatus;
  message?: string;
  touched?: boolean;
}

const validators = (key: string) => formRulesGenerator(t, { key });

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  value: {
    type:     Object as () => SettingsFormData,
    default:  () => ({}),
  },
  readOnly: {
    type:    Boolean,
    default: false,
  }
});

const emit = defineEmits(['update:value', 'update:validation-error']);

const { fetchLLMModels } = useChatApiComposable();

const BEDROCK_REGION_OPTIONS = [
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'eu-north-1',
  'ap-southeast-1',
  'ap-northeast-1',
  'ap-south-1',
  'ca-central-1'
];

const activeChatbotOptions = [
  {
    name:        t(`aiConfig.form.${ Settings.ACTIVE_CHATBOT }.options.${ ChatBotEnum.Local }.name`),
    description: t(`aiConfig.form.${ Settings.ACTIVE_CHATBOT }.options.${ ChatBotEnum.Local }.description`, {}, true),
    icon:        'icon-ollama',
    value:       ChatBotEnum.Local,
  },
  {
    name:        t(`aiConfig.form.${ Settings.ACTIVE_CHATBOT }.options.${ ChatBotEnum.OpenAI }.name`),
    description: t(`aiConfig.form.${ Settings.ACTIVE_CHATBOT }.options.${ ChatBotEnum.OpenAI }.description`, {}, true),
    icon:        'icon-openai',
    value:       ChatBotEnum.OpenAI,
  },
  {
    name:        t(`aiConfig.form.${ Settings.ACTIVE_CHATBOT }.options.${ ChatBotEnum.Gemini }.name`),
    description: t(`aiConfig.form.${ Settings.ACTIVE_CHATBOT }.options.${ ChatBotEnum.Gemini }.description`, {}, true),
    icon:        'icon-gemini',
    value:       ChatBotEnum.Gemini,
  },
  {
    name:        t(`aiConfig.form.${ Settings.ACTIVE_CHATBOT }.options.${ ChatBotEnum.Bedrock }.name`),
    description: t(`aiConfig.form.${ Settings.ACTIVE_CHATBOT }.options.${ ChatBotEnum.Bedrock }.description`, {}, true),
    icon:        'icon-aws-bedrock',
    value:       ChatBotEnum.Bedrock,
  },
];

function getModelKey(chatbot: ChatBotEnum | string) {
  return Settings[`${ chatbot.toUpperCase() }_MODEL` as keyof typeof Settings] as Settings.OLLAMA_MODEL | Settings.GEMINI_MODEL | Settings.OPENAI_MODEL | Settings.BEDROCK_MODEL;
}

const models = ref<Record<ChatBotEnum, string[]>>({} as Record<ChatBotEnum, string[]>);

/**
 * This is used to track the async validation status
 */
const modelValidation = ref([
  ChatBotEnum.Local,
  ChatBotEnum.OpenAI,
  ChatBotEnum.Gemini,
  ChatBotEnum.Bedrock
].reduce((acc, key) => {
  acc[key] = {
    status:  ValidationStatus.VALIDATING,
    message: '',
    touched: false
  };

  return acc;
}, {} as Record<ChatBotEnum, ModelValidationPayload>));

const isModelsAvailable = computed(() => {
  if (isModelsLoading.value) {
    return false;
  }
  // If active chatbot is empty, it means the settings are untouched, so we don't want to disable the model field
  if (!models.value[formData.value[Settings.ACTIVE_CHATBOT] as ChatBotEnum]?.length && !formData.value[getModelKey(formData.value[Settings.ACTIVE_CHATBOT])]) {
    return false;
  }

  return true;
});

const isModelsLoading = computed(() => {
  if (modelValidation.value[formData.value[Settings.ACTIVE_CHATBOT] as ChatBotEnum]?.status === ValidationStatus.VALIDATING) {
    return true;
  }

  return false;
});

const isRequiredRule = (key: string) => {
  const validator = validators(t(key));

  return [
    validator.required,
  ];
};

const chatbotConfigKey = computed<Settings.OLLAMA_URL | Settings.GOOGLE_API_KEY | Settings.OPENAI_API_KEY | Settings.AWS_BEARER_TOKEN_BEDROCK>(() => {
  const activeChatbot = formData.value[Settings.ACTIVE_CHATBOT];

  switch (activeChatbot) {
  case ChatBotEnum.OpenAI:
    return Settings.OPENAI_API_KEY;
  case ChatBotEnum.Gemini:
    return Settings.GOOGLE_API_KEY;
  case ChatBotEnum.Bedrock:
    return Settings.AWS_BEARER_TOKEN_BEDROCK;
  case ChatBotEnum.Local:
  default:
    return Settings.OLLAMA_URL;
  }
});

const formData = computed<SettingsFormData>(() => {
  const activeChatbot = getActiveChatbot(props.value);

  return {
    ...props.value,
    [Settings.ACTIVE_CHATBOT]: activeChatbot,
  };
});

const readOnlyBanner = computed(() => {
  if (props.readOnly) {
    return {
      color: 'warning',
      label: t('aiConfig.form.section.provider.noPermission.edit')
    };
  }

  return null;
});

/**
 * Validates the AI agent settings
 */
function validateSettings(updatedForm: SettingsFormData) {
  let hasError = false;

  const chatbot = updatedForm[Settings.ACTIVE_CHATBOT];

  switch (chatbot) {
  case ChatBotEnum.Local:
    if (!updatedForm[Settings.OLLAMA_URL]) {
      hasError = true;
    }
    break;
  case ChatBotEnum.OpenAI:
    if (!updatedForm[Settings.OPENAI_API_KEY]) {
      hasError = true;
    }
    break;
  case ChatBotEnum.Gemini:
    if (!updatedForm[Settings.GOOGLE_API_KEY]) {
      hasError = true;
    }
    break;
  case ChatBotEnum.Bedrock:
    if (!updatedForm[Settings.AWS_BEARER_TOKEN_BEDROCK] || !updatedForm[Settings.AWS_REGION]) {
      hasError = true;
    }
    break;
  }

  if (!updatedForm[getModelKey(chatbot)]) {
    hasError = true;
  }

  emit('update:validation-error', hasError);
}

/**
 * Updates the model validation state for a specific chatbot.
 * @param key The chatbot provider key to update the validation for
 * @param payload An object containing the new validation status, message, and touched state
 */
function updateModelValidation(key: ChatBotEnum, payload: ModelValidationPayload = {}) {
  const status = payload.status || modelValidation.value[key].status;
  const message = payload.message || '';
  const touched = payload.touched ?? modelValidation.value[key].touched;

  modelValidation.value[key] = {
    status,
    message,
    touched
  };
}

/**
 * Fetches the available models for the specified chatbot.
 * Makes an async API call to fetch the models and updates the model options.
 * @param chatbot The name of the chatbot provider
 */
async function fetchModels(chatbot: ChatBotEnum, options: Record<string, any> = {}) {
  const chatbotOptions: Record<string, any> = {};

  switch (chatbot) {
  case ChatBotEnum.Local:
    chatbotOptions['url'] = options.url === undefined ? formData.value[Settings.OLLAMA_URL] : options.url;
    break;
  case ChatBotEnum.Bedrock:
    chatbotOptions['bearerToken'] = options.bearerToken === undefined ? formData.value[Settings.AWS_BEARER_TOKEN_BEDROCK] : options.bearerToken;
    chatbotOptions['region'] = options.region === undefined ? formData.value[Settings.AWS_REGION] : options.region;
    break;
  }

  models.value[chatbot] = [];
  updateModelValidation(chatbot, { status: ValidationStatus.VALIDATING });

  try {
    models.value[chatbot] = await fetchLLMModels({
      name:    chatbot,
      options: chatbotOptions
    });
    updateModelValidation(chatbot, { status: ValidationStatus.SUCCESS });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      updateModelValidation(chatbot, { status: ValidationStatus.VALIDATING });
    } else {
      updateModelValidation(chatbot, {
        status:  ValidationStatus.ERROR,
        message: (error as Error).message || t('aiConfig.form.validation.failed', {}, true)
      });
      if (modelValidation.value[chatbot].touched) {
        formData.value[getModelKey(chatbot)] = '';
      }
    }
  }

  validateSettings({
    ...formData.value,
    [getModelKey(chatbot)]: models.value[chatbot]?.[0] || formData.value[getModelKey(chatbot)],
  });

  updateFormConfig(chatbot);
}

/**
 * Refreshes the model list for the currently active chatbot.
 * Marks the model field as touched to trigger validation and then fetches the models again.
 */
function refreshModels() {
  updateModelValidation(formData.value[Settings.ACTIVE_CHATBOT] as ChatBotEnum, { touched: true });
  fetchModels(formData.value[Settings.ACTIVE_CHATBOT] as ChatBotEnum);
}

/**
 * Updates the form configuration based on the selected chatbot.
 * Sets the appropriate model for the selected chatbot.
 * @param chatbot The selected chatbot provider ('OpenAI', 'Gemini', 'Bedrock', or 'Local').
 */
const updateFormConfig = (chatbot: ChatBotEnum) => {
  const modelKey = getModelKey(chatbot);
  const modelField = formData.value[modelKey] || models.value[chatbot]?.[0];

  if (modelField) {
    formData.value[modelKey] = modelValidation.value[chatbot].status === ValidationStatus.SUCCESS ? modelField : formData.value[modelKey];
  }
};

/**
 * Selects the default chatbot based on values in the form data.
 * If no chatbot is currently selected, it calculates the default chatbot
 */
function getActiveChatbot(value: SettingsFormData): ChatBotEnum {
  const existingChatbot = [ChatBotEnum.Gemini, ChatBotEnum.OpenAI, ChatBotEnum.Local, ChatBotEnum.Bedrock].find((c) => c === value[Settings.ACTIVE_CHATBOT]);

  if (!!existingChatbot) {
    return existingChatbot;
  }

  // Fallback: detect based on which credentials are filled (reverse priority)
  if (value[Settings.AWS_BEARER_TOKEN_BEDROCK]) {
    return ChatBotEnum.Bedrock;
  } else if (value[Settings.OPENAI_API_KEY]) {
    return ChatBotEnum.OpenAI;
  } else if (value[Settings.GOOGLE_API_KEY]) {
    return ChatBotEnum.Gemini;
  } else if (value[Settings.OLLAMA_URL]) {
    return ChatBotEnum.Local;
  }

  // Default to Local
  return ChatBotEnum.Local;
}

/**
 * Updates the active chatbot value and related form configuration when the chatbot selection changes.
 * @param val The selected chatbot provider value.
 */
const updateChatbotValue = async(val: ChatBotEnum) => {
  updateValue(Settings.ACTIVE_CHATBOT, val);

  // Fetch models only when they are not already fetched for the selected chatbot
  if (models.value[val] === undefined) {
    fetchModels(val);
  }
};

/**
 * Updates the Bedrock region value and triggers a model fetch when the region changes.
 * @param val The new Bedrock region value.
 */
const updateBedrockRegion = debounce((val: string) => {
  updateValue(Settings.AWS_REGION, val);

  // If the region was empty, we don't want to trigger a model fetch since the credentials are likely not filled, which would cause an unnecessary error message.
  if (!!formData.value[Settings.AWS_REGION]) {
    updateModelValidation(ChatBotEnum.Bedrock, { touched: true });

    fetchModels(ChatBotEnum.Bedrock, { region: val });
  }
}, 500);

/**
 * Updates the Bedrock token value and triggers a model fetch when the token changes.
 * @param val The new value for the AWS credential.
 */
const updateBedrockTokenValue = debounce((val: string) => {
  updateValue(Settings.AWS_BEARER_TOKEN_BEDROCK, val);

  updateModelValidation(ChatBotEnum.Bedrock, { touched: true });

  fetchModels(ChatBotEnum.Bedrock, { bearerToken: val });
}, 500);

/**
 * Updates the Ollama URL value and triggers a model fetch when the URL changes.
 * @param val The new Ollama URL value.
 */
const updateOllamaUrlValue = debounce((val: string) => {
  updateValue(Settings.OLLAMA_URL, val);

  updateModelValidation(ChatBotEnum.Local, { touched: true });

  fetchModels(ChatBotEnum.Local, { url: val });
}, 500);

/**
 * Emits an updated form data object when a value changes.
 * If the key is the active chatbot, update the form configuration and set the
 * default model.
 *
 * @param key The key in the form data to update.
 * @param val The value to set for the key.
 */
const updateValue = (key: Settings, val: string) => {
  const newValue = cloneDeep(formData.value);

  newValue[key] = val;

  emit('update:value', newValue);

  validateSettings(newValue);
};

onMounted(() => {
  const activeChatbot = formData.value[Settings.ACTIVE_CHATBOT];

  if (activeChatbot) {
    fetchModels(activeChatbot as ChatBotEnum);
  }
});
</script>

<template>
  <div
    v-if="readOnlyBanner"
    class="read-only-info"
  >
    <Banner
      class="m-0"
      :color="readOnlyBanner.color"
      :label="readOnlyBanner.label"
    />
  </div>
  <div class="form-values">
    <ToggleGroup
      :model-value="formData[Settings.ACTIVE_CHATBOT]"
      :items="activeChatbotOptions"
      :disabled="readOnly"
      @update:model-value="(val: string | undefined) => updateChatbotValue(val as ChatBotEnum)"
    />
    <banner
      v-if="formData[Settings.ACTIVE_CHATBOT] !== ChatBotEnum.Local && !readOnly"
      color="warning"
      class="mt-0 mb-0"
    >
      <span>
        <b>{{ t('aiConfig.form.section.provider.banner.header', {}, true) }}</b>
        <br>
        <span v-clean-html="t('aiConfig.form.section.provider.banner.description', {}, true)" />
      </span>
    </banner>

    <div
      v-if="formData[Settings.ACTIVE_CHATBOT] === ChatBotEnum.Local"
      class="form-field"
    >
      <LabeledInput
        :value="formData[chatbotConfigKey]"
        :label="t(`aiConfig.form.${ chatbotConfigKey }.label`)"
        :disabled="readOnly"
        :rules="isRequiredRule(`aiConfig.form.${ chatbotConfigKey }.label`)"
        :mode="readOnly ? _VIEW : _EDIT"
        data-testid="rancher-ai-ui-settings-llm-api-key-input"
        @update:value="(val: string) => updateOllamaUrlValue(val)"
      />
      <Banner
        v-if="modelValidation[ChatBotEnum.Local].touched && modelValidation[ChatBotEnum.Local].status === ValidationStatus.ERROR"
        class="m-0"
        color="error"
      >
        {{ modelValidation[ChatBotEnum.Local].message }}
      </Banner>
      <label class="text-label">
        {{ t(`aiConfig.form.${ chatbotConfigKey }.description`) }}
      </label>
    </div>

    <div
      v-if="formData[Settings.ACTIVE_CHATBOT] !== ChatBotEnum.Local &&formData[Settings.ACTIVE_CHATBOT] !== ChatBotEnum.Bedrock"
      class="form-field"
    >
      <Password
        :value="formData[chatbotConfigKey]"
        :label="t(`aiConfig.form.${ chatbotConfigKey }.label`)"
        :disabled="readOnly"
        :mode="readOnly ? _VIEW : _EDIT"
        :required="true"
        data-testid="rancher-ai-ui-settings-llm-api-key-input"
        @update:value="(val: string) => updateValue(chatbotConfigKey, val)"
      />
      <label class="text-label">
        {{ t(`aiConfig.form.${ chatbotConfigKey }.description`) }}
      </label>
    </div>

    <template v-if="formData[Settings.ACTIVE_CHATBOT] === ChatBotEnum.Bedrock">
      <div class="form-field">
        <LabeledSelect
          :value="formData[Settings.AWS_REGION]"
          :label="t(`aiConfig.form.${ Settings.AWS_REGION}.label`)"
          :options="BEDROCK_REGION_OPTIONS"
          :disabled="readOnly"
          :required="true"
          @update:value="(val: string) => updateBedrockRegion(val)"
        />
        <label class="text-label">
          {{ t(`aiConfig.form.${ Settings.AWS_REGION}.description`) }}
        </label>
      </div>
      <div class="form-field">
        <Password
          :value="formData[Settings.AWS_BEARER_TOKEN_BEDROCK]"
          :label="t(`aiConfig.form.${ Settings.AWS_BEARER_TOKEN_BEDROCK}.label`)"
          :mode="readOnly || !formData[Settings.AWS_REGION] ? _VIEW : _EDIT"
          :required="true"
          @update:value="(val: string) => updateBedrockTokenValue(val)"
        />
        <Banner
          v-if="modelValidation[ChatBotEnum.Bedrock].touched && modelValidation[ChatBotEnum.Bedrock].status === ValidationStatus.ERROR"
          class="m-0"
          color="error"
        >
          {{ modelValidation[ChatBotEnum.Bedrock].message }}
        </Banner>
        <label class="text-label">
          {{ t(`aiConfig.form.${ Settings.AWS_BEARER_TOKEN_BEDROCK}.description`) }}
        </label>
      </div>
    </template>

    <div class="form-field">
      <LabeledSelect
        :value="formData[getModelKey(formData[Settings.ACTIVE_CHATBOT])]"
        :label="t(`aiConfig.form.${ getModelKey(formData[Settings.ACTIVE_CHATBOT]) }.label`)"
        :options="models[formData[Settings.ACTIVE_CHATBOT] as ChatBotEnum] || []"
        :loading="isModelsLoading"
        :disabled="readOnly || !isModelsAvailable"
        :required="true"
        @update:value="(val: string) => updateValue(getModelKey(formData[Settings.ACTIVE_CHATBOT]), val)"
      />
      <RichTranslation
        :k="`aiConfig.form.${ getModelKey(formData[Settings.ACTIVE_CHATBOT]) }.description`"
        class="text-label"
      >
        <template #refreshModels="{ content }">
          <a
            class="text-label clickable-label"
            @click="refreshModels"
          >
            {{ content }}
          </a>
        </template>
      </RichTranslation>
    </div>

    <advanced-section
      :mode="_EDIT"
      class="mt-0 font-bold"
    >
      <div
        v-if="formData[Settings.ACTIVE_CHATBOT] === ChatBotEnum.OpenAI"
        class="form-field mt-30"
      >
        <LabeledInput
          :value="formData[Settings.OPENAI_THIRD_PARTY_URL]"
          :label="t(`aiConfig.form.${ Settings.OPENAI_THIRD_PARTY_URL }.label`)"
          :disabled="readOnly"
          @update:value="(val: string) => updateValue(Settings.OPENAI_THIRD_PARTY_URL, val)"
        />
        <label class="text-label">
          {{ t(`aiConfig.form.${ Settings.OPENAI_THIRD_PARTY_URL }.description`) }}
        </label>
      </div>

      <!-- Removed for now, will be added back in a future release when RAG support is added
      <h4 class="mt-30">
        {{ t('aiConfig.form.section.rag.header') }}
      </h4>
      <label class="text-label">{{ t('aiConfig.form.section.rag.description') }}</label>
      <hr>
      <banner
        class="form-sub"
        color="info"
      >
        {{ t('aiConfig.form.section.rag.banner') }}
      </banner>
      <div class="form-values form-sub mb-30">
        <checkbox
          :value="formData[Settings.ENABLE_RAG]"
          :label="t(`aiConfig.form.${ Settings.ENABLE_RAG}.label`)"
          value-when-true="true"
          :disabled="readOnly"
          @update:value="(val: string) => updateValue(Settings.ENABLE_RAG, val)"
        />

        <div class="form-field">
          <labeled-input
            :value="formData[Settings.EMBEDDINGS_MODEL]"
            :label="t(`aiConfig.form.${ Settings.EMBEDDINGS_MODEL}.label`)"
            :disabled="readOnly"
            @update:value="(val: string) => updateValue(Settings.EMBEDDINGS_MODEL, val)"
          />
          <label class="text-label">
            The model used to create embeddings for RAG
          </label>
        </div>
      </div> -->

      <h4 class="mt-30">
        {{ t('aiConfig.form.section.langfuse.header') }}
      </h4>
      <label class="text-label">
        {{ t('aiConfig.form.section.langfuse.description') }}
      </label>
      <hr>
      <banner
        class="form-sub"
        color="info"
      >
        {{ t('aiConfig.form.section.langfuse.banner') }}
      </banner>
      <div class="form-values form-sub">
        <div class="form-field">
          <labeled-input
            :value="formData[Settings.LANGFUSE_HOST]"
            :label="t(`aiConfig.form.${ Settings.LANGFUSE_HOST}.label`)"
            :disabled="readOnly"
            @update:value="(val: string) => updateValue(Settings.LANGFUSE_HOST, val)"
          />
          <label class="text-label">
            {{ t(`aiConfig.form.${ Settings.LANGFUSE_HOST}.description`) }}
          </label>
        </div>

        <div class="form-field">
          <labeled-input
            :value="formData[Settings.LANGFUSE_PUBLIC_KEY]"
            :label="t(`aiConfig.form.${ Settings.LANGFUSE_PUBLIC_KEY}.label`)"
            :disabled="readOnly"
            @update:value="(val: string) => updateValue(Settings.LANGFUSE_PUBLIC_KEY, val)"
          />
          <label class="text-label">
            {{ t(`aiConfig.form.${ Settings.LANGFUSE_PUBLIC_KEY}.description`) }}
          </label>
        </div>

        <div class="form-field">
          <password
            :value="formData[Settings.LANGFUSE_SECRET_KEY]"
            :label="t(`aiConfig.form.${ Settings.LANGFUSE_SECRET_KEY}.label`)"
            :mode="readOnly ? _VIEW : _EDIT"
            @update:value="(val: string) => updateValue(Settings.LANGFUSE_SECRET_KEY, val)"
          />
          <label class="text-label">
            {{ t(`aiConfig.form.${ Settings.LANGFUSE_SECRET_KEY}.description`) }}
          </label>
        </div>
      </div>
    </advanced-section>
  </div>
</template>

<style lang="scss" scoped>
.read-only-info {
  margin-bottom: 1.5rem;
}

.form-values {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 70rem;
  flex-grow: 1;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-sub {
  padding-left: 1.5rem;
}

div.mt-0 {
  margin-top: 0 !important;
}

div.mb-0 {
  margin-bottom: 0 !important;
}

.clickable-label {
  text-decoration: underline;
  cursor: pointer;
}

:deep() .labeled-select {
  .icon-spinner {
    top: calc(50% - 8px);
    left: calc(100% - 48px);
  }
}
</style>
