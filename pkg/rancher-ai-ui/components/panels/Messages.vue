<script lang="ts" setup>
import {
  ref, computed, watch, onBeforeUnmount, type PropType, type ComponentPublicInstance
} from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import {
  Message, FormattedMessage, Role, ChatError, MessageTemplateComponent, MessagePhase,
  MessageInternalSource
} from '../../types';
import { formatMessageContent } from '../../utils/format';
import MessageComponent from '../message/index.vue';
import Welcome from '../message/template/Welcome.vue';
import NoPermission from '../message/template/NoPermissions.vue';
import SystemRequest from '../message/template/SystemRequest.vue';
import ScrollButton from '../ScrollButton.vue';
import Processing from '../Processing.vue';
import { useScrollComposable } from '../../composables/useScrollComposable';

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
  systemErrors: {
    type:    Array as PropType<ChatError[]>,
    default: () => [],
  },
  messagePhase: {
    type:    String,
    default: '',
  },
  layout: {
    type:    String,
    default: '',
  },
  disabled: {
    type:    Boolean,
    default: false,
  }
});

const emit = defineEmits(['update:message', 'confirm:message', 'send:message']);

const messagesView = ref<HTMLDivElement | null>(null);

const lastMessageContainer = ref<HTMLDivElement | null>(null);
const lastMessageObserver = ref<MutationObserver | null>(null);

// Ref callback to assign the last message container for auto-scrolling for each message/error list
const containerRef = (count: number, index: number) => {
  return (elem: Element | ComponentPublicInstance | null) => {
    if (index === count - 1) {
      lastMessageContainer.value = (elem as ComponentPublicInstance)?.$el || elem;
    }
  };
};

// Observes changes to the last message container to trigger auto-scrolling when content changes
function setupObserver(newContainer: HTMLDivElement | null) {
  // Clean up old observer
  if (lastMessageObserver.value) {
    lastMessageObserver.value.disconnect();
    lastMessageObserver.value = null;
  }

  // Setup new observer on the last message container
  if (newContainer) {
    lastMessageObserver.value = new MutationObserver(() => {
      const isUserMessage = props.messages && props.messages[props.messages.length - 1]?.role === Role.User;
      const isErrorMessage = props.systemErrors?.length > 0;

      scrollToBottom({ force: isUserMessage || isErrorMessage });
    });

    lastMessageObserver.value.observe(newContainer, {
      childList:     true,
      subtree:       true,
      characterData: true,
    });
  }
}

const {
  fastScrollEnabled,
  updateScrollState,
  scrollToBottom
} = useScrollComposable(
  messagesView,
  () => props.layout
);

const formattedMessages = computed<FormattedMessage[]>(() => {
  return [...props.messages]
    .filter((m) => m.messageContent ||
      m.thinkingContent ||
      m.confirmation ||
      m.templateContent
    )
    .map((m) => ({
      ...m,
      formattedMessageContent:  m.role === Role.Assistant || !!m.summaryContent ? formatMessageContent(m.messageContent || '') : m.messageContent,
      formattedThinkingContent: m.role === Role.Assistant ? formatMessageContent(m.thinkingContent || '') : '',
    }))
    .sort((a, b) => ((Number(a.timestamp) || 0) - (Number(b.timestamp) || 0)) || (`${ a.id  }`).localeCompare(`${ b.id  }`));
});

const systemErrorMessages = computed<FormattedMessage[]>(() => {
  return props.systemErrors.map((error) => ({
    role:                    Role.System,
    formattedMessageContent: error.message || t(error.key as string),
    timestamp:               new Date(),
    completed:               true,
    source:                  MessageInternalSource.Error,
    actions:                 error.action ? [error.action] : [],
    sourceLinks:             error.sourceLinks || []
  }));
});

function getMessageTemplate(component: MessageTemplateComponent) {
  switch (component) {
  case MessageTemplateComponent.Welcome:
    return Welcome;
  case MessageTemplateComponent.NoPermission:
    return NoPermission;
  case MessageTemplateComponent.SystemRequest:
    return SystemRequest;
  default:
    return null;
  }
}

// Scroll when the active chat changes
watch(
  () => props.activeChatId,
  (newVal, oldVal) => {
    if (newVal !== oldVal) {
      // Wait for the DOM to update with the new messages before scrolling
      requestAnimationFrame(() => {
        // Update scroll state to show/hide scroll button based on new content height
        updateScrollState();
        scrollToBottom({ force: true });
      });
    }
  },
  { immediate: true }
);

// Scroll when the phase changes
watch(
  () => props.messagePhase,
  () => scrollToBottom()
);

// Scroll when the last message/error changes (HTML content update)
watch(
  lastMessageContainer,
  (container) => setupObserver(container)
);

onBeforeUnmount(() => {
  // Cleanup observer
  if (lastMessageObserver.value) {
    lastMessageObserver.value.disconnect();
    lastMessageObserver.value = null;
  }
});
</script>

<template>
  <div
    ref="messagesView"
    class="chat-messages"
    data-testid="rancher-ai-ui-chat-messages"
  >
    <template
      v-for="(message, i) in formattedMessages"
      :key="i"
    >
      <component
        :is="getMessageTemplate(message.templateContent?.component)"
        v-if="!!message.templateContent"
        :ref="containerRef(formattedMessages.length, i)"
        :class="{
          'chat-message-template': formattedMessages.length > 1,
        }"
        :data-testid="`rancher-ai-ui-chat-message-box-${ message.id }`"
        :data-teststatus="`rancher-ai-ui-chat-message-status-${ message.id }-${ message.completed ? 'completed' : 'inprogress' }`"
        :disabled="props.disabled"
        :pending-confirmation="messagePhase === MessagePhase.AwaitingConfirmation"
        :message="message"
        @update:message="emit('update:message', $event)"
        @send:message="emit('send:message', $event)"
      />
      <MessageComponent
        v-else
        :ref="containerRef(formattedMessages.length, i)"
        :data-testid="`rancher-ai-ui-chat-message-box-${ message.id }`"
        :data-teststatus="`rancher-ai-ui-chat-message-status-${ message.id }-${ message.completed ? 'completed' : 'inprogress' }`"
        :message="message"
        :disabled="props.disabled"
        :pending-confirmation="messagePhase === MessagePhase.AwaitingConfirmation"
        @update:message="emit('update:message', $event)"
        @confirm:message="emit('confirm:message', $event)"
        @send:message="emit('send:message', $event)"
      />
    </template>
    <MessageComponent
      v-for="(error, i) in systemErrorMessages"
      :key="i"
      :ref="containerRef(systemErrorMessages.length, i)"
      :data-testid="`rancher-ai-ui-chat-system-error-message-box-${ i + 1 }`"
      :message="error"
      :disabled="false"
    />
    <Processing
      v-if="!props.disabled"
      class="chat-message-processing-label text-label"
      :class="{
        /* It avoids pushing the System messages up (Welcome template) */
        'sticky-bottom': formattedMessages.filter((m: Message) => m.role === Role.User).length > 0
      }"
      :phase="messagePhase"
    />
    <ScrollButton
      v-if="fastScrollEnabled && !props.disabled"
      class="chat-message-fast-scroll"
      @scroll="scrollToBottom({ force: true })"
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

.chat-message-template {
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
  padding-left: 4px;

  &.sticky-bottom {
    margin-top: auto;
  }
}
</style>
