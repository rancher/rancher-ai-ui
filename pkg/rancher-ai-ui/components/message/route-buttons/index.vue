<script setup lang="ts">
import { type PropType } from 'vue';
import { MessageAction } from '../../../types';
import RouteButton from './RouteButton.vue';

const props = defineProps({
  label: {
    type:    String,
    default: '',
  },
  actions: {
    type:    Array as PropType<MessageAction[]>,
    default: () => ([] as MessageAction[]),
  },
});
</script>

<template>
  <div class="chat-actions-container">
    <div class="chat-msg-action-title">
      <span>{{ props.label || 'ACTIONS' }}</span>
    </div>
    <div class="chat-msg-actions-container">
      <div class="chat-msg-action-tags">
        <div
          v-for="(action, index) in props.actions"
          :key="index"
          class="mt-2 chat-msg-actions"
        >
          <RouteButton
            :value="action"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang='scss' scoped>
.chat-msg-action-title {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--on-secondary);

  span {
    font: 9px sans-serif;
    font-weight: 500;
  }
}

.chat-msg-actions-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-msg-action-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.chat-msg-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}
</style>
