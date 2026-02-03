<script setup lang="ts">
import { cloneDeep } from 'lodash';
import {
  ref, computed,
  watch,
} from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import Banner from '@components/Banner/Banner.vue';
import { _EDIT, _VIEW } from '@shell/config/query-params';
import AdvancedSection from '@shell/components/AdvancedSection.vue';
import Password from '@shell/components/form/Password.vue';
import { Settings, SettingsFormData, ChatBotEnum } from '../types';
import ToggleGroup from '../../../components/toggle/toggle-group.vue';

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

const emit = defineEmits(['update:value']);

const models = {
  [ChatBotEnum.Local]:  ['gpt-oss:20b'],
  [ChatBotEnum.OpenAI]: [
    'gpt-4o',
    'gpt-4o-mini',
    'o3-mini',
    'o3',
    'o4-mini',
    'gpt-4.1',
    'gpt-4',
    'gpt-3.5-turbo',
  ],
  [ChatBotEnum.Gemini]: [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
  ],
  [ChatBotEnum.Bedrock]: ['global.anthropic.claude-opus-4-5-20251101-v1:0'],
};

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

function getModelKey(chatbot: ChatBotEnum) {
  return Settings[`${ chatbot.toUpperCase() }_MODEL` as keyof typeof Settings] as Settings.OLLAMA_MODEL | Settings.GEMINI_MODEL | Settings.OPENAI_MODEL | Settings.BEDROCK_MODEL;
}

const modelOptions = ref(models[ChatBotEnum.Local]);
const chatbotConfigKey = ref<Settings.OLLAMA_URL | Settings.GOOGLE_API_KEY | Settings.OPENAI_API_KEY | Settings.AWS_SECRET_ACCESS_KEY>(Settings.OLLAMA_URL);

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
 * Updates the form configuration based on the selected chatbot.
 * Sets the appropriate model options and config key for the selected chatbot.
 * @param chatbot The selected chatbot provider ('OpenAI', 'Gemini', or
 * 'Local').
 */
const updateFormConfig = (chatbot: ChatBotEnum) => {
  const modelKey = getModelKey(chatbot);
  const modelField = formData.value[modelKey] || models[chatbot as ChatBotEnum][0];

  if (modelField) {
    modelOptions.value = models[chatbot as ChatBotEnum];
    formData.value[modelKey] = modelField;

    switch (chatbot) {
    case ChatBotEnum.OpenAI:
      chatbotConfigKey.value = Settings.OPENAI_API_KEY;
      break;
    case ChatBotEnum.Gemini:
      chatbotConfigKey.value = Settings.GOOGLE_API_KEY;
      break;
    case ChatBotEnum.Bedrock:
      chatbotConfigKey.value = Settings.AWS_SECRET_ACCESS_KEY;
      break;
    case ChatBotEnum.Local:
    default:
      chatbotConfigKey.value = Settings.OLLAMA_URL;
      break;
    }
  }
};

/**
 * Selects the default chatbot based on values in the form data.
 * If no chatbot is currently selected, it calculates the default chatbot in the order: Ollama, Gemini and OpenAI
 */
function getActiveChatbot(value: SettingsFormData): ChatBotEnum {
  const existingChatbot = [ChatBotEnum.Gemini, ChatBotEnum.OpenAI, ChatBotEnum.Local, ChatBotEnum.Bedrock].find((c) => c === value[Settings.ACTIVE_CHATBOT]);

  if (!!existingChatbot) {
    return existingChatbot;
  }

  let chatBot = ChatBotEnum.Local;

  if (value[Settings.OLLAMA_URL]) {
    chatBot = ChatBotEnum.Local;
  } else if (value[Settings.GOOGLE_API_KEY]) {
    chatBot = ChatBotEnum.Gemini;
  } else if (value[Settings.OPENAI_API_KEY]) {
    chatBot = ChatBotEnum.OpenAI;
  }  else if (value[Settings.AWS_SECRET_ACCESS_KEY]) {
    chatBot = ChatBotEnum.Bedrock;
  }

  return chatBot;
}

/**
 * Watches for changes in the resource and updates the form data.
 */
