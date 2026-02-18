<script lang="ts" setup>
import debounce from 'lodash/debounce';
import { useStore } from 'vuex';
import {
  onMounted, onBeforeUnmount, computed, nextTick, ref,
  watch
} from 'vue';
import { PRODUCT_NAME } from '../product';
import { Agent, ChatMetadata, ConnectionPhase, HistoryChat, MessagePhase, StorageType } from '../types';
import { useConnectionComposable } from '../composables/useConnectionComposable';
import { useChatMessageComposable } from '../composables/useChatMessageComposable';
import { useContextComposable } from '../composables/useContextComposable';
import { useHeaderComposable } from '../composables/useHeaderComposable';
import { useAIServiceComposable } from '../composables/useAIServiceComposable';
import { useChatHistoryComposable } from '../composables/useChatHistoryComposable';
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
  resetChatError,
  isChatInitialized,
  phase: messagePhase,
  error: messageError
} = useChatMessageComposable(CHAT_ID, agents, agentName, selectAgent);

const {
  fetchChats,
  fetchMessages,
  updateChat: updateHistoryChat,
  deleteChat: deleteHistoryChat,
} = useChatHistoryComposable(agents);

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
  restore,
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
      status: (chatAgent && chatAgent.status !== 'active') || agent.status !== 'ready' ? 'error' : 'active',
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
  return !isChatInitialized.value ||
    errors.value.length > 0 ||
    messagePhase.value === MessagePhase.AwaitingConfirmation;
});

const debounceDisabled = ref(false);

watch(
  () => disabled.value,
  debounce((val) => {
    console.log('Console disabled state changed', val);
    debounceDisabled.value = val;
    showHistory.value = false;
  }, 300), // Avoids flickering on chat open
  { immediate: true }
);

function close() {
  resetChatError();
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

async function loadChat(chatId: string | null) {
  showHistory.value = false;
  if (chatId && chatId === chatMetadata.value.chatId) {
    return;
  }

  resetChatError();
  disconnect();
  loadMessages(chatId ? await fetchMessages(chatId) : []);
  nextTick(() => {
    store.commit('rancher-ai-ui/chat/setMetadata', { chatId });
    connect(chatId);
  });
}

async function updateChat(args:{ id: string, payload: Partial<HistoryChat> }) {
  const { id, payload } = args;

  await updateHistoryChat(id, payload);

  chatHistory.value = await fetchChats();
}

async function deleteChat(id: string) {
  await deleteHistoryChat(id);

  if (id === chatMetadata.value.chatId) {
    loadChat(null);
  } else {
    chatHistory.value = await fetchChats();
  }
}

function routeToSettings() {
  store.state.$router.push({
    name:   `c-cluster-settings-${ PRODUCT_NAME }`,
    params: { cluster: store.state.$route.params.cluster || 'local' },
  });
}

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
    console.log('WebSocket is already closed, skipping disconnect');
    disconnect();
  }
  restore();
}

watch(() => aiAgentDeploymentState.value, (newState, oldState) => {
  console.log('--- Deployment state changed', { oldState, newState } , connectionPhase.value);

  if (!oldState && newState === 'active') {
    connect();
  }

  if (newState && oldState && newState === 'active' && oldState !== 'active') {
    resetChatError();

    const { chatId = null, storageType = StorageType.InMemory } = store.getters['rancher-ai-ui/chat/metadata'] || {};
    connect(storageType === StorageType.InMemory ? null : chatId);
  } else if (oldState === 'active' && newState !== 'active') {
    disconnect();
  }

  if (newState === 'in-progress' || newState === 'updating') {
    if (oldState === 'not-found') {
      setPhase(ConnectionPhase.Connecting);
    } else {
      setPhase(ConnectionPhase.Reconnecting);
    }
  }

  if (newState === 'not-found') {
    setPhase(ConnectionPhase.Disconnected);
  }
});
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
      :data-testid="`rancher-ai-ui-chat-panel-${ isChatInitialized ? 'ready' : 'not-ready' }`"
    >
      <Header
        :disabled="debounceDisabled"
        @close:chat="close"
        @config:chat="routeToSettings"
        @download:chat="downloadMessages"
        @toggle:history="toggleHistoryPanel"
      />
      <Messages
        :active-chat-id="chatMetadata.chatId"
        :messages="messages"
        :is-chat-initialized="isChatInitialized"
        :errors="errors"
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
        ].includes(connectionPhase)"
      />
      <Context
        :value="context"
        :disabled="debounceDisabled"
        @select="selectContext"
      />
      <Console
        :llm-config="llmConfig"
        :agents="chatAgents"
        :agent-name="agentName"
        :disabled="debounceDisabled"
        @input:content="sendMessage($event, ws)"
        @select:agent="selectAgent"
      />
      <History
        :chats="chatHistory"
        :active-chat-id="chatMetadata.chatId"
        :open="showHistory && !debounceDisabled"
        @close:panel="showHistory = false"
        @create:chat="loadChat(null)"
        @open:chat="loadChat"
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
  color: #9fabc6;
  font-family: "Inter", Arial, sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0;
  padding: 16px;
}
</style>
