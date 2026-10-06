<script setup lang="ts">
import {
  computed, type PropType, ref, watch, onBeforeUnmount
} from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { StateColor } from '@shell/utils/style';
import StatusBar from '@shell/components/Resource/Detail/StatusBar.vue';
import { Agent, MessagePlanning, MessagePlanningStatus } from '../../../types';
import ContextTag from '../../context/ContextTag.vue';
import RcButton from '@components/RcButton/RcButton.vue';

const STATUS_ICON: Record<MessagePlanningStatus, string> = {
  [MessagePlanningStatus.Pending]:       'icon-spinner',
  [MessagePlanningStatus.InProgress]:    'icon-chevron-right',
  [MessagePlanningStatus.Completed]:     'icon-checkmark',
  [MessagePlanningStatus.Canceling]:     'icon-close',
  [MessagePlanningStatus.Canceled]:      'icon-close',
  [MessagePlanningStatus.Failed]:        'icon-error',
  [MessagePlanningStatus.NotApplicable]: 'icon-minus',
};

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  value: {
    type:     Object as PropType<MessagePlanning>,
    required: true,
  },
  agents: {
    type:     Array as PropType<Agent[]>,
    default:  () => [],
  },
  disabled: {
    type:     Boolean,
    default:  false,
  },
});

const emit = defineEmits(['confirm']);

const stickyWithDelay = ref(false);
let timeout: NodeJS.Timeout | null = null; // eslint-disable-line no-undef

const items = computed(() => (props.value.tasks || []).map(({ task, agent: agentName, status }) => {
  const agent = props.agents.find((a) => a.name === agentName);

  return {
    task,
    agent:  agent?.displayName || agent?.name || agentName,
    status: status || MessagePlanningStatus.Pending,
  };
}));

const spinningStatus = computed(() => props.value.status === MessagePlanningStatus.Pending ||
  props.value.status === MessagePlanningStatus.InProgress ||
  props.value.status === MessagePlanningStatus.Canceling);
const inactiveStatus = computed(() => props.value.status === MessagePlanningStatus.Canceling || props.value.status === MessagePlanningStatus.Canceled);

const segments = computed<Array<{ color: StateColor; percent: number }>>(() => {
  const totalTasks = props.value.tasks?.length || 0;

  const completedTasks = props.value.tasks?.filter((task) => task.status === MessagePlanningStatus.Completed).length || 0;
  const remainingTasks = totalTasks - completedTasks;

  // Determine the colors for the active and empty segments based on the inactive status
  const fillColor = inactiveStatus.value ? 'disabled' : 'info';
  const emptyColor = inactiveStatus.value ? 'rc-disabled-background' : 'disabled';

  // Initial progress bar segments, start with a minimal filled portion to indicate liveness
  // Otherwise, calculate the actual percentages based on completed and remaining tasks
  const fillPercent = completedTasks > 0 ? completedTasks / totalTasks * 100 : 1;
  const emptyPercent = completedTasks > 0 ? remainingTasks / totalTasks * 100 : 99;

  return [{
    color:   fillColor,
    percent: fillPercent,
  }, {
    color:   emptyColor,
    percent: emptyPercent,
  }] as Array<{ color: StateColor; percent: number }>;
});

watch(() => props.value.status, (newStatus) => {
  clearStickyTimeout();

  const shouldStick = (
    newStatus === MessagePlanningStatus.Pending ||
    newStatus === MessagePlanningStatus.InProgress ||
    newStatus === MessagePlanningStatus.Canceling
  );

  if (shouldStick) {
    // Apply sticky immediately
    stickyWithDelay.value = true;
  } else {
    // Remove sticky after a delay of 2 seconds
    timeout = setTimeout(() => {
      stickyWithDelay.value = false;
    }, 2000);
  }
}, { immediate: true });

function clearStickyTimeout() {
  if (timeout) {
    clearTimeout(timeout);
    timeout = null;
  }
}

onBeforeUnmount(() => {
  clearStickyTimeout();
});
</script>

<template>
  <div
    v-if="items.length"
    class="planning-state-container"
    :class="{
      'disabled-panel': props.disabled,
      'sticky': !props.disabled && stickyWithDelay
    }"
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
      :class="[
        'planning-state-item',
        `planning-state-status-${ props.value.status === MessagePlanningStatus.Canceling || props.value.status === MessagePlanningStatus.Canceled ? MessagePlanningStatus.Canceling : item.status }`
      ]"
    >
      <i
        v-if="item.status"
        :class="{
          'icon': true,
          'icon-spin': item.status === MessagePlanningStatus.Pending && spinningStatus,
          [STATUS_ICON[item.status]]: true,
        }"
      />
      <span class="label">
        {{ item.task }}
      </span>
      <ContextTag
        v-if="item.agent"
        :item="{
          valueLabel: item.agent
        }"
        :remove-enabled="false"
        type="user"
        class="agent"
      />
    </div>
    <template v-if="props.value.approval">
      <div
        v-if="!props.value.status || props.value.status === MessagePlanningStatus.Pending"
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
      <div
        v-else-if="props.value.status === MessagePlanningStatus.InProgress"
        class="planning-state-actions"
      >
        <RcButton
          small
          variant="tertiary"
          class="cancel-button"
          @click="emit('confirm', false)"
        >
          <span class="rc-button-label">
            {{ t('ai.planning.actions.cancelRunning') }}
          </span>
        </RcButton>
      </div>
      <div
        v-else
        :class="[
          'planning-state-result',
          `planning-state-status-${ props.value.status }`
        ]"
      >
        <i :class="['icon', STATUS_ICON[props.value.status]]" />
        <span class="label">
          {{ t(`ai.planning.status.${ props.value.status }`) }}
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.planning-state {
  &-progress {
    user-select: none;
  }

  &-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    margin-bottom: 16px;
    background: var(--body-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    position: relative;
    transition: all 0.3s ease;

    &.sticky {
      position: sticky;
      top: 0;
      z-index: 10;
    }

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

  &-item, &-result {
    display: flex;
    align-items: center;
    line-height: 1.5;

    .label {
      word-break: break-word;
      white-space: pre-line;
      margin-right: auto;
    }

    .icon {
      line-height: 0.5;
      margin-right: 12px;
    }
  }

  &-item {
    gap: 8px;
  }

  &-result {
    margin-left: auto;
  }

  &-actions, &-result {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  &-actions {
    gap: 8px;

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

  &-status {
    &-in_progress, &-completed {
      .icon {
        color: var(--info);
      }
    }
    &-canceling {
      .icon, .label {
        opacity: 0.5;
      }
    }
    &-cancelled {
      .icon, .label {
        color: var(--error);
      }
    }
    &-failed {
      .icon, .label {
        color: var(--error);
      }
    }
  }
}
</style>
