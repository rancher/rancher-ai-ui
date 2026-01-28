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
  agentId: {
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
    id:          'default',
    name:        t('ai.agents.items.default.name'),
    description: t('ai.agents.items.default.description'),
  },
  ...props.agents.map((a: any) => ({
    id:          a.spec.name,
    name:        a.spec.name,
    description: a.spec.description,
  })),
]);

const selectedAgentId = computed<string>(() => props.agentId || 'default');

const debouncedSelectAgent = debounce((id: string) => {
  emit('select', id === 'default' ? '' : id);
}, 100);

const isOpen = ref(false);
</script>

<template>
  <div class="agent-select">
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
          :class="{ 'ml-5': props.disabled }"
        >
          {{ options?.find(opt => opt.id === selectedAgentId)?.name || t('ai.agents.items.unknown') }}
        </span>
      </rc-dropdown-trigger>
      <template #dropdownCollection>
        <rc-dropdown-item
          v-for="(opt, i) in options"
          :key="i"
          v-clean-tooltip="{ content: opt.description, delay: { show: 500 } }"
          class="agent-label"
          @click="debouncedSelectAgent(opt.id)"
        >
          <span>{{ opt.name }}</span>
          <i
            class="icon icon-checkmark"
            :class="{ hidden: opt.id !== selectedAgentId }"
          />
        </rc-dropdown-item>
      </template>
    </rc-dropdown>
  </div>
</template>
<style lang="scss" scoped>
.agent-select {
  .agent-dropdown {
    width: max-content;
  }

  .agent-trigger {
    min-width: 200px;
    justify-content: center;
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
</style>