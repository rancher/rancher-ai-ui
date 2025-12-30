<script lang="ts" setup>
import { useStore } from 'vuex';
import {
  onMounted, onBeforeUnmount, computed, nextTick, ref
} from 'vue';
import { PRODUCT_NAME } from '../product';
import { HistoryChat, MessagePhase } from '../types';
import { useConnectionComposable } from '../composables/useConnectionComposable';
import { useChatMessageComposable } from '../composables/useChatMessageComposable';
import { useContextComposable } from '../composables/useContextComposable';
import { useHeaderComposable } from '../composables/useHeaderComposable';
import { useAgentComposable } from '../composables/useAgentComposable';
import { useChatHistoryComposable } from '../composables/useChatHistoryComposable';
import Header from '../components/panels/Header.vue';
import Messages from '../components/panels/Messages.vue';
import Context from '../components/panels/Context.vue';
import Console from '../components/panels/Console.vue';
import History from '../components/panels/History.vue';
import Chat from '../handlers/chat';

/**
 * Chat panel landing page.
 */

const store = useStore();

const { agent, error: agentError } = useAgentComposable();

const {
  messages,
  onopen,
  onmessage,
  sendMessage,
  updateMessage,
  confirmMessage,
  downloadMessages,
  loadMessages,
  selectContext,
  resetChatError,
  phase: messagePhase,
  error: messageError
} = useChatMessageComposable();

const {
  fetchChats,
  fetchMessages,
  deleteChat: deleteHistoryChat,
} = useChatHistoryComposable();

const {
  ws,
  connect,
  disconnect,
  error: wsError
} = useConnectionComposable({
  onopen,
  onmessage,
});

const { context } = useContextComposable();

const {
  resize,
  close: closePanel,
  restore,
} = useHeaderComposable();

const showHistory = ref(false);
const chatHistory = ref<HistoryChat[]>([]);

// Agent errors are priority over websocket and message errors
const errors = computed(() => {
  if (agentError.value) {
    return [agentError.value];
  } else {
    return [
      wsError.value,
      messageError.value
    ].filter((e) => e);
  }
});

function close() {
  resetChatError();
  closePanel();
}

async function toggleHistoryPanel() {
  if (errors.value.length > 0) {
    return;
  }
  if (!showHistory.value) {
    chatHistory.value = await fetchChats();
  }
  showHistory.value = !showHistory.value;
}

async function loadChat(chatId: string | null) {
  showHistory.value = false;
  resetChatError();
  disconnect({ showError: false });
  loadMessages(chatId ? await fetchMessages(chatId) : []);
  nextTick(() => {
    connect(chatId as string);
  });
}

async function deleteChat(chatId: string) {
  await deleteHistoryChat(chatId);
  chatHistory.value = await fetchChats();
  loadChat(null);
}

function routeToSettings() {
  store.state.$router.push({
    name:   `c-cluster-settings-${ PRODUCT_NAME }`,
    params: { cluster: store.state.$route.params.cluster || 'local' },
  });
}

onMounted(() => {
  connect();
  // Ensure disconnection on browser refresh/close
  window.addEventListener('beforeunload', unmount);
});

onBeforeUnmount(() => {
  unmount();
  window.removeEventListener('beforeunload', unmount);
});

function unmount() {
  // Clear connection when websocket is disconnected and chat is manually closed
  if ((!Chat.isOpen(store) && ws.value?.readyState !== WebSocket.OPEN)) {
    disconnect();
  }
  restore();
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
    <div class="chat-panel">
      <Header
        :disabled="errors.length > 0"
        @close:chat="close"
        @config:chat="routeToSettings"
        @download:chat="downloadMessages"
        @toggle:history="toggleHistoryPanel"
      />
      <Messages
        :messages="messages"
        :errors="errors"
        :message-phase="messagePhase"
        @update:message="updateMessage"
        @confirm:message="confirmMessage($event, ws)"
        @send:message="sendMessage($event, ws)"
      />
      <Context
        :value="context"
        :disabled="errors.length > 0"
        @select="selectContext"
      />
      <Console
        :disabled="!ws || ws.readyState === 3 || errors.length > 0 || messagePhase === MessagePhase.AwaitingConfirmation"
        :agent="agent"
        @input:content="sendMessage($event, ws)"
      />
      <History
        :chats="chatHistory"
        :open="showHistory && !errors.length"
        @close:panel="showHistory = false"
        @create:chat="loadChat(null)"
        @open:chat="loadChat"
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
</style>

<style lang='scss'>
.disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