watch(props.value, () => {
  updateFormConfig(formData.value[Settings.ACTIVE_CHATBOT] as ChatBotEnum);
}, {
  immediate: true,
  deep:      true
});

/**
 * Emits an updated form data object when a value changes.
 * If the key is the active chatbot, update the form configuration and set the
 * default model.
 *
 * @param key The key in the form data to update.
 * @param val The value to set for the key.
 */
const updateValue = (key: Settings, val: ChatBotEnum | string) => {
  const newValue = cloneDeep(formData.value);

  newValue[key] = val;
  if (key === Settings.ACTIVE_CHATBOT) {
    const chatbot = val as ChatBotEnum;
    const modelKey = getModelKey(chatbot);

    updateFormConfig(chatbot);
    newValue[modelKey] = newValue[modelKey] || models[chatbot][0];
  }

  emit('update:value', newValue);
};
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
      @update:model-value="(val: string | undefined) => updateValue(Settings.ACTIVE_CHATBOT, val as ChatBotEnum)"
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

    <div class="form-field">
      <component
        :is="chatbotConfigKey === Settings.OLLAMA_URL ? LabeledInput : Password"
        :value="formData[chatbotConfigKey]"
        :label="t(`aiConfig.form.${ chatbotConfigKey }.label`)"
        :disabled="readOnly"
        :mode="readOnly ? _VIEW : _EDIT"
        @update:value="(val: string) => updateValue(chatbotConfigKey, val)"
      />
      <label class="text-label">
        {{ t(`aiConfig.form.${ chatbotConfigKey }.description`) }}
      </label>
    </div>

    <template v-if="formData[Settings.ACTIVE_CHATBOT] == ChatBotEnum.Bedrock">
      <div class="form-field">
        <Password
          :value="formData[Settings.AWS_ACCESS_KEY_ID]"
          :label="t(`aiConfig.form.${ Settings.AWS_ACCESS_KEY_ID}.label`)"
          :mode="readOnly ? _VIEW : _EDIT"
          @update:value="(val: string) => updateValue(Settings.AWS_ACCESS_KEY_ID, val)"
        />
        <label class="text-label">
          {{ t(`aiConfig.form.${ Settings.AWS_ACCESS_KEY_ID}.description`) }}
        </label>
      </div>
      <div class="form-field">
        <Password
          :value="formData[Settings.AWS_BEARER_TOKEN_BEDROCK]"
          :label="t(`aiConfig.form.${ Settings.AWS_BEARER_TOKEN_BEDROCK}.label`)"
          :mode="readOnly ? _VIEW : _EDIT"
          @update:value="(val: string) => updateValue(Settings.AWS_BEARER_TOKEN_BEDROCK, val)"
        />
        <label class="text-label">
          {{ t(`aiConfig.form.${ Settings.AWS_BEARER_TOKEN_BEDROCK}.description`) }}
        </label>
      </div>
      <div class="form-field">
        <labeled-input
          :value="formData[Settings.AWS_REGION]"
          :label="t(`aiConfig.form.${ Settings.AWS_REGION}.label`)"
          :disabled="readOnly"
          @update:value="(val: string) => updateValue(Settings.AWS_REGION, val)"
        />
        <label class="text-label">
          {{ t(`aiConfig.form.${ Settings.AWS_REGION}.description`) }}
        </label>
      </div>
    </template>

    <div class="form-field">
      <component
        :is="modelOptions.length > 1 ? LabeledSelect : LabeledInput"
        :value="formData[getModelKey(formData[Settings.ACTIVE_CHATBOT] as ChatBotEnum)]"
        :label="t(`aiConfig.form.${ Settings.MODEL }.label`)"
        :options="modelOptions"
        :disabled="readOnly"
        @update:value="(val: string) => updateValue(getModelKey(formData[Settings.ACTIVE_CHATBOT] as ChatBotEnum), val)"
      />
      <label class="text-label">
        {{ t(`aiConfig.form.${ Settings.MODEL }.description`) }}
      </label>
    </div>

    <advanced-section
      :mode="_EDIT"
      class="mt-0 font-bold"
    >
      <div
        v-if="formData[Settings.ACTIVE_CHATBOT] == ChatBotEnum.OpenAI"
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
      </div>
      <h4>
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
</style>
