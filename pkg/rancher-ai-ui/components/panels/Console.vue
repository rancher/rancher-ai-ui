<script lang="ts" setup>
import {
  ref, computed, nextTick,
  onMounted,
  watch
} from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import type { PropType } from 'vue';
import { Agent, LLMConfig } from '../../types';
import RcButton from '@components/RcButton/RcButton.vue';
import SelectAgent from '../agent/SelectAgent.vue';
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
  agents: {
    type:     Array as PropType<Agent[]>,
    default:  () => [],
  },
  agentName: {
    type:    String,
    default: '',
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'input:content',
  'select:agent'
]);

const { inputText, updateInput, cleanInput } = useInputComposable();

const promptTextarea = ref<HTMLTextAreaElement | null>(null);
const isFocused = ref(false);
const MAX_HEIGHT = 200;

const text = computed(() => {
  if (props.disabled) {
    return '';
  }

  return inputText.value;
});

function onInputMessage(event: Event) {
  updateInput((event?.target as HTMLTextAreaElement)?.value);
  nextTick(autoResizePrompt);
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
  nextTick(autoResizePrompt);
}

function selectAgent(agentName: string) {
  emit('select:agent', agentName);
  nextTick(() => {
    promptTextarea.value?.focus();
  });
}

function autoResizePrompt() {
  const textarea = promptTextarea.value;

  if (textarea) {
    textarea.style.height = '36px';

    const scrollHeight = textarea.scrollHeight;
    const newHeight = scrollHeight > MAX_HEIGHT ? MAX_HEIGHT : scrollHeight;

    textarea.style.height = `${ newHeight }px`;
    textarea.style.overflowY = scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }
}

onMounted(() => {
  nextTick(() => {
    promptTextarea.value?.focus();
    autoResizePrompt();
  });
});

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
      class="chat-input-wrapper"
      :class="{
        focused: isFocused,
        'disabled-panel': props.disabled
      }"
    >
      <textarea
        ref="promptTextarea"
        class="chat-input"
        rows="1"
        :value="text"
        :placeholder="props.disabled ? '' : t('ai.prompt.placeholder')"
        :disabled="props.disabled"
        autocomplete="off"
        data-testid="rancher-ai-ui-chat-input-textarea"
        @input="onInputMessage"
        @keydown="handleTextareaKeydown"
        @focus="isFocused = true"
        @blur="isFocused = false"
      />
      <div class="chat-input-actions">
        <SelectAgent
          v-if="props.agents.length > 1"
          :agents="props.agents"
          :agent-name="props.agentName"
          :disabled="props.disabled"
          @select="selectAgent"
        />
        <div
          class="chat-input-send"
          :class="{ 'disabled-panel': props.disabled }"
        >
          <RcButton
            class="send-button"
            :disabled="!cleanInput(text) || props.disabled"
            @click="sendContent"
            @keydown.enter="sendContent"
          >
            <i class="icon icon-lg icon-send" />
          </RcButton>
        </div>
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
  padding: 0 16px 16px 16px;
  gap: 0.75rem;
  height: auto;
}

.chat-input-wrapper {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 8px;
  background-color: var(--input-bg);
  transition: border-color 0.2s;
  /* The wrapper follows the height of its child */
  height: auto;
  min-height: min-content;

  &.focused {
    border: solid 1px var(--active-nav);
  }

  &.disabled {
    background-color: var(--disabled-bg);
  }
}

.chat-input {
  display: block;
  border: none;
  background: transparent;
  padding: 12px 16px 0 16px;
  font-size: 1rem;
  outline: none;
  color: var(--input-text);
  width: 100%;
  resize: none;
  min-height: 36px;
  max-height: 200px;
  line-height: 1.4;
  box-sizing: border-box;
}

.chat-input-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding: 8px;
  min-height: 36px;
}

.chat-input-send {
  .send-button {
    height: 32px;
    width: 32px;
    min-width: 32px;
    min-height: 32px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--accent-btn);
    color: var(--active-nav);
    border-radius: 4px;
    border: none;

    &:disabled {
      background-color: transparent;
      color: var(--primary);
    }

    &:hover:not(:disabled) {
      background-color: #c6dcff;
    }
  }
}

.chat-console-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-console-chat-text-info {
  font-family: Lato;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
  justify-content: flex-start;
}
</style>