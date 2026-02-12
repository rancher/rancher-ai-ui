<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { Message } from '../../../types';
import Suggestions from '../Suggestions.vue';
import { formatMessageContent } from '../../../utils/format';
// @ts-expect-error FIXME: Cannot find module '../../../assets/liz-icon.svg'... Remove this comment to see the full error message
import lizIcon from '../../../assets/liz-icon.svg';

const store = useStore();
const { t } = useI18n(store);

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

const emit = defineEmits(['send:message']);

const user = computed(() => {
  const principal = props.message.templateContent?.content?.principal;

  const out = { name: principal?.name || 'User' };

  if (principal?.loginName === 'admin') {
    out.name = principal?.loginName;
  }

  return out;
});
</script>

<template>
  <div
    class="chat-welcome-message"
    :class="{ 'disabled-panel': props.disabled }"
  >
    <div class="chat-welcome-msg-splash">
      <div class="chat-welcome-msg-avatar-panel">
        <div class="chat-welcome-msg-avatar-circle">
          <img
            :src="lizIcon"
            alt="Liz Avatar"
            width="70"
            height="70"
          />
        </div>
        <div class="chat-welcome-msg-greeting">
          <span class="chat-welcome-msg-greeting-bubble">
            {{ t('ai.message.system.welcome.greetings.line3', { name: user.name }, true) }}
          </span>
        </div>
      </div>
      <div class="chat-welcome-msg-text-panel">
        <span>
          {{ t('ai.message.system.welcome.greetings.line1', {}, true) }}
        </span>
        <span>
          {{ t('ai.message.system.welcome.greetings.line2') }}
        </span>
      </div>
    </div>
    <div
      v-if="props.message.templateContent?.content?.message"
      class="chat-welcome-msg-bubble"
    >
      <div class="chat-welcome-msg-text">
        <span
          v-clean-html="formatMessageContent(props.message.templateContent?.content?.message || '')"
        />
      </div>
    </div>
    <div
      v-if="props.message.completed && props.message.messageContent"
      class="chat-welcome-msg-bubble"
    >
      <div class="chat-welcome-msg-text">
        <span>
          {{ props.message.messageContent }}
        </span>
      </div>
    </div>
    <div
      v-if="props.message.completed && props.message.suggestionActions?.length"
      class="chat-welcome-msg-bubble chat-welcome-suggestions"
    >
      <div class="chat-welcome-msg-text">
        <Suggestions
          :label="t('ai.message.system.welcome.suggestions.label')"
          :suggestions="props.message.suggestionActions"
          @select="(suggestion: string) => emit('send:message', suggestion)"
        />
      </div>
    </div>
  </div>
</template>

<style lang='scss' scoped>
.chat-welcome-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: auto;
}

.chat-welcome-msg-splash {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: 16px;
  margin-bottom: 24px;
}

.chat-welcome-msg-avatar-panel {
  display: grid;
  place-items: center;
  position: relative;
  width: 100%;
  max-width: 250px;
  min-width: 150px;
}

.chat-welcome-msg-greeting {
  position: relative;
  background-color: transparent;
  width: 100%;
  height: 104px;
  grid-area: 1 / 1;
  z-index: 20;
}

.chat-welcome-msg-avatar-circle {
  grid-area: 1 / 1;
  width: 75%;
  z-index: 10;
  position: absolute;

  display: flex;
  align-items: center;
  justify-content: center;
  width: 104px;
  height: 104px;
  position: relative;

  background: var(--body-bg);
  color: var(--body-text);
  border: 1px solid var(--border);
  border-radius: 90px;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04);
}

.chat-welcome-msg-greeting-bubble {
  position: absolute;
  top: 0px;
  right: 0px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #35B777;
  color: var(--body-text);
  white-space: nowrap;
  pointer-events: none;
  transform-origin: right center;
}

.chat-welcome-msg-text-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
  font-family: Lato;
  font-size: 18px;
  font-style: normal;
  font-weight: 600;
  line-height: 28px;
}

.chat-welcome-msg-bubble {
  position: relative;
  background: var(--body-bg);
  color: var(--body-text);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  line-height: 21px;
}

.chat-welcome-msg-text, :deep() pre {
  word-break: break-word;
  white-space: pre-line;
  list-style-position: inside;
}

</style>
