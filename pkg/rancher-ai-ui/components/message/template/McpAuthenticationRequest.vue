<script setup lang="ts">
import { computed, type PropType } from 'vue';
import RcButton from '@components/RcButton/RcButton.vue';
import { ConfirmationStatus, Message } from '../../../types';
import { formatMessageContent } from '../../../utils/format';
import SystemAvatar from '../avatar/SystemAvatar.vue';

interface Agent {
  displayName: string;
  description: string;
}

interface Content {
  message?: string;
  agent?: Agent;
}

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

const content = computed<Content | undefined>(() => props.message.templateContent?.content);

const actions = computed(() => {
  const all = props.message?.actions || [];

  return {
    confirm: all[0],
    cancel:  all[1],
  };
});

function doAction(type: 'confirm' | 'cancel') {
  if (actions.value[type]?.action) {
    const confirmation = actions.value[type].action();

    emit('update:message', {
      ...props.message,
      confirmation
    });
  }
}
</script>

<template>
  <div
    class="chat-system-mcp-request-request-message"
    :class="{ 'disabled-panel': props.disabled }"
  >
    <SystemAvatar class="chat-msg-avatar" />
    <div
      v-if="content?.message"
      class="chat-system-mcp-request-request-msg-bubble"
    >
      <div class="chat-system-mcp-request-request-msg-text">
        <div
          v-if="content?.agent"
          data-testid="rancher-ai-ui-chat-message-selected-agent-label"
          class="chat-system-mcp-request-request-msg-agent"
        >
          <span
            v-clean-tooltip="content.agent.description"
            class="chat-system-mcp-request-request-msg-agent-label"
          >
            {{ t('ai.agents.selectedAgent.label', { agent: content.agent.displayName }) }}
          </span>
        </div>

        <span
          v-clean-html="formatMessageContent(content.message || '')"
        />
      </div>

      <div class="chat-system-mcp-request-request-actions">
        <div
          v-if="props.message.confirmation"
          :data-testid="`rancher-ai-ui-chat-message-confirmation-${ props.message.confirmation?.status === ConfirmationStatus.Confirmed ? 'confirmed' : 'canceled'}`"
          :class="['chat-system-mcp-request-request-actions-result', `status-${props.message.confirmation.status}` ]"
        >
          <i
            :class="[ 'icon', props.message.confirmation.icon ]"
          />
          <span
            v-clean-html="formatMessageContent(props.message.confirmation.label || '')"
            class="chat-system-mcp-request-request-msg-text"
          />
        </div>
        <div
          v-else
          class="chat-system-mcp-request-request-actions-buttons"
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
            tertiary
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
.chat-system-mcp-request-request-message {
  display: flex;
  gap: var(--gap);
}

.chat-system-mcp-request-request-msg-bubble {
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
  &:hover .chat-system-mcp-request-request-msg-bubble-actions {
    opacity: 1;
    pointer-events: auto;
  }
}

.chat-system-mcp-request-request-msg-agent {
  margin-bottom: 4px;
}
.chat-system-mcp-request-request-msg-agent-label {
  color: #BFC1D3;
  font-family: Lato;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 21px; /* 150% */
}

.chat-system-mcp-request-request-msg-text, :deep() pre {
  word-break: break-word;
  white-space: pre-line;
  list-style-position: inside;
}

.chat-system-mcp-request-request-msg-text {
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

@import '@shell/assets/styles/base/_color-classic.scss';

.theme-dark .chat-system-mcp-request-request-msg-text :deep(code) {
  color: $green-40;
}

.chat-system-mcp-request-request-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--gap);
  margin-top: 16px;

  &-buttons {
    display: flex;
    gap: var(--gap);
  }
}

.chat-system-mcp-request-request-actions-result {
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
