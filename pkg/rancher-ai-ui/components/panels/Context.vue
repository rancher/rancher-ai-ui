<script lang="ts" setup>
import { type PropType } from 'vue';
import SelectContext from '../context/SelectContext.vue';
import { Context } from '../../types';

/**
 * Context panel for selecting AI chat contexts.
 */

const props = defineProps({
  value: {
    type:    Array as PropType<Context[]>,
    default: () => ({} as Context[]),
  },
  disabled: {
    type:    Boolean,
    default: false,
  }
});

const emit = defineEmits(['select']);
</script>

<template>
  <div
    class="chat-context"
    :class="{ 'disabled-panel': props.disabled }"
  >
    <SelectContext
      class="select-context"
      :options="props.value"
      :auto-select="props.value"
      :disabled="props.disabled"
      @update="emit('select', $event)"
    />
  </div>
</template>

<style lang='scss' scoped>
.chat-context {
  border-top: 1px solid var(--border);
  padding: 16px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;

  .select-context {
    margin-left: 4px;
  }
}
</style>
