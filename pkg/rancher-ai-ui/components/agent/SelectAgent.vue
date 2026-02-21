<script setup lang="ts">
import { debounce } from 'lodash';
import { computed, ref, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { Agent } from '../../types';
import {
  RcDropdown,
  RcDropdownTrigger,
  RcDropdownItem,
} from '@components/RcDropdown';

const ADAPTIVE_MODE_ID = '__adaptive__';

interface AgentOption {
  name: string;
  displayName: string;
  description?: string;
  error: boolean;
  tooltip: string;
}

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  agents: {
    type: Array as PropType<Agent[]>,
    default() {
      return [];
    },
  },
  agentName: {
    type:    String,
    default: '',
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits(['select']);

const activeAgentNames = computed(() => props.agents.filter((agent) => agent.status === 'active').map((agent) => agent.name));

const options = computed<AgentOption[]>(() => {
  const defaultOptions = activeAgentNames.value.length > 1 ? [
    {
      name:        ADAPTIVE_MODE_ID,
      displayName: t('ai.agents.items.default.displayName'),
      error:       false,
      tooltip:     t('ai.agents.items.default.description'),
    }
  ] : [];

  return [
    ...defaultOptions,
    ...props.agents.map((agent) => ({
      name:        agent.name,
      displayName: agent.displayName || agent.name,
      error:       agent.status !== 'active',
      tooltip:     agent.status !== 'active' ? t('ai.agents.items.unavailable', {}, true) : t('ai.agents.items.default.description'),
    }))
  ];
});

const selectedAgentName = computed<string>(() => {
  if (activeAgentNames.value.length === 0) {
    return ADAPTIVE_MODE_ID;
  }

  if (activeAgentNames.value.length === 1) {
    return activeAgentNames.value[0];
  }

  if (!props.agentName) {
    return ADAPTIVE_MODE_ID;
  }

  if (!activeAgentNames.value.find((name) => name === props.agentName)) {
    return ADAPTIVE_MODE_ID;
  }

  return props.agentName;
});

const debouncedSelectAgent = debounce((id: string) => {
  emit('select', id === ADAPTIVE_MODE_ID ? '' : id);
}, 100);

const isOpen = ref(false);
</script>

<template>
  <div
    v-clean-tooltip="{ content: t('ai.agents.selectAgent.tooltip'), delay: { show: 500 } }"
    class="agent-selector-container"
    data-testid="rancher-ai-ui-multi-agent-select"
  >
    <rc-dropdown
      placement="top-end"
      @update:open="isOpen = $event"
    >
      <rc-dropdown-trigger
        ghost
        small
        class="agent-trigger"
        :disabled="props.disabled"
      >
        <span
          class="selected-agent-name"
        >
          {{ options?.find(opt => opt.name === selectedAgentName)?.displayName || t('ai.agents.items.unknown') }}
        </span>
        <i
          class="icon icon-chevron-down chevron-icon"
          :class="{ 'is-open': isOpen }"
        />
      </rc-dropdown-trigger>
      <template #dropdownCollection>
        <rc-dropdown-item
          v-for="(opt, i) in options"
          :key="i"
          v-clean-tooltip="{ content: opt.tooltip, delay: { show: 500 } }"
          :data-testid="`rancher-ai-ui-multi-agent-select-option-${opt.name}`"
          class="agent-label"
          :disabled="opt.error"
          @click="debouncedSelectAgent(opt.name)"
        >
          <span class="agent-label-display-name">
            {{ opt.displayName || opt.name }}
          </span>
          <i
            v-if="opt.error"
            class="icon icon-error"
          />
          <i
            v-else
            class="icon icon-checkmark"
            :class="{ hidden: opt.name !== selectedAgentName }"
          />
        </rc-dropdown-item>
      </template>
    </rc-dropdown>
  </div>
</template>
<style lang="scss" scoped>
.agent-selector-container {
  align-items: center;
  cursor: pointer;
  gap: 4px;
  color: var(--active-nav);
  font-weight: 500;
  min-width: 0;
  max-width: 100%;

  .agent-trigger {
    display: flex !important;
    min-width: 0 !important;
    max-width: 100% !important;
    overflow: hidden;
  }
}

.chevron-icon {
  font-size: 12px;
  transition: transform 0.2s ease;
  color: var(--active-nav);

  &.is-open {
    transform: rotate(180deg);
  }
}

.agent-label {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .agent-label-display-name {
    max-width: 200px;
    word-break: break-word;
    white-space: pre-line;
  }

  .icon {
    color: var(--active-nav);

    &.hidden {
      visibility: hidden;
    }
  }

  .icon-error {
    color: var(--error);
  }
}

.selected-agent-name {
  margin: 0 4px;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
</style>