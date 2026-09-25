<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { StateColor } from '@shell/utils/style';
import StatusBar from '@shell/components/Resource/Detail/StatusBar.vue';
import { Agent, MessagePlanningState, MessagePlanningTaskStatus } from '../../types';
import ContextTag from '../context/ContextTag.vue';
import RcButton from '@components/RcButton/RcButton.vue';

const STATUS_ICON: Record<MessagePlanningTaskStatus, string> = {
  [MessagePlanningTaskStatus.Pending]:       'icon-spinner icon-spin',
  [MessagePlanningTaskStatus.InProgress]:    'icon-chevron-right',
  [MessagePlanningTaskStatus.Completed]:     'icon-checkmark',
  [MessagePlanningTaskStatus.Canceled]:      'icon-close',
  [MessagePlanningTaskStatus.NotApplicable]: 'icon-minus',
};

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  value: {
    type:     Object as PropType<MessagePlanningState>,
    required: true,
  },
  agents: {
    type:     Array as PropType<Agent[]>,
    default:  () => [],
  },
});

const emit = defineEmits(['confirm']);

const items = computed(() => (props.value.tasks || []).map(({ task, agent: agentName, status }) => {
  const agent = props.agents.find((a) => a.name === agentName);

  return {
    task,
    agent: agent?.displayName || agent?.name || agentName,
    icon:  STATUS_ICON[status || MessagePlanningTaskStatus.Pending],
  };
}));

const segments = computed<Array<{ color: StateColor; percent: number }>>(() => {
  const totalTasks = props.value.tasks?.length || 0;

  const completedTasks = props.value.tasks?.filter((task) => task.status === MessagePlanningTaskStatus.Completed).length || 0;
  const remainingTasks = totalTasks - completedTasks;

  // If no tasks are completed, show a full empty progress bar with a small filled portion to indicate liveness
  if (completedTasks === 0) {
    return [{
      color:   'info',
      percent: 1,
    }, {
      color:   'disabled',
      percent: 99,
    }];
  }

  return [{
    color:   'info',
    percent: completedTasks / totalTasks * 100,
  }, {
    color:   'disabled',
    percent: remainingTasks / totalTasks * 100,
  }];
});
</script>

<template>
  <div
    v-if="items.length"
    class="planning-state-container"
  >
    <div class="planning-state-header">
      {{ t(`ai.planning.header.${ props.value.approval ? 'approval' : 'simple' }`) }}
    </div>

    <div class="planning-state-progress">
      <StatusBar
        :segments="segments"
        class="align-center"
        aria-hidden="true"
      />
    </div>

    <div
      v-for="(item, index) in items"
      :key="index"
      class="planning-state-item"
    >
      <i
        v-if="item.icon"
        :class="['icon', item.icon]"
      />
      <span class="planning-state-item-label">
        {{ item.task }}
      </span>
      <ContextTag
        v-if="item.agent"
        :item="{
          valueLabel: item.agent
        }"
        :remove-enabled="false"
        type="user"
        class="planning-state-item-agent"
      />
    </div>
    <div
      v-if="props.value.approval"
      class="planning-state-actions"
    >
      <RcButton
        small
        variant="tertiary"
        class="cancel-button"
        @click="emit('confirm', false)"
      >
        <span class="rc-button-label">
          {{ t('ai.planning.actions.cancel') }}
        </span>
      </RcButton>
      <RcButton
        small
        variant="tertiary"
        class="confirm-button"
        @click="emit('confirm', true)"
      >
        <i class="icon icon-play" />
        <span class="rc-button-label">
          {{ t('ai.planning.actions.confirm') }}
        </span>
      </RcButton>
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
    background: var(--body-bg);
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
    line-height: 1.5;

    &-label {
      word-break: break-word;
      white-space: pre-line;
      margin-right: 8px;
    }

    .icon {
      line-height: 0.5;
      margin-right: 12px;

      &.icon-chevron-right {
        color: var(--info);
      }

      &.icon-checkmark {
        color: var(--success);
      }

      &.icon-close {
        color: var(--error);
      }
    }
  }

  &-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 24px;

    .cancel-button, .confirm-button {
      white-space: unset;

      .icon {
        margin-right: 8px;
      }
    }

    .cancel-button {
      background: transparent;
    }
  }
}
</style>
