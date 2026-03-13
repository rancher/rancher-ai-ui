<script lang="ts" setup>
import { useStore } from 'vuex';
import { useKeyboardShortcutsComposable } from '../composables/useKeyboardShortcutsComposable';
import {
  onMounted, onBeforeUnmount, computed, nextTick, ref,
  watch
} from 'vue';
import { PRODUCT_NAME } from '../product';
import {
  Agent, AgentState, AIServiceState, ConnectionPhase, FormattedMessage, HistoryChat, Message, MessagePhase, Role, StorageType
} from '../types';
import { useConnectionComposable } from '../composables/useConnectionComposable';
import { useChatMessageComposable } from '../composables/useChatMessageComposable';
import { useContextComposable } from '../composables/useContextComposable';
import { useHeaderComposable } from '../composables/useHeaderComposable';
import { useAIServiceComposable } from '../composables/useAIServiceComposable';
import { useChatApiComposable } from '../composables/useChatApiComposable';
import { useAgentComposable } from '../composables/useAgentComposable';
import { extractMessageText } from '../utils/label';
import Header from '../components/panels/Header.vue';
import Messages from '../components/panels/Messages.vue';
import Processing from '../components/Processing.vue';
import Context from '../components/panels/Context.vue';
import Console from '../components/panels/Console.vue';
import History from '../components/panels/History.vue';
import Chat from '../handlers/chat';
import DeleteChat from '../dialog/DeleteChatCard.vue';
import KeyboardShortcuts from '../components/header/KeyboardShortcuts.vue';
import AppModal from '@shell/components/AppModal.vue';
import { useInputComposable } from '../composables/useInputComposable';

/**
 * Chat panel landing page.
 */

const CHAT_ID = 'default';
const store = useStore();

const {
  hasPermissions,
  aiAgentDeploymentState,
  llmConfig,
  error: aiServiceError,
} = useAIServiceComposable();

const {
  agents,
  agentName,
  selectAgent,
} = useAgentComposable(CHAT_ID);

const {
  messages,
  messageBox,
  onopen,
  onmessage,
  onclose,
  sendMessage,
  updateMessage,
  confirmMessage,
  downloadMessages,
  loadMessages,
  selectContext,
  clearMessageBox,
  chatMetadata,
  isChatInitialized,
  resetChatMetadata,
  phase: messagePhase,
  error: chatError,
  resetErrors: resetChatErrors
} = useChatMessageComposable(
  CHAT_ID,
  hasPermissions,
  agents,
  agentName,
  selectAgent
);

const {
  fetchChats,
  fetchMessages,
  updateChat: updateHistoryChat,
  deleteChat: deleteHistoryChat,
} = useChatApiComposable(agents);

const {
  ws,
  connect,
  disconnect,
  setPhase,
  phase: connectionPhase,
  error: wsError
} = useConnectionComposable({
  onopen,
  onmessage,
  onclose,
});

const { context } = useContextComposable();

const {
  resize,
  close: closePanel,
  restore: restorePanel,
} = useHeaderComposable();

const showHistory = ref(false);
const chatHistory = ref<HistoryChat[]>([]);
const deletingChat = ref<HistoryChat | null>(null);

const chatAgents = computed<Agent[]>(() => {
  return agents.value.map((agent) => {
    const chatAgent = chatMetadata.value.agents?.find((a) => a.name === agent?.name);

    return {
      ...agent,
      status: (chatAgent && chatAgent.status !== AgentState.Active) || agent.status !== AgentState.Ready ? AgentState.Error : AgentState.Active,
    };
  });
});

// AI service's errors are priority over websocket and chat errors
const systemErrors = computed(() => {
  if (aiServiceError.value) {
    return [aiServiceError.value];
  } else if (chatError.value) {
    return [chatError.value];
  } else {
    return [
      wsError.value
    ].filter((e) => e);
  }
});

const disabled = computed(() => {
  return aiAgentDeploymentState.value !== AIServiceState.Active ||
    systemErrors.value.length > 0 ||
    messagePhase.value === MessagePhase.AwaitingConfirmation;
});

async function toggleHistoryPanel() {
  if (disabled.value) {
    return;
  }
  if (!showHistory.value) {
    chatHistory.value = await fetchChats();
  }
  showHistory.value = !showHistory.value;
}

async function updateChat(args:{ id: string, payload: Partial<HistoryChat> }) {
  const { id, payload } = args;

  await updateHistoryChat(id, payload);

  chatHistory.value = await fetchChats();
}

async function deleteChat() {
  if (deletingChat.value) {
    const id = deletingChat.value!.id;

    await deleteHistoryChat(id);

    if (id === chatMetadata.value.chatId) {
      ensureReconnectionAndLoadChat(null);
    } else {
      chatHistory.value = await fetchChats();
    }
  }
}

