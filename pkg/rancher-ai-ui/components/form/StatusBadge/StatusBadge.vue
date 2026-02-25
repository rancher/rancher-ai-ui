<script setup lang="ts">
import { computed } from 'vue';

export type ValidationStatus = 'idle' | 'validating' | 'success' | 'error';

const props = defineProps({
  status: {
    type:      String as () => ValidationStatus,
    default:   'idle',
    validator: (value: string) => ['idle', 'validating', 'success', 'error'].includes(value)
  },
  message: {
    type:    String,
    default: ''
  }
});

const iconClass = computed(() => {
  switch (props.status) {
  case 'validating':
    return 'icon-spinner';
  case 'success':
    return 'icon-checkmark';
  case 'error':
    return 'icon-x';
  default:
    return '';
  }
});

const statusClass = computed(() => {
  switch (props.status) {
  case 'validating':
    return 'status-validating';
  case 'success':
    return 'status-success';
  case 'error':
    return 'status-error';
  default:
    return 'status-idle';
  }
});

const showBadge = computed(() => props.status !== 'idle');
</script>

<template>
  <div
    v-if="showBadge"
    :class="['status-badge', statusClass]"
    :title="message"
  >
    <i :class="['icon', iconClass]" />
  </div>
</template>

<style lang="scss" scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 4px;
  border-radius: 4px;
  transition: all 0.2s ease;

  &.status-validating {
    color: #0066cc;
    background-color: rgba(0, 102, 204, 0.1);

    .icon {
      animation: spin 1s linear infinite;
    }
  }

  &.status-success {
    color: #06aa63;
    background-color: rgba(6, 170, 99, 0.1);
  }

  &.status-error {
    color: #cc0000;
    background-color: rgba(204, 0, 0, 0.1);
  }

  &.status-idle {
    display: none;
  }

  .icon {
    font-size: 16px;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
