<script lang="ts" setup>
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import RcButton from '@components/RcButton/RcButton.vue';
import ChatPanelMenu from '../header/ChatPanelMenu.vue';

/**
 * Header panel for the AI chat interface.
 *
 * This is custom header for the AI chat, replacing the default shell WindowManager header.
 */

const store = useStore();
const { t } = useI18n(store);

type Props = {
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), { disabled: false });

const emit = defineEmits([
  'close:chat',
  'download:chat',
  'show:help',
  'config:chat',
  'toggle:history',
]);

function toggleHistory() {
  if (props.disabled) {
    return;
  }
  emit('toggle:history');
}
</script>

<template>
  <div class="chat-header">
    <div class="chat-title">
      <div class="chat-name">
        <div
          class="chat-history-btn"
          :class="{ disabled }"
        >
          <RcButton
            small
            ghost
            class="btn-open-history"
            data-testid="rancher-ai-ui-chat-history-button"
            @click="toggleHistory"
            @keydown.enter.stop="toggleHistory"
            @keydown.space.enter.stop="toggleHistory"
          >
            <i
              class="icon icon-menu"
            />
          </RcButton>
        </div>
        <span class="label">
          {{ t('ai.header.title') }}
        </span>
      </div>
    </div>
    <div class="chat-menu">
      <ChatPanelMenu
        @download:chat="emit('download:chat')"
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
        @click="emit('close:chat')"
        @keydown.enter.stop="emit('close:chat')"
        @keydown.space.enter.stop="emit('close:chat')"
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
  padding: 12px;
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
    gap: 8px;
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

.chat-close-btn, .chat-history-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
  .btn-close {
    margin: 0 8px;
  }
}

.chat-history-btn {
  &.disabled {
    opacity: 1;
    pointer-events: none;
  }
}

.chat-close-btn:hover, .chat-history-btn:hover {
  background: var(--active-hover);
}

.btn-close, .btn-open-history {
  margin: 0 !important;
}

.icon-close, .icon-menu {
  width: 32px;
}
</style>