async function ensureReconnectionAndLoadChat(chatId: string | null) {
  showHistory.value = false;

  if (chatId && chatId === chatMetadata.value.chatId) {
    return;
  }

  const initChat = async() => {
    loadMessages(chatId ? await fetchMessages(chatId) : []);
    nextTick(() => {
      resetChatMetadata({ chatId });
      connect(chatId);
    });
  };

  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
    await initChat();
  } else {
    const unwatch = watch(
      () => ws.value,
      async(newWs) => {
        if (!newWs) {
          await initChat();
          unwatch();
        }
      }
    );

    disconnect(ConnectionPhase.Idle);
  }
}

function ensureConnectionAndSendMessage(data: string | Message) {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
    setPhase(ConnectionPhase.Reconnecting);

    const unwatch = watch(
      () => ws.value,
      (newWs) => {
        if (newWs && newWs.readyState === WebSocket.OPEN) {
          sendMessage(data, ws.value);
          unwatch();
        }
      }
    );

    connect(chatMetadata.value.chatId);
  } else {
    sendMessage(data, ws.value);
  }
}

function routeToSettings() {
  store.state.$router.push({
    name:   `c-cluster-settings-${ PRODUCT_NAME }`,
    params: { cluster: store.state.$route.params.cluster || 'local' },
  });
}

watch(() => aiAgentDeploymentState.value, (newState, oldState) => {
  const {
    chatId = null,
    storageType = StorageType.InMemory
  } = chatMetadata.value;

  resetChatErrors();

  /**
   * AI agent became active on mount or after a service state update - connect to the existing chat if there is one in memory, otherwise start a new one
   */
  if (oldState !== AIServiceState.Active && newState === AIServiceState.Active) {
    connect(storageType === StorageType.InMemory ? null : chatId);
  }

  /**
   * AI agent became inactive - disconnect and clear chat if it was stored in memory
   */
  if (oldState === AIServiceState.Active && newState !== AIServiceState.Active) {
    showHistory.value = false;

    if (storageType === StorageType.InMemory) {
      resetChatMetadata({ chatId: '' });
    }

    disconnect();
  }

  /**
   * Set the connection phase
   */
  if (!newState || newState === AIServiceState.NotFound) {
    setPhase(ConnectionPhase.Disconnected);
  } else if (newState !== AIServiceState.Active) {
    setPhase(!oldState || oldState === AIServiceState.NotFound ? ConnectionPhase.Connecting : ConnectionPhase.Reconnecting);
  }
});

watch(() => [
  messageBox.value,
  isChatInitialized.value,
  disabled.value
], (newValues, oldValues) => {
  const [, oldIsChatInitialized, oldDisabled] = oldValues || [];
  const [newMessage, newIsChatInitialized, newDisabled] = newValues;

  const isChatOpenAndNotReady = (newDisabled === true && oldDisabled === newDisabled) &&
    (newIsChatInitialized === false && oldIsChatInitialized === newIsChatInitialized);

  /**
   * If the chat is open but not ready (e.g. waiting for AI agent deployment),
   * clear the message box so that the message is not sent when the chat becomes ready
   *
   * This is false when the chat is closed and then is open with the message box already filled.
   */
  if (isChatOpenAndNotReady) {
    if (newMessage) {
      clearMessageBox();
    }

    return;
  }

  /**
   * If the chat is ready and the message box has content, send the message
   */
  if (!newDisabled && newIsChatInitialized && newMessage) {
    ensureConnectionAndSendMessage(newMessage);
  }
}, {
  immediate: true,
  deep:      true,
});

function openDeleteChatModal(chat: HistoryChat) {
  deletingChat.value = chat;
}

async function deleteCurrentChat() {
  if (!chatMetadata.value.chatId) {
    return;
  }

  let currentChat = chatHistory.value.find((c) => c.id === chatMetadata.value.chatId);

  if (!currentChat) {
    // Fetch the data to make sure the current chat is on the chat history
    chatHistory.value = await fetchChats();
    currentChat = chatHistory.value.find((c) => c.id === chatMetadata.value.chatId);
  }

  if (currentChat) {
    openDeleteChatModal(currentChat);
  }
}

function copyLastAssistantMessage() {
  const lastAssistantMessage = ([...messages.value] as FormattedMessage[])
    .reverse()
    .find((m: FormattedMessage) => m.role === Role.Assistant);

  if (!lastAssistantMessage) {
    return;
  }

  let text = extractMessageText(lastAssistantMessage);

  if (text) {
    if (lastAssistantMessage.summaryContent) {
      text = cleanInputAndTags(text);
    }

    navigator.clipboard.writeText(text);
  }
}

