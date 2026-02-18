<script lang="ts" setup>
import {
  ref, computed, watch, nextTick, onMounted, onBeforeUnmount, type PropType,
} from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import {
  Message, FormattedMessage, Role, ChatError, MessageTemplateComponent, MessagePhase
} from '../../types';
import { formatMessageContent } from '../../utils/format';
import MessageComponent from '../message/index.vue';
import Welcome from '../message/template/Welcome.vue';
import SystemSuggestion from '../message/template/SystemSuggestion.vue';
import ScrollButton from '../ScrollButton.vue';
import Processing from '../Processing.vue';

/**
 * Messages panel displaying the chat messages.
 *
 * Everything related to message rendering and auto-scrolling is handled here.
 */

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  activeChatId: {
    type:    String,
    default: '',
  },
  messages: {
    type:    Array as PropType<Message[]>,
    default: () => [],
  },
  errors: {
    type:    Array as PropType<ChatError[]>,
    default: () => [],
  },
  isChatInitialized: {
    type:    Boolean,
    default: false,
  },
  messagePhase: {
    type:    String,
    default: '',
  }
});

const emit = defineEmits(['update:message', 'confirm:message', 'send:message']);

const messagesView = ref<HTMLDivElement | null>(null);
const autoScrollEnabled = ref(true);
const fastScrollEnabled = ref(false);

const formattedMessages = computed<FormattedMessage[]>(() => {
  return [...props.messages]
    .filter((m) => m.messageContent ||
      m.thinkingContent ||
      m.confirmation ||
      m.suggestionActions?.length ||
      m.templateContent
    )
    .map((m) => ({
      ...m,
      formattedMessageContent:  m.role === Role.Assistant || !!m.summaryContent ? formatMessageContent(m.messageContent || '') : m.messageContent,
      formattedThinkingContent: m.role === Role.Assistant ? formatMessageContent(m.thinkingContent || '') : '',
    }))
    .sort((a, b) => ((Number(a.timestamp) || 0) - (Number(b.timestamp) || 0)) || (`${ a.id  }`).localeCompare(`${ b.id  }`));
});

const errorMessages = computed<FormattedMessage[]>(() => {
  return props.errors.map((error) => ({
    role:                    Role.System,
    formattedMessageContent: error.message || t(error.key as string),
    timestamp:               new Date(),
    completed:               true,
    isError:                 true,
    actions:                 error.action ? [error.action] : []
  }));
});

const disabled = computed(() => props.errors.length > 0 || !props.isChatInitialized);

function getMessageTemplate(component: MessageTemplateComponent) {
  switch (component) {
  case MessageTemplateComponent.Welcome:
    return Welcome;
  case MessageTemplateComponent.SystemSuggestion:
    return SystemSuggestion;
  default:
    return null;
  }
}

function handleScroll() {
  const container = messagesView.value;

  if (!container) {
    return;
  }

  nextTick(() => {
    autoScrollEnabled.value = container.scrollTop + container.clientHeight >= container.scrollHeight - 2;
    fastScrollEnabled.value = container.scrollTop + container.clientHeight < container.scrollHeight - 150;
  });
}

function scrollToBottom() {
  if (!messagesView.value) {
    return;
  }

  messagesView.value.scrollTop = messagesView.value.scrollHeight;
}

// Watch activeChatId to handle auto-scroll and scroll button visibility when switching between chats
watch(
  () => props.activeChatId,
  (newVal, oldVal) => {
    if (oldVal && newVal !== oldVal) {
      nextTick(() => {
        handleScroll();
        scrollToBottom();
      });
    }
  }
);

// Watch both messages and messagePhase to handle auto-scroll when new messages arrive or phase changes
watch(
  () => [
    props.messages,
    props.messagePhase
  ],
  (neu, old) => {
    const newMsgs = (neu || [])[0] as Message[];
    const oldMsgs = (old || [])[0] as Message[];

    nextTick(() => {
      // Auto scroll only if enabled or if NEW user messages are added
      const doScroll = autoScrollEnabled.value || (oldMsgs && newMsgs && newMsgs.length > oldMsgs.length && newMsgs[newMsgs.length - 1].role === Role.User);

      if (doScroll) {
        scrollToBottom();
      }
    });
  },
  {
    immediate: true,
    deep:      true
  }
);

const stopErrorWatcher = watch(
  () => props.errors,
  (neu, old) => {
    nextTick(() => {
      if (messagesView.value && (neu || []).length > (old || []).length) {
        messagesView.value.scrollTop = messagesView.value.scrollHeight;
        stopErrorWatcher();
      }
    });
  },
  {
    immediate: true,
    deep:      true
  }
);

onMounted(() => {
  if (messagesView.value) {
    messagesView.value.addEventListener('scroll', handleScroll);
  }
});

onBeforeUnmount(() => {
  if (messagesView.value) {
    messagesView.value.removeEventListener('scroll', handleScroll);
  }
});
</script>

<template>
  <div
    ref="messagesView"
    class="chat-messages"
  >
    <template
      v-for="(message, i) in formattedMessages"
      :key="i"
    >
      <component
        :is="getMessageTemplate(message.templateContent?.component)"
        v-if="!!message.templateContent"
        :class="{
          'chat-message-template-welcome': formattedMessages.length > 1,
        }"
        :data-testid="`rancher-ai-ui-chat-message-box-${ message.id }`"
        :data-teststatus="`rancher-ai-ui-chat-message-status-${ message.id }-${ message.completed ? 'completed' : 'inprogress' }`"
        :disabled="disabled"
        :message="message"
        @update:message="emit('update:message', $event)"
        @send:message="emit('send:message', $event)"
      />
      <MessageComponent
        v-else
        :data-testid="`rancher-ai-ui-chat-message-box-${ message.id }`"
        :data-teststatus="`rancher-ai-ui-chat-message-status-${ message.id }-${ message.completed ? 'completed' : 'inprogress' }`"
        :message="message"
        :disabled="disabled"
        :pending-confirmation="messagePhase === MessagePhase.AwaitingConfirmation"
        @update:message="emit('update:message', $event)"
        @confirm:message="emit('confirm:message', $event)"
        @send:message="emit('send:message', $event)"
      />
    </template>
    <MessageComponent
      v-for="(error, i) in errorMessages"
      :key="i"
      :data-testid="`rancher-ai-ui-chat-error-message-box-${ i + 1 }`"
      :message="error"
    />
    <Processing
      v-if="!disabled"
      class="chat-message-processing-label text-label"
      :class="{
        /* It avoids pushing the System messages up (Welcome template) */
        'sticky-bottom': formattedMessages.filter((m: Message) => m.role === Role.User).length > 0
      }"
      :phase="messagePhase"
    />
    <ScrollButton
      v-if="fastScrollEnabled && !disabled"
      class="chat-message-fast-scroll"
      @scroll="scrollToBottom"
    />
  </div>
</template>

<style lang='scss' scoped>
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 12px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-message-template-welcome {
  margin-bottom: 16px;
}

.chat-message-fast-scroll {
  position: sticky;
  bottom: 0px;
  margin-left: auto;
}

.chat-message-processing-label {
  color: #9fabc6;
  font-family: "Inter", Arial, sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0;

  &.sticky-bottom {
    margin-top: auto;
  }
}
</style>
