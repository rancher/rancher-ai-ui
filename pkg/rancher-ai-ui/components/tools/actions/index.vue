<script setup lang="ts">
import { MessageAction } from '../../../types';
import { computed, type PropType, ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import Action from './Action.vue';

const THRESHOLD = 7; // Maximum number of actions for human readability

const store = useStore();
const { t } = useI18n(store);

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

const showRemaining = ref(false);

const actions = computed(() => {
  if (props.actions.length > THRESHOLD) {
    return props.actions.slice(0, THRESHOLD);
  }

  return props.actions;
});

const remaining = computed(() => {
  if (props.actions.length > THRESHOLD) {
    return props.actions.slice(THRESHOLD);
  }

  return [];
});

const toggleRemaining = () => {
  showRemaining.value = !showRemaining.value;
};
</script>

<template>
  <div class="chat-actions-container">
    <div class="chat-msg-action-title">
      <span>{{ props.label || 'ACTIONS' }}</span>
    </div>
    <div class="chat-msg-actions-container">
      <div class="chat-msg-action-tags">
        <div
          v-for="(action, index) in actions"
          :key="index"
          class="mt-2 chat-msg-actions"
        >
          <Action :value="action" />
        </div>
        <template v-if="showRemaining">
          <div
            v-for="(action, index) in remaining"
            :key="index"
            class="mt-2 chat-msg-actions"
          >
            <Action :value="action" />
          </div>
        </template>
      </div>
      <span
        v-if="remaining.length > 0"
        class="chat-msg-actions-more"
        @click="toggleRemaining"
      >
        <template v-if="!showRemaining">
          {{ t('ai.message.actions.more', { count: remaining.length }, true) }}
        </template>
        <template v-else>
          {{ t('ai.message.actions.less', {}, true) }}
        </template>
        <i
          class="icon icon-sm"
          :class="{
            'icon icon-chevron-down text-label': !showRemaining,
            'icon icon-chevron-up text-label': showRemaining,
          }"
        />
      </span>
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

.chat-msg-actions-more {
  color: #94a3b8;
  cursor: pointer;
}
</style>
