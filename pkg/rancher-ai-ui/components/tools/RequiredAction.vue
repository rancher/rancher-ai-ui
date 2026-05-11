<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { CONFIG_MAP } from '@shell/config/types';
import RichTranslation from '@shell/components/RichTranslation.vue';
import { PRODUCT_NAME } from '../../product';
import { useToolsComposable } from '../../composables/useToolsComposable';
import { ToolsDefinitionActionType } from '../../types';

const store = useStore();
const { t } = useI18n(store);

const { toolsRequiredAction } = useToolsComposable();

const canPublishTools = computed(() => {
  const schema = store.getters['management/schemaFor'](CONFIG_MAP);

  return !!schema?.resourceMethods?.find((verb: any) => 'PUT' === verb);
});

const actionType = computed(() => {
  if (ToolsDefinitionActionType.None === toolsRequiredAction.value) {
    return null;
  }

  return toolsRequiredAction.value === ToolsDefinitionActionType.Create ? 'create' : 'update';
});

function routeToSettings() {
  store.state.$router.push({
    name:   `c-cluster-settings-${ PRODUCT_NAME }`,
    params: { cluster: store.state.$route.params.cluster || 'local' },
    query:  { section: 'ui-tools-config' },
  });
}
</script>

<template>
  <Transition name="fade-dissolve">
    <div
      v-if="toolsRequiredAction !== ToolsDefinitionActionType.None"
      class="chat-required-tools-action-msg-bubble"
      data-testid="rancher-ai-ui-required-tools-action-message"
    >
      <div class="chat-required-tools-action-msg-text">
        <RichTranslation
          v-if="canPublishTools"
          :k="`ai.message.system.tools.action.admin.${ actionType }`"
        >
          <template #installTools="{ content }">
            <a
              v-clean-tooltip="{ content: t('ai.message.system.tools.action.refreshTooltip'), delay: { show: 300 } }"
              class="text-label clickable-label"
              @click="routeToSettings()"
            >
              {{ content }}
            </a>
          </template>
          <template #refreshTools="{ content }">
            <a
              v-clean-tooltip="{ content: t('ai.message.system.tools.action.refreshTooltip'), delay: { show: 300 } }"
              class="text-label clickable-label"
              @click="routeToSettings()"
            >
              {{ content }}
            </a>
          </template>
        </RichTranslation>
        <span
          v-else
          v-clean-html="t(`ai.message.system.tools.action.user.${ actionType }`, {}, true)"
        />
      </div>
    </div>
  </Transition>
</template>

<style lang='scss' scoped>
.chat-required-tools-action-msg-bubble {
  position: relative;
  background: var(--body-bg);
  color: var(--body-text);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 2px 8px 0 var(--shadow);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  line-height: 21px;
}

.chat-required-tools-action-msg-text, :deep() pre {
  word-break: break-word;
  white-space: pre-line;
  list-style-position: inside;
}

.clickable-label {
  cursor: pointer;
  text-decoration: none;
  color: var(--link);
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &:hover {
    text-decoration: underline;
  }

  i {
    font-size: 0.9em;
    display: inline-block;
  }
}

.fade-dissolve-enter-active,
.fade-dissolve-leave-active {
  transition: opacity 0.3s ease;
}

.fade-dissolve-enter-from,
.fade-dissolve-leave-to {
  opacity: 0;
}
</style>
