<script setup lang="ts">
import { PropType, reactive } from 'vue';
import { useStore } from 'vuex';
import { HistoryChat } from '../../types';
import RcButton from '@components/RcButton/RcButton.vue';
import HistoryHeader from '../history/HistoryHeader.vue';
import HistoryChatMenu from '../history/HistoryChatMenu.vue';

const store = useStore();
const t = store.getters['i18n/t'];

const props = defineProps({
  chats: {
    type:    Array as PropType<HistoryChat[]>,
    default: () => ([]),
  },
  activeChatId: {
    type:    String,
    default: null,
  },
  open: {
    type:    Boolean,
    default: false
  }
});

const emit = defineEmits([
  'close:panel',
  'create:chat',
  'open:chat',
  'delete:chat',
]);

const chatBtnHover = reactive<Record<string, boolean>>({});

function chatNameTooltip(chat: HistoryChat): string {
  let createdAt = '';

  if (chat.createdAt) {
    createdAt = new Date(chat.createdAt).toLocaleString([], {
      year:   'numeric',
      month:  '2-digit',
      day:    '2-digit',
      hour:   '2-digit',
      minute: '2-digit'
    });
  }

  return t('ai.history.chat.items.nameTooltip', {
    name: chat.name || '',
    createdAt
  });
}

function createChat() {
  emit('create:chat');
}

function openChat(id: string) {
  emit('open:chat', id);
}
</script>

<template>
  <transition>
    <div
      v-if="props.open"
      class="history-panel-overlay"
      data-testid="rancher-ai-ui-chat-history-panel-overlay"
      @click.self="emit('close:panel')"
    >
      <div
        class="history-panel"
        data-testid="rancher-ai-ui-chat-history-panel"
      >
        <div class="history-header">
          <HistoryHeader
            @toggle:history="emit('close:panel')"
          />
        </div>
        <div class="history-body">
          <RcButton
            ref="createBtn"
            primary
            class="btn-create-chat"
            data-testid="rancher-ai-ui-chat-history-create-chat-button"
            @click="createChat"
            @keydown.enter.stop="createChat"
            @keydown.space.enter.stop="createChat"
          >
            <i class="icon icon-plus" />
            <span>{{ t('ai.history.chat.create') }}</span>
          </RcButton>
          <div class="history-chat-panel">
            <div class="history-chat-title">
              <span class="history-chat-title-label text-label">
                {{ t('ai.history.chat.previous') }}
              </span>
            </div>
            <div class="history-chat-list">
              <RcButton
                v-for="(chat, index) in props.chats"
                :key="chat.id"
                tertiary
                class="history-chat-item"
                :class="{ 'focused': props.activeChatId === chat.id }"
                :data-testid="`rancher-ai-ui-chat-history-chat-item-${ index }`"
                @click="openChat(chat.id)"
                @keydown.enter.stop="openChat(chat.id)"
                @keydown.space.enter.stop="openChat(chat.id)"
                @mouseover="chatBtnHover[chat.id] = true"
                @mouseleave="chatBtnHover[chat.id] = false"
              >
                <span
                  v-clean-tooltip="chatNameTooltip(chat)"
                  data-testid="rancher-ai-ui-chat-history-item-name"
                  class="chat-name"
                >
                  {{ chat.name }}
                </span>
                <HistoryChatMenu
                  v-if="chatBtnHover[chat.id]"
                  @click.stop
                  @delete:chat="emit('delete:chat', chat.id)"
                />
              </RcButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style lang="scss" scoped>
.history-panel-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 200;
  display: flex;
  align-items: stretch;
}

.history-panel {
  width: min(75%, 100vw);
  max-width: 90vw;
  height: 100vh;
  background: var(--body-bg);
  opacity: 0.95; /* semi-transparent background */
  box-shadow: 2px 0 8px rgba(0,0,0,0.08);
  padding: 0 0 0 0;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s cubic-bezier(.4,0,.2,1);
}

.history-header {
  height: 54px;
}

.history-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.history-chat-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-chat-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-chat-item {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 16px;
  padding: 0 16px;
}

.history-chat-title-label {
  font-family: Lato;
  font-size: 16px;
  font-style: normal;
  font-weight: 600;
  line-height: 24px;
}

.btn-create-chat {
  display: flex;
  flex-direction: row;
  justify-content: center;
  width: 100%;
  margin: 16px 0;
}

.chat-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: block;
}

@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

.slide-in-enter-active, .slide-in-leave-active {
  transition: all 0.3s cubic-bezier(.4,0,.2,1);
}

.slide-in-enter-from, .slide-in-leave-to {
  transform: translateX(-100%);
  opacity: 0.5;
}
</style>
