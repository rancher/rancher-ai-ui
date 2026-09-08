<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { MessagePlanningItemStatus } from '../../types';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { MessagePlanningItem } from '../../types';

const store = useStore();
const { t } = useI18n(store);

const ICON_STATUS: Record<MessagePlanningItemStatus, string> = {
  [MessagePlanningItemStatus.Pending]:    '',
  [MessagePlanningItemStatus.InProgress]: 'icon-spinner icon-spin',
  [MessagePlanningItemStatus.Completed]:  'icon-checkmark',
  [MessagePlanningItemStatus.Error]:      'icon-warning',
};

const props = defineProps({
  items: {
    type:    Array as PropType<MessagePlanningItem[]>,
    default: () => ([] as MessagePlanningItem[]),
  },
});

const items = computed(() => props.items.map(({ content, status }) => ({
  content,
  icon: ICON_STATUS[status || MessagePlanningItemStatus.Pending],
})));
</script>

<template>
  <div
    v-if="items.length"
    class="planning-state-container"
  >
    <div class="planning-state-header">
      {{ t('ai.planning.header') }}
    </div>
    <div
      v-for="(item, index) in items"
      :key="index"
      class="planning-state-item"
    >
      <span class="planning-state-item-bullet">
        {{ index + 1 }}.
      </span>
      <span class="planning-state-item-content">
        {{ item.content }}
      </span>
      <i
        v-if="item.icon"
        :class="['icon', item.icon]"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.planning-state {
  &-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--disabled-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
  }

  &-item {
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1.5;

    &-content {
      word-break: break-word;
      white-space: pre-line;
    }

    .icon {
      line-height: 0.5;
    }
  }
}
</style>
