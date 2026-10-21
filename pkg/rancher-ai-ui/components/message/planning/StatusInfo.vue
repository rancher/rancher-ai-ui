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

const emit = defineEmits(['confirm', 'stop', 'collapse']);

const isCollapsed = ref(props.value.isCollapsed);
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

const planningHeader = computed(() => {
  const distinctAgents = Array.from(new Set((props.value.tasks || []).map(({ agent }) => agent)));

  const approvalKey = props.value.approval ? 'withApproval' : 'withoutApproval';
  const collapseKey = isCollapsed.value ? 'collapsed' : 'expanded';

  return t(`ai.planning.header.label.${ approvalKey }.${ collapseKey }.${ props.value.status }`, { count: distinctAgents.length });
});

const currentRunningTask = computed(() => {
  if (props.value.status === MessagePlanningStatus.InProgress) {
    return items.value.find((item) => item.status === MessagePlanningStatus.InProgress)?.task;
  }

  return null;
});

const displayHeader = computed(() => {
  if (isCollapsed.value && currentRunningTask.value) {
    return  t('ai.planning.header.executing', { task: currentRunningTask.value });
  }

  return planningHeader.value;
});

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
  emit('collapse', isCollapsed.value);
}

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

  // Collapse the panel when closing the chat
  if (!props.value.isCollapsed) {
    emit('collapse', true);
  }
});
</script>

<template>
  <div
    v-if="items.length"
    class="planning-state-container"
    :class="{
      'disabled-panel': props.disabled,
      'sticky': !props.disabled && stickyWithDelay,
      'collapsed': isCollapsed
    }"
    data-testid="rancher-ai-ui-planning-status-info-content"
  >
    <div class="planning-state-header">
      <span>
        {{ displayHeader }}
      </span>
      <RcButton
        size="small"
        variant="ghost"
        :aria-label="t(`ai.planning.actions.${ isCollapsed ? 'expand' : 'collapse' }`)"
        class="collapse-button"
        @click="toggleCollapse"
        @keydown.enter.space.stop="toggleCollapse"
      >
        <i :class="['icon', isCollapsed ? 'icon-chevron-down' : 'icon-chevron-up']" />
      </RcButton>
    </div>

    <div class="planning-state-progress">
      <StatusBar
        :segments="segments"
        class="align-center"
        aria-hidden="true"
      />
    </div>

    <div
      v-if="!isCollapsed"
      class="planning-state-content"
    >
      <div
        v-for="(item, index) in items"
        :key="index"
        :class="[
          'planning-state-item',
          `planning-state-status-${ props.value.status === MessagePlanningStatus.Canceling || props.value.status === MessagePlanningStatus.Canceled ? MessagePlanningStatus.Canceling : item.status }`
        ]"
        :data-testid="`rancher-ai-ui-planning-status-info-item-${index}`"
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
    </div>

    <template v-if="props.value.approval">
      <div
        v-if="!props.value.status || props.value.status === MessagePlanningStatus.Pending"
        class="planning-state-actions"
      >
        <RcButton
          small
          variant="tertiary"
          :aria-label="t('ai.planning.actions.cancel')"
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
          :aria-label="t('ai.planning.actions.confirm')"
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
          :aria-label="t('ai.planning.actions.cancelRunning')"
          class="cancel-button"
          @click="emit('stop')"
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
          `planning-state-result-${ isCollapsed ? 'collapsed' : 'expanded' }`,
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

  &-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    min-width: 0;

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }
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

  &-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: slideDown 0.3s ease-out;

    @keyframes slideDown {
      from {
        opacity: 0;
        max-height: 0;
      }
      to {
        opacity: 1;
        max-height: 1000px;
      }
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

  &-actions, &-result {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  &-result {
    margin-left: auto;

    &-collapsed {
      margin-top: 8px;
    }
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

.collapse-button {
  max-height: 16px;
  color: var(--on-tertiary, var(--primary));
}
</style>
