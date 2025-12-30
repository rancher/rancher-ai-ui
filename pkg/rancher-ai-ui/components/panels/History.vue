<script setup lang="ts">
import {
  ref, watch, nextTick, PropType, reactive
} from 'vue';
import { HistoryChat } from '../../types';
import RcButton from '@components/RcButton/RcButton.vue';
import HistoryChatMenu from '../history/HistoryChatMenu.vue';

const props = defineProps({
  chats: {
    type:    Array as PropType<HistoryChat[]>,
    default: () => ([]),
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

const createBtn = ref();

watch(() => props.open, (val) => {
  if (val) {
    nextTick(() => {
      createBtn.value?.$el?.focus?.();
    });
  }
});

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
      @click.self="emit('close:panel')"
    >
      <div class="history-panel">
        <div class="history-body">
          <RcButton
            ref="createBtn"
            primary
            class="btn-create-chat"
            @click="createChat"
            @keydown.enter.stop="createChat"
            @keydown.space.enter.stop="createChat"
          >
            <i class="icon icon-plus" />
            <span>{{ t('ai.history.chat.create') }}</span>
          </RcButton>
          <div class="history-chat-panel">
            <div class="history-chat-title">
              <span class="history-chat-title-label">
                {{ t('ai.history.chat.previous') }}
              </span>
            </div>
            <div class="history-chat-list">
              <RcButton
                v-for="chat in props.chats"
                :key="chat.id"
                tertiary
                class="history-chat-item"
                :class="{ 'focused': chat.active }"
                @click="openChat(chat.id)"
                @keydown.enter.stop="openChat(chat.id)"
                @keydown.space.enter.stop="openChat(chat.id)"
                @mouseenter="chatBtnHover[chat.id] = true"
                @mouseleave="chatBtnHover[chat.id] = false"
              >
                <span class="chat-name">
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
  top: 54px;
  left: 0;
  width: 100%;
  height: calc(100% - 54px);
  z-index: 200;
  display: flex;
  align-items: stretch;
}

.history-panel {
  width: min(75%, 100vw);
  max-width: 90vw;
  height: 100vh;
  background: rgba(255, 255, 255, 0.85); /* semi-transparent background */
  box-shadow: 2px 0 8px rgba(0,0,0,0.08);
  padding: 0 0 0 0;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s cubic-bezier(.4,0,.2,1);
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
