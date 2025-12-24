<script lang="ts" setup>
import { useStore } from 'vuex';
import RcButton from '@components/RcButton/RcButton.vue';
import ChatMenu from '../header/ChatMenu.vue';

/**
 * Header panel for the AI chat interface.
 *
 * This is custom header for the AI chat, replacing the default shell WindowManager header.
 */

const store = useStore();
const t = store.getters['i18n/t'];

const emit = defineEmits([
  'close',
  'download:chat',
  'reset:chat',
  'show:help',
  'config:chat'
]);
</script>

<template>
  <div class="chat-header">
    <div class="chat-title">
      <div class="chat-name">
        <i class="icon icon-ai icon-lg" />
        <span class="label">
          {{ t('ai.header.title') }}
        </span>
      </div>
    </div>
    <div class="chat-menu">
      <ChatMenu
        @download:chat="emit('download:chat')"
        @reset:chat="emit('reset:chat')"
        @show:help="emit('show:help')"
        @config:chat="emit('config:chat')"
      />
    </div>
    <div class="chat-close-btn">
      <RcButton
        small
        ghost
        class="btn-close"
        data-testid="rancher-ai-ui-chat-close-button"
        @click="emit('close')"
        @keydown.enter.stop="emit('close')"
        @keydown.space.enter.stop="emit('close')"
      >
        <i
          class="icon icon-close"
        />
      </RcButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chat-header {
  background: var(--active-nav);
  color: var(--on-active);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.chat-title {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  min-width: 0; /* allow children to shrink so text-overflow works */
  flex: 1;

  .chat-name {
    display: flex;
    gap: 12px;
    align-items: center;
    font-weight: 600;
    font-size: 1em;
    color: var(--on-active);
    margin: 0;
    width: 60px;

    .label {
      font-size: 1.3em;
    }
  }
}

.chat-close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
  .btn-close {
    margin: 0 8px;
  }
}

.chat-close-btn:hover {
  background: var(--active-hover);
}

.btn-close {
  margin: 0 !important;
}

.icon-close {
  width: 32px;
}
</style>