const { cleanInputAndTags } = useInputComposable();

const {
  handleKeydown,
  openShortcuts,
  keyboardShortcutsRef,
} = useKeyboardShortcutsComposable({
  disabled:          () => disabled.value,
  onNewChat:         () => ensureReconnectionAndLoadChat(null),
  onCopyLastMessage: copyLastAssistantMessage,
  onToggleHistory:   toggleHistoryPanel,
  onDeleteChat:      deleteCurrentChat,
});

onMounted(() => {
  // Ensure disconnection on browser refresh/close
  window.addEventListener('beforeunload', unmount);
});

onBeforeUnmount(() => {
  unmount();
  window.removeEventListener('beforeunload', unmount);
});

function unmount() {
  // Clear connection when websocket is disconnected and chat is manually closed
  if ((!Chat.isOpen(store) && !isChatInitialized.value)) {
    disconnect();
  }
  restorePanel();
}
</script>

<template>
  <div
    class="chat-container"
    data-testid="rancher-ai-ui-chat-container"
    tabindex="0"
    @keydown="handleKeydown"
  >
    <div
      class="resize-bar"
      @mousedown.prevent.stop="resize"
      @touchstart.prevent.stop="resize"
    />
    <div
      class="chat-panel"
      :data-testid="`rancher-ai-ui-chat-panel-${ isChatInitialized && ws?.readyState === 1 ? 'ready' : 'not-ready' }`"
    >
      <Header
        :disabled="disabled"
        :has-permissions="hasPermissions"
        @close:chat="closePanel"
        @config:chat="routeToSettings"
        @download:chat="downloadMessages"
        @shortcuts:chat="openShortcuts"
        @toggle:history="toggleHistoryPanel"
      />
      <Messages
        :active-chat-id="chatMetadata.chatId"
        :messages="messages"
        :system-errors="systemErrors"
        :disabled="hasPermissions && (systemErrors?.length > 0 || !isChatInitialized || aiAgentDeploymentState !== AIServiceState.Active)"
        :message-phase="hasPermissions ? messagePhase : MessagePhase.Idle"
        @update:message="updateMessage"
        @confirm:message="confirmMessage($event, ws)"
        @send:message="sendMessage($event, ws)"
      />
      <Processing
        class="connection-processing-label text-label"
        :phase="connectionPhase"
        :show-progress="![
          ConnectionPhase.Connected,
          ConnectionPhase.Disconnected,
          ConnectionPhase.ConnectionClosed,
        ].includes(connectionPhase)"
      />
      <Context
        :value="!hasPermissions || systemErrors.length ? [] : context"
        :disabled="disabled"
        @select="selectContext"
      />
      <Console
        :active-chat-id="chatMetadata.chatId"
        :llm-config="llmConfig"
        :agents="chatAgents"
        :agent-name="agentName"
        :disabled="disabled"
        :messages="messages"
        :has-permissions="hasPermissions"
        @input:content="ensureConnectionAndSendMessage($event)"
        @select:agent="selectAgent"
      />
      <KeyboardShortcuts ref="keyboardShortcutsRef" />
      <History
        :chats="chatHistory"
        :active-chat-id="chatMetadata.chatId"
        :open="showHistory && !disabled"
        @close:panel="showHistory = false"
        @create:chat="ensureReconnectionAndLoadChat(null)"
        @open:chat="ensureReconnectionAndLoadChat"
        @update:chat="updateChat"
        @confirm:delete:chat="openDeleteChatModal"
      />
    </div>
  </div>
  <app-modal
    v-if="!!deletingChat"
    :width="400"
    height="auto"
  >
    <DeleteChat
      :name="deletingChat.name"
      @confirm="deleteChat"
      @close="deletingChat = null"
    />
  </app-modal>
</template>

<style lang='scss' scoped>
.chat-container {
  display: flex;
  flex-direction: row;
  height: calc(100vh - 55px);
  position: relative;
  z-index: 20;
  outline: none;

  :deep(.disabled-panel) {
    opacity: 0.5;
    pointer-events: none;
  }
}

.chat-panel {
  width: 100%;
  background: var(--box-bg);
  /* box-shadow: 0 4px 24px 0 rgba(0,0,0,0.10); */
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  font-family: 'Inter', Arial, sans-serif;
}

.resize-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  cursor: ew-resize;
  background: transparent;
  transition: background 0.2s;
  z-index: 20;
  opacity: 0;

  &:hover {
    background: var(--primary);
    opacity: 1;
  }
}

.connection-processing-label {
  color: var(--active-nav);
  font-family: "Inter", Arial, sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
  padding: 12px 18px;
}
</style>
