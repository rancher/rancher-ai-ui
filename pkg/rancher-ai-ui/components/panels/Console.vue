<script lang="ts" setup>
import {
  ref, computed, nextTick,
  onMounted,
  watch,
  onUpdated
} from 'vue';
import { Agent } from '../../types';
import { useStore } from 'vuex';
import RcButton from '@components/RcButton/RcButton.vue';
import TextLabelPopover from '../popover/TextLabel.vue';
import VerifyResultsDisclaimer from '../../static/VerifyResultsDisclaimer.vue';
import { useInputComposable } from '../../composables/useInputComposable';

import type { PropType } from 'vue';

/**
 * Console panel for AI chat messages input and info about the Agent.
 */

const store = useStore();
const t = store.getters['i18n/t'];

const props = defineProps({
  disabled: {
    type:    Boolean,
    default: false,
  },
  agent: {
    type:     Object as PropType<Agent | null>,
    default:  null,
  }
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
      <span
        v-clean-tooltip="!!props.agent && props.agent.model?.length > 20 ? props.agent.model : ''"
        class="chat-model label text-deemphasized"
      >
        {{ !!props.agent ? t('ai.agent.label', { name: props.agent.name, model: props.agent.model }, true) : t('ai.agent.unknown') }}
      </span>
      <TextLabelPopover
        :label="t('ai.agent.verifyResults.button.label')"
        :disabled="props.disabled"
      >
        <VerifyResultsDisclaimer />
      </TextLabelPopover>
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

.chat-model {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  font-size: 12px;
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
