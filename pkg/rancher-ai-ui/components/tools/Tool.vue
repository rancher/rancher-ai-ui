<script setup lang="ts">
import { camelCase, upperFirst } from 'lodash';
import {
  type PropType, computed, defineAsyncComponent, shallowRef, watch
} from 'vue';
import { Message, ToolCall } from '../../types';
import { warn } from '../../utils/log';

const props = defineProps({
  message: {
    type:    Object as PropType<Message>,
    default: () => ({} as Message),
  },
  name: {
    type:    String,
    default: '',
  },
  tool: {
    type:    Object as PropType<ToolCall | null>,
    default: null,
  },
  label: {
    type:    String,
    default: '',
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits(['action']);

// Get the tool directly or select it by name
const selectedTool = computed(() => props.tool || props.message.tools?.find((t) => t.toolName === props.name) || null);

const component = shallowRef<any>(null);

watch(() => selectedTool.value, (newTool) => {
  if (!newTool) {
    component.value = null;

    return;
  }

  if (component.value) {
    return;
  }

  const path = upperFirst(camelCase(newTool.toolName));

  try {
    component.value = defineAsyncComponent(() => import(`./components/${ path }.vue`));
  } catch (error) {
    warn(`Tool component not found: ${ path }.vue`, error);
  }
}, { immediate: true });
</script>

<template>
  <component
    :is="component"
    v-if="component"
    :tool="selectedTool"
    :message="props.message"
    :label="props.label"
    :disabled="props.disabled"
    @action="emit('action', $event)"
  >
    <template #default="slotProps">
      <slot v-bind="slotProps" />
    </template>
  </component>
</template>
