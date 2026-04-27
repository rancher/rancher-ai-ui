<script setup lang="ts">
import { camelCase, upperFirst } from 'lodash';
import {
  type PropType, computed, defineAsyncComponent, shallowRef, watch
} from 'vue';
import { Message } from '../../types';
import { warn } from '../../utils/log';

const props = defineProps({
  name: {
    type:    String,
    default: '',
  },
  message: {
    type:    Object as PropType<Message>,
    default: () => ({} as Message),
  },
  label: {
    type:    String,
    default: '',
  },
});

const emit = defineEmits(['action']);

const tool = computed(() => props.message.tools?.find((t) => t.toolName === props.name) || null);

const component = shallowRef<any>(null);

watch(() => tool.value, (newTool) => {
  if (!newTool) {
    component.value = null;

    return;
  }

  if (component.value) {
    return;
  }

  const path = upperFirst(camelCase(props.name));

  try {
    component.value = defineAsyncComponent(() => import(`./${ path }.vue`));
  } catch (error) {
    warn(`Tool component not found: ${ path }.vue`, error);
  }
}, { immediate: true });
</script>

<template>
  <component
    :is="component"
    v-if="component"
    :tool="tool"
    :message="props.message"
    :label="props.label"
    @action="emit('action', $event)"
  >
    <template #default="slotProps">
      <slot v-bind="slotProps" />
    </template>
  </component>
</template>
