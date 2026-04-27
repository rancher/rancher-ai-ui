<script setup lang="ts">
import { type PropType, computed } from 'vue';
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
});

const tools = computed(() => {
  const all = props.message.tools || [];

  return all
    // Filter tools based on include/exclude props
    .filter((tool) => !props.exclude.includes(tool.toolName) &&
      (props.include.length === 0 || props.include.includes(tool.toolName)))
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
      <i class="icon icon-apps" />
    </div>
    <div class="chat-msg-tools-container">
      <div class="chat-msg-tool-tags">
        <template
          v-for="(tool, index) in tools"
          :key="index"
        >
          <Tool
            :name="tool.toolName"
            :message="props.message"
          />
        </template>
      </div>
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
  gap: 8px;
}

.chat-msg-tool-tags {
  display: flex;
  flex-direction: column;
}
</style>
