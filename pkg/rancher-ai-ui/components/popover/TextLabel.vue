<script lang="ts" setup>
import { defineProps } from 'vue';
import {
  RcDropdown,
  RcDropdownTrigger,
} from '@components/RcDropdown';

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
  <div class="textlabel-popper">
    <rc-dropdown
      placement="top"
    >
      <rc-dropdown-trigger
        ghost
        small
        :disabled="props.disabled"
      >
        <span
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
  :deep() .dropdownTarget {
    padding: 0;
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
