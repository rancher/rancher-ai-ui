<script lang="ts" setup>
import {
  ref, computed, nextTick,
  onMounted,
  watch,
  onUpdated
} from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import type { PropType } from 'vue';
import { LLMConfig } from '../../types';
import RcButton from '@components/RcButton/RcButton.vue';
import LlmModelLabel from '../console/LlmModelLabel.vue';
import VerifyResultsDisclaimer from '../console/VerifyResultsDisclaimer.vue';
import { useInputComposable } from '../../composables/useInputComposable';

/**
 * Console panel for AI chat messages input and AI service's configuration.
 */

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  llmConfig: {
    type:     Object as PropType<LLMConfig | null>,
    default:  null,
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits(['input:content']);

const { inputText, updateInput, cleanInput } = useInputComposable();

const promptTextarea = ref<HTMLTextAreaElement | null>(null);

const text = computed(() => {
  if (props.disabled) {
    return '';
  }

  return inputText.value;
});

function onInputMessage(event: Event) {
  updateInput((event?.target as HTMLTextAreaElement)?.value);
  autoResizePrompt();
}

function handleTextareaKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    sendContent(event);
  }
}

function sendContent(event: Event) {
  event.preventDefault();
  event.stopPropagation();

  const content = cleanInput(text.value);

  if (content) {
    emit('input:content', content);
  }

  updateInput('');
}

function autoResizePrompt(height?: number) {
  const textarea = promptTextarea.value;

  if (textarea) {
    textarea.style.overflow = parseInt(textarea.style.height) > 90 ? 'auto' : 'hidden';
    textarea.style.height = 'auto';
    textarea.style.height = `${ height || textarea.scrollHeight }px`;
  }
}

onMounted(() => {
  nextTick(() => {
    promptTextarea.value?.focus();
  });
});

onUpdated(() => {
  nextTick(() => {
    promptTextarea.value?.focus();
  });
});

watch(promptTextarea, (el) => {
  if (el) {
    nextTick(() => el.focus());
  }
}, {});

watch(() => text.value, () => {
  nextTick(() => {
    autoResizePrompt();
  });
}, {});
</script>

<template>
  <div
    class="chat-console"
    data-testid="rancher-ai-ui-chat-console"
  >
    <div
      class="chat-console-row"
    >
      <textarea
        ref="promptTextarea"
        class="chat-input"
        :class="{ disabled: props.disabled }"
        rows="1"
        :value="text"
        :placeholder="props.disabled ? '' : t('ai.prompt.placeholder')"
        :disabled="props.disabled"
        autocomplete="off"
        data-testid="rancher-ai-ui-chat-input-textarea"
        @input="onInputMessage"
        @keydown="handleTextareaKeydown"
      />
      <div
        class="chat-input-send"
        :class="{ disabled: props.disabled }"
      >
        <RcButton
          small
          :disabled="!cleanInput(text) || props.disabled"
          @click="sendContent"
          @keydown.enter="sendContent"
        >
          <i class="icon icon-lg icon-send" />
        </RcButton>
      </div>
    </div>
    <div class="chat-console-row chat-console-chat-text-info">
      <LlmModelLabel
        :llm-config="props.llmConfig"
      />
      <VerifyResultsDisclaimer
        :disabled="props.disabled"
      />
    </div>
  </div>
</template>

<style lang='scss' scoped>
.chat-console {
  display: flex;
  flex-direction: column;
  padding: 16px 16px 16px 16px;
  gap: 0.75rem;
  border-top: 1px solid var(--border);
  min-height: 70px;
}

.chat-console-row {
  display: flex;
  align-items: end;
  gap: 8px;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.chat-input {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 1rem;
  outline: none;
  color: var(--input-text);
  transition: border 0.2s;
  width: auto;
  outline-offset: 0;
  resize: none;
  overflow: auto;
  min-height: 36px;
  max-height: 90px;
}

.chat-input:focus {
  border: solid 1.5px var(--secondary-border, var(--primary));
}

.chat-input-send {
  .btn {
    height: 36px;
  }
}

.chat-console-chat-text-info {
  justify-content: flex-start;
}
</style>
