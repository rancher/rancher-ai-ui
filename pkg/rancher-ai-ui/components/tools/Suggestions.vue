<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { Message, ToolActionEventType, ToolCall } from '../../types';
import ListOptions from '../../components/ListOptions.vue';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  tool: {
    type:    Object as PropType<ToolCall>,
    default: () => {},
  },
  message: {
    type:    Object as PropType<Message>,
    default: () => ({} as Message),
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

const options = computed(() => {
  const opts = [];

  if (props.tool.input.suggestion1) {
    opts.push(props.tool.input.suggestion1);
  }
  if (props.tool.input.suggestion2) {
    opts.push(props.tool.input.suggestion2);
  }
  if (props.tool.input.suggestion3) {
    opts.push(props.tool.input.suggestion3);
  }

  return opts;
});
</script>

<template>
  <ListOptions
    :label="t(`ai.tools.${props.tool.toolName}.name`, {}, true)"
    :options="options"
    :show-edit="true"
    :disabled="props.disabled"
    @select="emit('action', { type: ToolActionEventType.Select, value: $event })"
    @edit="emit('action', { type: ToolActionEventType.Edit, value: $event })"
  />
</template>
