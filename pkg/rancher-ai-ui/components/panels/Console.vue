<script lang="ts" setup>
import {
  ref, computed, nextTick,
  onMounted,
  watch
} from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import type { PropType } from 'vue';
import {
  Agent, FormattedMessage, LLMConfig, Message, Role
} from '../../types';
import RcButton from '@components/RcButton/RcButton.vue';
import SelectAgent from '../agent/SelectAgent.vue';
import LlmModelLabel from '../console/LlmModelLabel.vue';
import VerifyResultsDisclaimer from '../console/VerifyResultsDisclaimer.vue';
import { useInputComposable } from '../../composables/useInputComposable';
import { isMac } from '@shell/utils/platform';
import { extractMessageText } from '../../utils/label';
import Chat from '../../handlers/chat';

/**
 * Console panel for AI chat messages input and AI service's configuration.
 */

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  activeChatId: {
    type:    String,
    default: '',
  },
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
  messages: {
    type:    Array as PropType<Message[]>,
    default: () => [],
  },
  hasPermissions: {
    type:    Boolean,
    default: true,
  }
});

const emit = defineEmits([
  'input:content',
  'select:agent'
]);

const {
  inputText, updateInput, cleanInput, cleanInputAndTags
} = useInputComposable();

const promptTextarea = ref<HTMLTextAreaElement | null>(null);
const isFocused = ref(false);
const completeText = ref('');
const MAX_HEIGHT = 200;
const historyIndex = ref(-1);

const text = computed(() => {
  if (props.disabled) {
    return '';
  }

  return inputText.value;
});

function onInputMessage(event: Event) {
  clearCompleteTextHistory();
  updateInput((event?.target as HTMLTextAreaElement)?.value);
  nextTick(autoResizePrompt);
}

function handleTextareaKeydown(event: KeyboardEvent) {
  if (event.key === 'Tab' && completeText.value) {
    event.preventDefault();
    updateInput(completeText.value);
    clearCompleteTextHistory();
    nextTick(autoResizePrompt);
  }

  // When there is completeText it will stop and not send Content
  if (event.key === 'Enter' && !event.shiftKey && completeText.value) {
    event.preventDefault();
    event.stopPropagation();

    return;
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    sendContent(event);

    return;
  }

  // Fix a bug that makes the close chat not work on inputs
  // Same as the one done with IPlugin
  if ((event.key?.toLowerCase() === 'k' && event.metaKey && event.shiftKey && isMac) || (event.key.toLowerCase() === 'k' && event.altKey && !isMac)) {
    event.preventDefault();
    event.stopPropagation();
    Chat.close(store);

    return;
  }

  // ArrowUp and Down will copy the previous/next user message
  if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && inputText.value === '') {
    event.preventDefault();
    copyUserPreviousMessage(event.key === 'ArrowUp' ? 'prev' : 'next');

    return;
  }
}

function copyUserPreviousMessage(direction: 'prev' | 'next') {
  const userMessages = ([...props.messages] as FormattedMessage[])
    .filter((m: FormattedMessage) => m.role === Role.User);

  if (!userMessages.length) {
    return;
  }

  // History Index is updated to keep the position of the shown message
  if (direction === 'prev') {
    historyIndex.value = historyIndex.value < userMessages.length - 1 ? historyIndex.value + 1 : historyIndex.value;
  } else {
    historyIndex.value = historyIndex.value > 0 ? historyIndex.value - 1 : -1;
  }

  // After reset it turn to be empty
  if (historyIndex.value === -1) {
    completeText.value = '';

    return;
  }

  const message = userMessages[userMessages.length - 1 - historyIndex.value];
  let text = extractMessageText(message);

  if (text) {
    text = cleanInputAndTags(text);

    completeText.value = text;
  }
}

/**
 * Helper to Clear the CompleteText and reset the HistoryIndex, used when sending a message or changing the chat to avoid showing wrong completeText
 */
function clearCompleteTextHistory() {
  completeText.value = '';
  historyIndex.value = -1;
}

function sendContent(event: Event) {
  event.preventDefault();
  event.stopPropagation();

  const content = cleanInput(text.value);

  if (content) {
    emit('input:content', content);
  }

  clearCompleteTextHistory();
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

watch(() => text.value, () => {
  nextTick(() => {
    autoResizePrompt();
  });
}, {});

watch(
  () => [props.disabled, props.activeChatId],
  ([newDisabled, newChatId], [oldDisabled, oldChatId]) => {
    // When changing chat, it needs to clear the completeText and reset the historyIndex to avoid showing wrong completeText
    if (oldChatId !== newChatId) {
      clearCompleteTextHistory();
    }

    if (!newDisabled && (oldDisabled || oldChatId !== newChatId)) {
      nextTick(() => {
        promptTextarea.value?.focus();
      });
    }
  }
);

onMounted(() => {
  nextTick(() => {
    autoResizePrompt();
  });
});
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
      <div
        v-if="completeText"
        class="chat-input-complete"
      >
        <div class="text">
          {{ completeText }}
        </div>
        <div class="tab-label-box">
          <span class="tab-label">Tab</span>
        </div>
      </div>
      <textarea
        ref="promptTextarea"
        class="chat-input"
        rows="1"
        :value="text"
        :placeholder="props.disabled || completeText ? '' : t('ai.prompt.placeholder')"
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
    <div
      v-if="props.hasPermissions"
      class="chat-console-row chat-console-chat-text-info"
    >
      <LlmModelLabel
        :llm-config="props.llmConfig"
      />
      <VerifyResultsDisclaimer />
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
  position: relative;

  &.focused {
    border: solid 1px var(--active-nav);
  }

  &.disabled {
    background-color: var(--disabled-bg);
  }
}

.chat-input-complete {
  padding: 12px 0px 0px 16px;
  position: absolute;
  right: 16px;
  left: 0;
  line-height: 1.4;
  // Harcoded colors used for both themes
  color: #94A3B8;
  display: flex;
  gap: 6px;
  .text {
    white-space: nowrap;
    overflow: hidden;
  }
  .tab-label-box {
    font-family: 'Lato';
    display: flex;
    padding: 3px 6px;
    align-items: center;
    border-radius: 4px;
    // Harcoded colors used for both themes
    border: 1px solid #BFC1D3;
    color: #BFC1D3;
    font-size: 10px;
    font-style: normal;
    font-weight: 400;
    line-height: normal;

    .tab-label {
      width: 16px;
    }
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