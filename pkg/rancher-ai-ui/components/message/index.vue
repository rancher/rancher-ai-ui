<script setup lang="ts">
import {
  computed, nextTick, onBeforeUnmount, ref, type PropType
} from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { FormattedMessage, MessagePhase, Role as RoleEnum } from '../../types';
import Processing from '../Processing.vue';
import Actions from './action/index.vue';
import SourceLinks from './SourceLinks.vue';
import Confirmation from './Confirmation.vue';
import Suggestions from './Suggestions.vue';
import ContextTag from '../context/ContextTag.vue';
import UserAvatar from './avatar/UserAvatar.vue';
import SystemAvatar from './avatar/SystemAvatar.vue';
import RcButton from '@components/RcButton/RcButton.vue';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  message: {
    type:    Object as PropType<FormattedMessage>,
    default: () => ({} as FormattedMessage),
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
  pendingConfirmation: {
    type:    Boolean,
    default: false,
  }
});

const emit = defineEmits(['update:message', 'confirm:message', 'send:message']);

const isThinking = computed(() => props.message.role === RoleEnum.Assistant &&
  !props.message.completed &&
  (props.message.thinking || !props.message.formattedMessageContent)
);
const showCopySuccess = ref(false);
const timeoutCopy = ref<any>(null);

function handleCopy() {
  if (!props.message.summaryContent && !props.message.messageContent && !props.message.thinkingContent && !props.message.formattedMessageContent) {
    return;
  }

  let text = '';

  if (RoleEnum.Assistant && props.message.showThinking) {
    text += props.message.thinkingContent ? `${ props.message.thinkingContent }\n` : '';
  }

  if (props.message.summaryContent) {
    text += props.message.summaryContent;

    if (props.message.showCompleteMessage) {
      text += `\n${ props.message.messageContent || '' }`;
    }
  } else {
    // formattedMessageContent will contain error messages if any
    text += (props.message.messageContent || props.message.formattedMessageContent || '');
  }

  navigator.clipboard.writeText(text.trim());
  showCopySuccess.value = true;
  if (timeoutCopy.value) {
    clearTimeout(timeoutCopy.value);
  }
  timeoutCopy.value = setTimeout(() => {
    showCopySuccess.value = false;
  }, 1000);
}

function handleResendMessage() {
  nextTick(() => emit('send:message', props.message));
}

function handleShowCompleteMessage() {
  props.message.showCompleteMessage = !props.message.showCompleteMessage;

  nextTick(() => {
    emit('update:message', props.message);
  });
}

function handleShowThinking() {
  props.message.showThinking = !props.message.showThinking;

  nextTick(() => emit('update:message', props.message));
}

onBeforeUnmount(() => {
  if (timeoutCopy.value) {
    clearTimeout(timeoutCopy.value);
  }
});
</script>

