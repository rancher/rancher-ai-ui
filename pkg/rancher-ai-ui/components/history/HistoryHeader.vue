<script lang="ts" setup>
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import RcButton from '@components/RcButton/RcButton.vue';

const store = useStore();
const { t } = useI18n(store);

type Props = {
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), { disabled: false });

const emit = defineEmits([
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
  <div
    class="chat-header"
  >
    <div class="chat-title">
      <div class="chat-name">
        <div
          class="chat-history-btn"
          :class="{ 'disabled-panel': props.disabled }"
        >
          <RcButton
            small
            ghost
            class="btn-open-history"
            data-testid="rancher-ai-ui-chat-history-header-button"
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
  </div>
</template>

<style lang="scss" scoped>
.chat-header {
  background: #A7BFF1;
  color: #3C57A3;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.theme-dark .chat-header {
  color: #fff;
  background: var(--category-active, var(--nav-active));

  .chat-history-btn:hover {
    background: color-mix(in srgb, var(--category-active, var(--nav-active)) 80%, #fff);
  }
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
    margin: 0;
    width: 60px;

    .label {
      font-size: 1.3em;
    }
  }
}

.chat-history-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;

  &.disabled {
    opacity: 1;
    pointer-events: none;
  }

  .btn-close {
    margin: 0 8px;
  }
}

.chat-history-btn:hover {
  background: color-mix(in srgb, #A7BFF1 80%, #fff);
}

.btn-close, .btn-open-history {
  margin: 0 !important;
}

.icon-close, .icon-menu {
  width: 32px;
}
</style>
