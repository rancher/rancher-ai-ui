<script setup lang="ts">
import { camelCase, upperFirst } from 'lodash';
import {
  type PropType, computed, defineAsyncComponent, onMounted, shallowRef,
} from 'vue';
import { Message } from '../../types';
import { warn } from '../../utils/log';
import { ToolName } from './types';

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

const toolComponents = shallowRef<Record<string, any>>({});

const tools = computed(() => {
  const all = props.message.tools || [];

  return all
    // Filter tools based on include/exclude props
    .filter((tool) => !props.exclude.includes(tool.toolName) &&
      (props.include.length === 0 || props.include.includes(tool.toolName)))
    // Sort tools based on predefined order
    .sort((a, b) => ToolsOrder[a.toolName] - ToolsOrder[b.toolName]);
});

async function loadToolComponents() {
  const loaderPromises = tools.value.map(async({ toolName: name }) => {
    const path = upperFirst(camelCase(name));

    try {
      await import(`./${ path }.vue`);

      const component = defineAsyncComponent(() => import(`./${ path }.vue`));

      return {
        name,
        component
      };
    } catch (error) {
      warn(`Tool component not found: ${ path }.vue`, error);

      return { name };
    }
  });

  const all = await Promise.all(loaderPromises);

  const newComponents: Record<string, any> = {};

  all.forEach(({ name, component }) => {
    if (component) {
      newComponents[name] = component;
    }
  });
  toolComponents.value = newComponents; // Replace entire object to preserve reactivity
}

onMounted(() => {
  loadToolComponents();
});
</script>

<template>
  <div
    v-if="tools.length && Object.values(toolComponents).length"
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
          <div
            v-if="toolComponents[tool.toolName]"
            class="mt-2 chat-msg-tools"
          >
            <component
              :is="toolComponents[tool.toolName]"
              :message="props.message"
              :tool="tool"
            />
          </div>
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

.chat-msg-tools {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.chat-msg-tools-more {
  color: #94a3b8;
  cursor: pointer;
}
</style>
