<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { MessagePlanningState, MessagePlanningTaskStatus } from '../../types';

const store = useStore();
const { t } = useI18n(store);

const ICON_STATUS: Record<MessagePlanningTaskStatus, string> = {
  [MessagePlanningTaskStatus.Pending]:    '',
  [MessagePlanningTaskStatus.InProgress]: 'icon-spinner icon-spin',
  [MessagePlanningTaskStatus.Completed]:  'icon-checkmark',
  [MessagePlanningTaskStatus.Error]:      'icon-warning',
};

const props = defineProps({
  value: {
    type:     Object as PropType<MessagePlanningState>,
    required: true,
  },
});

const items = computed(() => (props.value?.tasks || []).map(({ task, agent, status }) => ({
  task,
  agent,
  icon: ICON_STATUS[status || MessagePlanningTaskStatus.Pending],
})));
</script>

<template>
  <div
    v-if="items.length"
    class="planning-state-container"
  >
    <div class="planning-state-header">
      {{ t('ai.planning.header') }} - {{ props.value?.approval ? 'Approval required' : 'No approval' }}
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
        {{ item.task }}
      </span>
      <i
        v-if="item.icon"
        :class="['icon', item.icon]"
      />
      <span>
        {{ item.agent || '-' }}
      </span>
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
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: -26px; // +1 pixel is for the border offset
      left: -1px;
      right: -1px;
      height: 25px;
      background: var(--box-bg);
    }

    &::after {
      content: '';
      position: absolute;
      bottom: -21px; // +1 pixel is for the border offset
      left: -1px;
      right: -1px;
      height: 20px;
      background: linear-gradient(180deg, var(--box-bg) 25%, transparent 100%);
    }
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
