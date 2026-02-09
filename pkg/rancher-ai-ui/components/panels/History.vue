<script setup lang="ts">
import { PropType, reactive, ref, nextTick } from 'vue';
import { useStore } from 'vuex';
import { useShell } from '@shell/apis';
import { useI18n } from '@shell/composables/useI18n';
import { HistoryChat } from '../../types';
import RcButton from '@components/RcButton/RcButton.vue';
import HistoryHeader from '../history/HistoryHeader.vue';
import HistoryChatMenu from '../history/HistoryChatMenu.vue';
import DeleteChat from '../../dialog/DeleteChatCard.vue';

const store = useStore();
const { t } = useI18n(store);
const shellApi = useShell();

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
  'update:chat',
  'delete:chat',
]);

const chatBtnHover = reactive<Record<string, boolean>>({});
const editingChat = ref<Partial<HistoryChat> | null>(null);

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

  let name = '';

  if (chat.name) {
    name = chat.name.replaceAll('\n', '<br>').slice(0, 500).trim();
  }

  return t('ai.history.chat.items.nameTooltip', {
    name,
    createdAt
  }, true);
}

function createChat() {
  emit('create:chat');
}

function openChat(id: string) {
  if (!!editingChat.value) {
    return;
  }

  emit('open:chat', id);
}

function openDeleteChatModal(chat: HistoryChat) {
  shellApi.modal.open(DeleteChat, {
    props: {
      name:      chat.name,
      onConfirm: () => emit('delete:chat', chat.id),
    },
    width: '400px',
  });
}

function updateChatName(chat: Partial<HistoryChat>) {
  editingChat.value = { ...chat };

  nextTick(() => {
    const input = document.getElementById('history-chat-name-edit-input');

    input?.focus();
  });
}

function confirmEdit(chat: HistoryChat) {
  const id = editingChat.value?.id;
  const name = editingChat.value?.name?.trim();

  if (id && name && chat.name !== name) {
    chat.name = name; // update local copy to avoid flicker
    emit('update:chat', {
      id,
      payload: { name }
    });
  }

  dismissEdit();
}

function dismissEdit() {
  editingChat.value = null;
}
</script>

<template>
  <transition name="slide-in">
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
          <div
            v-if="props.chats.length > 0"
            class="history-chat-panel"
          >
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
                :class="{
                  'focused': props.activeChatId === chat.id || editingChat?.id === chat.id
                }"
                :data-testid="`rancher-ai-ui-chat-history-chat-item-${ index }`"
                @click="openChat(chat.id)"
                @keydown.enter.stop="openChat(chat.id)"
                @keydown.space.enter.stop="openChat(chat.id)"
                @mouseover="chatBtnHover[chat.id] = true"
                @mouseleave="chatBtnHover[chat.id] = false"
              >
                <input
                  v-if="editingChat?.id === chat.id"
                  id="history-chat-name-edit-input"
                  v-model="editingChat.name"
                  data-testid="rancher-ai-ui-chat-history-item-name-input"
                  class="history-chat-name-edit"
                  type="text"
                  :maxlength="64"
                  autocomplete="off"
                  @blur="confirmEdit(chat)"
                  @keydown.enter.stop.prevent="confirmEdit(chat)"
                  @keydown.esc.stop.prevent="dismissEdit"
                />
                <span
                  v-else
                  v-clean-tooltip="chatNameTooltip(chat)"
                  v-clean-html="chat.name"
                  data-testid="rancher-ai-ui-chat-history-item-name"
                  class="history-chat-name"
                />
                <HistoryChatMenu
                  v-if="chatBtnHover[chat.id]"
                  @click.stop
                  @update:chat="updateChatName(chat)"
                  @delete:chat="openDeleteChatModal(chat)"
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
  display: flex;
  flex-direction: column;
}

.history-header {
  height: 54px;
}

.history-body {
  padding: 16px;
  overflow: hidden;
}

.history-chat-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  max-height: calc(100vh - 250px);
  padding-bottom: 8px;
}

.history-chat-item {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 16px;
  padding: 0 16px;
  flex-shrink: 0;
}

.history-chat-title-label {
  font-family: Lato;
  font-size: 16px;
  font-style: normal;
  font-weight: 600;
  line-height: 24px;
  display: block;
  margin-bottom: 12px;
}

.btn-create-chat {
  display: flex;
  flex-direction: row;
  justify-content: center;
  width: 100%;
  margin: 16px 0 28px 0;
}

.history-chat-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: block;
}

.history-chat-name-edit {
  padding: 2px;
  border-radius: 4px;
  border: 1px solid var(--border);
}

.slide-in-enter-active, .slide-in-leave-active {
  transition: all 0.3s cubic-bezier(.4,0,.2,1);
}

.slide-in-enter-from, .slide-in-leave-to {
  transform: translateX(-100%);
}
</style>