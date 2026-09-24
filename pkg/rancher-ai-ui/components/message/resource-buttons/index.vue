<script setup lang="ts">
import {
  computed, nextTick, onBeforeUnmount, onMounted, type PropType, ref,
  useTemplateRef
} from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { MessageAction } from '../../../types';
import ResourceButton from './ResourceButton.vue';

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

const resourceButtonsRef = useTemplateRef('resourceButtonsRef');
const visibilityObserver = ref<IntersectionObserver | null>(null);
const isVisible = ref(false);

const batchesShown = ref(1);

const actions = computed(() => {
  const displayLimit = batchesShown.value * THRESHOLD;
  return props.actions.slice(0, displayLimit);
});

const remaining = computed(() => {
  const displayLimit = batchesShown.value * THRESHOLD;
  if (props.actions.length > displayLimit) {
    return props.actions.slice(displayLimit, displayLimit + THRESHOLD);
  }

  return [];
});

const toggleRemaining = () => {
  batchesShown.value += 1;
};

/**
 * Observe the visibility of the resource buttons container and update isVisible.
 * This is used to determine when to load the schema and resource for the buttons
 * to avoid unnecessary API calls when the buttons are not visible in the viewport.
 */
function observeButtonsVisibility() {
  visibilityObserver.value = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      isVisible.value = !!entry.isIntersecting;
    });
  }, { threshold: 0.1 });

  nextTick(() => {
    if (resourceButtonsRef.value) {
      visibilityObserver.value?.observe(resourceButtonsRef.value);
    }
  });
}

onMounted(observeButtonsVisibility);

onBeforeUnmount(() => {
  if (visibilityObserver.value) {
    visibilityObserver.value.disconnect();
    visibilityObserver.value = null;
  }
});
</script>

<template>
  <div class="chat-actions-container">
    <div class="chat-msg-action-title">
      <span>{{ props.label || 'ACTIONS' }}</span>
    </div>
    <div class="chat-msg-actions-container">
      <div
        ref="resourceButtonsRef"
        class="chat-msg-action-tags"
      >
        <div
          v-for="(action, index) in actions"
          :key="index"
          class="mt-2 chat-msg-actions"
        >
          <ResourceButton
            :value="action"
            :is-visible="isVisible"
          />
        </div>
      </div>
      <div class="chat-msg-actions-controls">
        <span
          v-if="remaining.length > 0"
          class="chat-msg-actions-show-more"
          @click="toggleRemaining"
        >
          {{ t('ai.message.actions.more', { count: remaining.length }, true) }}
          <i class="icon icon-sm icon icon-chevron-down text-label" />
        </span>
        <span
          v-if="batchesShown > 1"
          class="chat-msg-actions-show-less"
          @click="batchesShown -= 1"
        >
          {{ t('ai.message.actions.less', {}, true) }}
          <i class="icon icon-sm icon icon-chevron-up text-label" />
        </span>
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

.chat-msg-actions-controls {
  display: flex;
  gap: 8px;
  align-items: center;

  .chat-msg-actions-show-more,
  .chat-msg-actions-show-less {
    color: #94a3b8;
    cursor: pointer;
  }
}
</style>