<template>
  <div
    class="chat-message"
    :class="{
      'chat-message-user': props.message.role === RoleEnum.User,
      disabled: props.disabled
    }"
  >
    <component
      :is="props.message.role === RoleEnum.User ? UserAvatar : SystemAvatar"
      class="chat-msg-avatar"
    />
    <div class="chat-msg-content">
      <div
        class="chat-msg-bubble"
        :class="{
          'chat-msg-bubble-user': props.message.role === RoleEnum.User,
          'chat-msg-bubble-assistant': props.message.role !== RoleEnum.User,
          'chat-msg-bubble-error': props.message.isError
        }"
      >
        <div
          v-if="!props.disabled"
          class="chat-msg-bubble-actions"
        >
          <button
            v-if="props.message.role === RoleEnum.Assistant && !!props.message.thinkingContent"
            v-clean-tooltip="props.message.showThinking ? t('ai.message.actions.tooltip.hideThinking') : t('ai.message.actions.tooltip.showThinking')"
            class="bubble-action-btn btn header-btn role-tertiary"
            data-testid="rancher-ai-ui-chat-message-show-thinking-button"
            type="button"
            role="button"
            @click="handleShowThinking"
          >
            <i class="icon icon-thinking-process" />
          </button>
          <button
            v-clean-tooltip="t('ai.message.actions.tooltip.copy')"
            class="bubble-action-btn btn header-btn role-tertiary"
            type="button"
            role="button"
            @click="handleCopy"
          >
            <i
              :class="{
                'icon icon-checkmark': showCopySuccess,
                'icon icon-copy': !showCopySuccess
              }"
            />
          </button>
          <button
            v-if="props.message.role === RoleEnum.User && !pendingConfirmation"
            v-clean-tooltip="t('ai.message.actions.tooltip.resend')"
            class="bubble-action-btn btn header-btn role-tertiary"
            type="button"
            role="button"
            @click="handleResendMessage"
          >
            <i class="icon icon-backup" />
          </button>
        </div>
        <div class="chat-msg-text">
          <div
            v-if="props.message.role === RoleEnum.Assistant && props.message.agentMetadata?.agent"
            class="chat-msg-selected-agent"
          >
            <span class="chat-msg-selected-agent-label">
              {{ props.message.agentMetadata?.agent?.displayName }} {{ t(`ai.agents.selectionMode.${ props.message.agentMetadata?.selectionMode || 'none' }`) }}
            </span>
          </div>
          <div v-if="!props.disabled && isThinking">
            <Processing
              data-testid="rancher-ai-ui-chat-message-thinking-label"
              :phase="MessagePhase.Thinking"
            />
          </div>
          <span v-if="props.message.showThinking">
            <br v-if="isThinking">
            <span
              v-if="props.message.formattedThinkingContent"
              v-clean-html="props.message.formattedThinkingContent"
            />
            <br>
          </span>
          <span
            v-if="!!props.message.summaryContent"
            v-clean-html="props.message.summaryContent"
          />
          <span
            v-if="props.message.formattedMessageContent && (!props.message.summaryContent || props.message.showCompleteMessage)"
            v-clean-html="props.message.formattedMessageContent"
            data-testid="rancher-ai-ui-chat-message-formatted-content"
            :class="{
              'chat-msg-user-expanded': !!props.message.summaryContent && props.message.showCompleteMessage
            }"
          />
        </div>
        <div
          v-if="props.message.suggestionActions?.length"
          class="chat-msg-section-footer"
        >
          <Suggestions
            :suggestions="props.message.suggestionActions"
            @select="(suggestion: string) => emit('send:message', suggestion)"
          />
        </div>
        <div
          v-if="props.message.confirmation"
          class="chat-msg-section-footer"
        >
          <Confirmation
            :value="props.message.confirmation"
            :message-content="props.message.messageContent"
            @confirm="emit('confirm:message', {
              message: props.message,
              result: $event
            })"
          />
        </div>
        <RcButton
          v-if="props.message.role === RoleEnum.Assistant && !!props.message.thinkingContent && props.message.showThinking"
          class="inline-button"
          small
          ghost
          @click="handleShowThinking"
        >
          <a>{{ t('ai.message.actions.hideThinking') }}</a>
        </RcButton>
        <RcButton
          v-if="!!props.message.summaryContent"
          class="inline-button"
          small
          ghost
          @click="handleShowCompleteMessage"
        >
          <a>{{ props.message.showCompleteMessage ? t('ai.message.actions.hideCompleteMessage') : t('ai.message.actions.showCompleteMessage') }}</a>
        </RcButton>
      </div>
      <div
        v-if="props.message.role === RoleEnum.User && props.message.contextContent?.length"
        class="chat-msg-section chat-msg-user-context-tags"
      >
        <ContextTag
          v-for="(item, index) in props.message.contextContent"
          :key="index"
          :item="item"
          :remove-enabled="false"
          type="user"
          class="chat-msg-user-context-tag"
        />
      </div>
      <div
        v-if="props.message.sourceLinks?.length"
        class="chat-msg-section"
      >
        <SourceLinks
          :links="props.message.sourceLinks"
        />
      </div>
      <div
        v-if="props.message.relatedResourcesActions?.length"
        class="chat-msg-section"
      >
        <Actions
          :label="t('ai.message.relatedResourcesActions.label')"
          :actions="props.message.relatedResourcesActions"
        />
      </div>
      <div
        v-if="props.message.actions?.length"
        class="chat-msg-section"
      >
        <Actions
          :label="t('ai.message.quickActions.label')"
          :actions="props.message.actions"
        />
      </div>
      <div
        v-if="props.message.timestamp"
        class="chat-msg-timestamp"
      >
        {{ props.message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
      </div>
    </div>
  </div>
</template>

<style lang='scss' scoped>
.chat-message {
  display: flex;
  gap: 8px;
}

.chat-msg-content {
  margin-right: 40px;
}

.chat-message-user {
  flex-direction: row-reverse;

  .chat-msg-content {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    margin: 0;
  }

  .chat-msg-text {
    color: var(--body-text);
  }
}

.chat-msg-bubble {
  position: relative;
  max-width: 455px;
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
  &:hover .chat-msg-bubble-actions {
    opacity: 1;
    pointer-events: auto;
  }
}

.chat-msg-bubble-user {
  background: var(--tertiary-hover);
  align-items: flex-end;
}

.chat-msg-bubble-error {
  background: var(--error-banner-bg);
  border-color: var(--error);
  color: var(--error-banner-text, var(--error));
}

.chat-msg-bubble-actions {
  position: absolute;
  top: -15px;
  right: -15px;
  display: flex;
  gap: 5px;
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.bubble-action-btn {
  background: var(--body-bg);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 2px 4px;
  box-shadow: 0 1px 4px 0 rgba(0,0,0,0.04);
  cursor: pointer;
  transition: border 0.15s, box-shadow 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  min-height: 24px;
  width: 24px;
  height: 24px;
}

.bubble-action-btn .icon {
  font-size: 14px;
  width: 14px;
  height: 14px;
}

.bubble-action-btn.header-btn {
  padding: 2px;
  min-width: 20px;
  min-height: 20px;
  width: 25px;
  height: 25px;
}

.bubble-action-btn.header-btn .icon {
  font-size: 12px;
  width: 12px;
  height: 12px;
}

.bubble-action-btn:hover {
  border: solid 1px var(--secondary-border, var(--primary));
  box-shadow: 0 2px 8px 0 rgba(61,152,211,0.10);
}

.chat-msg-text, :deep() pre {
  word-break: break-word;
  white-space: pre-line;
  list-style-position: inside;
}

.chat-msg-text {
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

.theme-dark .chat-msg-text :deep(code) {
  color: #C0EFDE;
}

.chat-msg-section {
  margin-top: 8px;
}

.chat-msg-section-footer {
  margin-top: 8px;
}

.chat-msg-timestamp {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 8px;
  margin-bottom: 8px;
  align-self: flex-end;
}

.icon-action-source {
  width: 16px;
  height: 16px;
  min-width: 16px;
  min-height: 16px;
  display: inline-block;
  vertical-align: middle;
}

.inline-button {
  margin-left: auto;
  height: 15px;
  min-height: 15px;
}

.chat-msg-user-expanded {
  display: block;
  margin-top: 16px;

  :deep() ul {
    padding: 0 0 0 8px;
    margin: 0;
    margin-top: -10px;
  }
}

.chat-msg-user-context-tags {
  display: flex;
  flex-wrap: wrap;
  max-width: 100%;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.chat-msg-selected-agent {
  margin-bottom: 4px;
}
.chat-msg-selected-agent-label {
  color: #BFC1D3;
  font-family: Lato;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 21px; /* 150% */
}
</style>
