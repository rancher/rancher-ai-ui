<script lang="ts" setup>
import { ref } from 'vue';
import {
  RcDropdown,
  RcDropdownTrigger,
} from '@components/RcDropdown';

const triggerEl = ref<HTMLElement | null>(null);

function open() {
  triggerEl.value?.click();
}

defineExpose({ open });

const props = defineProps({
  label: {
    type:    String,
    default: '',
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
});
</script>

<template>
  <div
    class="textlabel-popper"
    :class="{ 'is-hidden': props.label === '' }"
  >
    <rc-dropdown
      placement="top"
    >
      <rc-dropdown-trigger
        ghost
        small
        :disabled="props.disabled"
      >
        <span
          ref="triggerEl"
          class="inline-button label text-deemphasized"
          :class="{ 'btn-disabled': props.disabled }"
        >
          {{ label }}
        </span>
      </rc-dropdown-trigger>
      <template #dropdownCollection>
        <slot />
      </template>
    </rc-dropdown>
  </div>
</template>

<style lang='scss' scoped>
.textlabel-popper {
  &.is-hidden {
    height: 0;
    overflow: visible;
  }
  :deep() .dropdownTarget {
    padding: 0;
    // This will replace the default height set by RcDropdownTrigger, allowing the popover to just have auto size
    height: auto !important;
  }
  :deep() .popperContainer .v-popper__popper .v-popper__wrapper .v-popper__inner {
    padding: 16px;
  }
  :deep() .v-popper__popper {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
  }
  :deep() .v-popper__inner {
    opacity: 0.95; /* semi-transparent background */
    border: 1.5px solid var(--border);
  }
  :deep() .v-popper__wrapper {
    width: 95%;
  }
}

.v-popper {
  .btn {
    height: 10px;
    min-height: 0;
    line-height: 1;
    background-color: transparent;
  }
}

.inline-button {
  user-select: none;
  white-space: nowrap;
  margin-bottom: 2px;

  &:not(.btn-disabled) {
    cursor: pointer;
    text-decoration: underline;
  }
}
</style>
