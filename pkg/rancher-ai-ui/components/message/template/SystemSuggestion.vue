<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { Message } from '../../../types';
import RcButton from '@components/RcButton/RcButton.vue';
import { formatMessageContent } from '../../../utils/format';

const props = defineProps({
  message: {
    type:    Object as PropType<Message>,
    default: () => ({} as Message),
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:message']);

const actions = computed(() => {
  const all = props.message?.actions || [];

  return {
    confirm: all[0],
    cancel:  all[1],
  };
});

function doAction(type: 'confirm' | 'cancel') {
  if (actions.value[type]?.action) {
    props.message.confirmation = actions.value[type].action();

    emit('update:message', props.message);
  }
}
</script>

<template>
  <div
    class="chat-system-suggestion-message"
    :class="{
      disabled: props.disabled
    }"
  >
    <div
      v-if="props.message?.templateContent?.content?.message"
      class="chat-system-suggestion-msg-bubble"
    >
      <div class="chat-system-suggestion-msg-text">
        <span
          v-clean-html="formatMessageContent(props.message.templateContent.content.message || '')"
        />
      </div>

      <div class="chat-system-suggestion-actions">
        <div
          v-if="props.message.confirmation"
          :data-testid="`rancher-ai-ui-chat-message-confirmation-${props.message.confirmation.status}`"
          :class="['chat-system-suggestion-actions-result', `status-${props.message.confirmation.status}` ]"
        >
          <i :class="[ 'icon', props.message.confirmation.icon ]" />
          <span
            v-clean-html="formatMessageContent(props.message.confirmation.label || '')"
            class="chat-system-suggestion-msg-text"
          />
        </div>
        <div
          v-else
          class="chat-system-suggestion-actions-buttons"
        >
          <RcButton
            v-if="actions.cancel?.action"
            small
            tertiary
            data-testid="rancher-ai-ui-chat-message-confirmation-cancel-button"
            @click="doAction('cancel')"
          >
            <span class="rc-button-label">
              {{ actions.cancel?.label }}
            </span>
          </RcButton>
          <RcButton
            v-if="actions.confirm?.action"
            small
            secondary
            data-testid="rancher-ai-ui-chat-message-confirmation-confirm-button"
            @click="doAction('confirm')"
          >
            <span class="rc-button-label">
              {{ actions.confirm?.label }}
            </span>
          </RcButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang='scss' scoped>
.chat-system-suggestion-message {
  display: flex;
  gap: 8px;
}

.chat-system-suggestion-msg-bubble {
  position: relative;
  background: var(--body-bg);
  color: var(--body-text);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04);
  padding: 12px;
  line-height: 21px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  /* Hide actions by default, show on hover */
  &:hover .chat-system-suggestion-msg-bubble-actions {
    opacity: 1;
    pointer-events: auto;
  }
}

.chat-system-suggestion-msg-text, :deep() pre {
  word-break: break-word;
  white-space: pre-line;
  list-style-position: inside;
}

.chat-system-suggestion-msg-text {
  &:deep(code) {
    padding: initial;
    border: initial;
    border-radius: initial;
    background-color: transparent;
    color: #025937;
  }

  &:deep(ul) {
    white-space: normal;
    margin: 0;
    padding-left: 1rem;
  }

  &:deep(th) {
    text-align: left;
  }

  &:deep(pre) {
    margin: 0;
  }
}

.theme-dark .chat-system-suggestion-msg-text :deep(code) {
  color: #C0EFDE;
}

.chat-system-suggestion-actions {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-top: 16px;

  .chat-system-suggestion-actions-buttons {
    display: flex;
    width: 100%;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: space-between;
  }
}

.chat-system-suggestion-actions-result {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  height: 30px;
  margin-left: auto;

  &.status-confirmed {
    .icon {
      color: var(--success);
    }
  }

  &.status-canceled {
    .icon {
      color: var(--error);
    }
  }
}
</style>
