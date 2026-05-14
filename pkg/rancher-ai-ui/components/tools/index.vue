<script setup lang="ts">
import { type PropType, computed } from 'vue';
import { randomStr } from '@shell/utils/string';
import { Message } from '../../types';
import { ToolName } from './types';
import Tool from '../tools/Tool.vue';

const ToolsOrder: Record<string, number> = {
  [ToolName.Explore]:      0,
  [ToolName.ShowYaml]:     1,
  [ToolName.ShowYamlDiff]: 1,
  [ToolName.ShowLogs]:     2,
  [ToolName.Suggestions]:  99,
  [ToolName.SelectOption]: 99,
};

const props = defineProps({
  message: {
    type:    Object as PropType<Message>,
    default: () => ({} as Message),
  },
  include: {
    type:    Array as () => string[],
    default: () => [],
  },
  exclude: {
    type:    Array as () => string[],
    default: () => [],
  },
  showHeader: {
    type:    Boolean,
    default: true,
  },
  showDefaultLabels: {
    type:    Boolean,
    default: false,
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits(['action']);

const tools = computed(() => {
  const all = props.message.tools || [];

  return all
    // Filter tools based on include/exclude props
    .filter((tool) => !props.exclude.includes(tool.toolName) &&
      (props.include.length === 0 || props.include.includes(tool.toolName)))
    // Add unique keys to each tool for rendering
    .map((tool) => ({
      ...tool,
      key: `${ tool.toolName }-${ randomStr(4) }`,
    }))
    // Sort tools based on predefined order
    .sort((a, b) => ToolsOrder[a.toolName] - ToolsOrder[b.toolName]);
});
</script>

<template>
  <div
    v-if="tools.length"
    class="chat-tools-container"
  >
    <div
      v-if="props.showHeader"
      class="chat-msg-tools-title"
    >
      <span>{{ t('ai.tools.label') }}</span>
    </div>
    <div class="chat-msg-tools-container">
      <Tool
        v-for="tool in tools"
        :key="tool.key"
        :tool="tool"
        :message="props.message"
        :label="props.showDefaultLabels ? t(`ai.tools.${ tool.toolName }.name`, { }, true) : ''"
        :disabled="props.disabled"
        @action="emit('action', $event.value)"
      />
    </div>
  </div>
</template>

<style lang='scss' scoped>
.chat-msg-tools-title {
  margin-bottom: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;

  .icon {
    height: 16px;
  }
}

.chat-msg-tools-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

// Hide container (and the title too) if there are no tools to show
.chat-tools-container {
  &:not(:has(.chat-msg-tools-container > *)) {
    display: none;
  }
}

.chat-msg-tools-container:empty {
  display: none;
}
</style>
