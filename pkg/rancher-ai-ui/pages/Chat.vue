<script lang="ts" setup>
import { useStore } from 'vuex';
import {
  onMounted, onBeforeUnmount, computed, nextTick, ref,
  watch
} from 'vue';
import { PRODUCT_NAME } from '../product';
import {
  Agent, AgentState, AIServiceState, ChatMetadata, ConnectionPhase, HistoryChat, MessagePhase, StorageType
} from '../types';
import { useConnectionComposable } from '../composables/useConnectionComposable';
import { useChatMessageComposable } from '../composables/useChatMessageComposable';
import { useContextComposable } from '../composables/useContextComposable';
import { useHeaderComposable } from '../composables/useHeaderComposable';
import { useAIServiceComposable } from '../composables/useAIServiceComposable';
import { useChatApiComposable } from '../composables/useChatApiComposable';
import { useAgentComposable } from '../composables/useAgentComposable';
import Header from '../components/panels/Header.vue';
import Messages from '../components/panels/Messages.vue';
import Processing from '../components/Processing.vue';
import Context from '../components/panels/Context.vue';
import Console from '../components/panels/Console.vue';
import History from '../components/panels/History.vue';
import Chat from '../handlers/chat';

/**
 * Chat panel landing page.
 */

const CHAT_ID = 'default';
const store = useStore();

const {
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
  onopen,
  onmessage,
  onclose,
  sendMessage,
  updateMessage,
  confirmMessage,
  downloadMessages,
  loadMessages,
  selectContext,
  resetErrors: resetMessageErrors,
  isChatInitialized,
  phase: messagePhase,
  error: messageError
} = useChatMessageComposable(CHAT_ID, agents, agentName, selectAgent);

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

const chatMetadata = computed<ChatMetadata>(() => {
  return store.getters['rancher-ai-ui/chat/metadata'] || {};
});

const chatAgents = computed<Agent[]>(() => {
  return agents.value.map((agent) => {
    const chatAgent = chatMetadata.value.agents?.find((a) => a.name === agent?.name);

    return {
      ...agent,
      status: (chatAgent && chatAgent.status !== AgentState.Active) || agent.status !== AgentState.Ready ? AgentState.Error : AgentState.Active,
    };
  });
});

// AI service's errors are priority over websocket and message errors
const errors = computed(() => {
  if (aiServiceError.value) {
    return [aiServiceError.value];
  } else {
    return [
      wsError.value,
      messageError.value
    ].filter((e) => e);
  }
});

const disabled = computed(() => {
  return aiAgentDeploymentState.value !== AIServiceState.Active ||
    errors.value.length > 0 ||
    messagePhase.value === MessagePhase.AwaitingConfirmation;
});

function close() {
  resetMessageErrors();
  closePanel();
}

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

async function deleteChat(id: string) {
  await deleteHistoryChat(id);

  if (id === chatMetadata.value.chatId) {
    ensureReconnectionAndLoadChat(null);
  } else {
    chatHistory.value = await fetchChats();
  }
}

async function ensureReconnectionAndLoadChat(chatId: string | null) {
  showHistory.value = false;

  if (chatId && chatId === chatMetadata.value.chatId) {
    return;
  }

  resetMessageErrors();

  const initChat = async() => {
    loadMessages(chatId ? await fetchMessages(chatId) : []);
    nextTick(() => {
      store.commit('rancher-ai-ui/chat/setMetadata', { chatId });
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

function ensureConnectionAndSendMessage(data: string) {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
    resetMessageErrors();
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

  /**
   * AI agent became active on mount or after a service state update - connect to the existing chat if there is one in memory, otherwise start a new one
   */
  if (oldState !== AIServiceState.Active && newState === AIServiceState.Active) {
    resetMessageErrors();

    connect(storageType === StorageType.InMemory ? null : chatId);
  }

  /**
   * AI agent became inactive - disconnect and clear chat if it was stored in memory
   */
  if (oldState === AIServiceState.Active && newState !== AIServiceState.Active) {
    showHistory.value = false;

    if (storageType === StorageType.InMemory) {
      store.commit('rancher-ai-ui/chat/setMetadata', {
        chatId:      '',
        agents:      null,
        storageType: null
      });
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
        @close:chat="close"
        @config:chat="routeToSettings"
        @download:chat="downloadMessages"
        @toggle:history="toggleHistoryPanel"
      />
      <Messages
        :active-chat-id="chatMetadata.chatId"
        :messages="messages"
        :errors="errors"
        :disabled="errors?.length > 0 || !isChatInitialized || aiAgentDeploymentState !== AIServiceState.Active"
        :message-phase="messagePhase"
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
        :value="context"
        :disabled="disabled"
        @select="selectContext"
      />
      <Console
        :llm-config="llmConfig"
        :agents="chatAgents"
        :agent-name="agentName"
        :disabled="disabled"
        @input:content="ensureConnectionAndSendMessage($event)"
        @select:agent="selectAgent"
      />
      <History
        :chats="chatHistory"
        :active-chat-id="chatMetadata.chatId"
        :open="showHistory && !disabled"
        @close:panel="showHistory = false"
        @create:chat="ensureReconnectionAndLoadChat(null)"
        @open:chat="ensureReconnectionAndLoadChat"
        @update:chat="updateChat"
        @delete:chat="deleteChat"
      />
    </div>
  </div>
</template>

<style lang='scss' scoped>
.chat-container {
  display: flex;
  flex-direction: row;
  height: calc(100vh - 55px);
  position: relative;
  z-index: 20;

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
