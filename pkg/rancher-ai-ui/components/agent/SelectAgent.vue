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

const options = computed<Agent[]>(() => [
  {
    name:          'default',
    displayName:   t('ai.agents.items.default.displayName'),
    description: t('ai.agents.items.default.description'),
  },
  ...props.agents,
]);

const selectedAgentName = computed<string>(() => props.agentName || 'default');

const debouncedSelectAgent = debounce((id: string) => {
  emit('select', id === 'default' ? '' : id);
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
      class="agent-dropdown"
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
          v-clean-tooltip="{ content: opt.description, delay: { show: 500 } }"
          :data-testid="`rancher-ai-ui-multi-agent-select-option-${opt.name}`"
          class="agent-label"
          @click="debouncedSelectAgent(opt.name)"
        >
          <span>{{ opt.displayName || opt.name }}</span>
          <i
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

  .agent-dropdown {
    min-width: 0;
    max-width: 100%;
  }

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

  .icon {
    color: var(--active-nav);

    &.hidden {
      visibility: hidden;
    }
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