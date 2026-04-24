<script setup lang="ts">
import { computed, watch, type PropType } from 'vue';
import { useStore } from 'vuex';
import { PRODUCT_NAME } from '../../product';
import { useI18n } from '@shell/composables/useI18n';
import RcButton from '@components/RcButton/RcButton.vue';
import { ConfirmationStatus, Message, ToolCall } from '../../types';
import { EditorMode } from '../../pages/staging/yaml-editor/types';
import { ComponentName } from '../../pages/staging/types';
import { warn } from '../../utils/log';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  message: {
    type:    Object as PropType<Message>,
    default: () => ({} as Message),
  },
  tool: {
    type:    Object as PropType<ToolCall>,
    default: () => ({} as ToolCall),
  },
  label: {
    type:    String,
    default: '',
  },
});

const label = computed(() => {
  if (props.label) {
    return props.label;
  }

  return props.tool.input.resourceName || t(`ai.tools.${ props.tool.toolName }.name`, { }, true);
});

const tooltip = computed(() => {
  const {
    resourceKind: kind,
    resourceNamespace: namespace,
    resourceName: name,
  } = props.tool.input;

  return t(`ai.tools.${ props.tool.toolName }.tooltip`, {
    kind,
    namespace,
    name
  }, true);
});

async function navigateToStaging() {
  const {
    yaml,
    resourceKind,
    resourceNamespace,
    resourceName,
    title
  } = props.tool.input;

  if (!yaml || !resourceKind || !resourceName || !resourceNamespace) {
    warn('Missing YAML content for ShowYaml tool:', props.tool.input);

    return;
  }

  // Set staging data in the store
  await store.dispatch(`${ PRODUCT_NAME }/staging/setData`, {
    component: ComponentName.YAML_EDITOR,
    data:      {
      original: '',
      patched:     yaml,
      resource:       {
        kind:      resourceKind,
        namespace: resourceNamespace,
        name:      resourceName
      },
      title,
      editorMode:    EditorMode.VIEW_CODE,
      sourceMessage: props.message,
    }
  });

  // Navigate to Staging
  store.state.$router.push({
    name:   `c-cluster-${ PRODUCT_NAME }-staging`,
    params: {
      cluster: 'local', // TODO pass actual cluster if needed
      product: 'explorer',
    },
  });
}

const stopWatching = watch(() => props.message.confirmation?.status, (newVal, oldVal) => {
  if (oldVal === ConfirmationStatus.Pending && newVal !== ConfirmationStatus.Pending) {
    store.commit('rancher-ai-ui/staging/resetData');
  } else if (!newVal || newVal === ConfirmationStatus.Confirmed || newVal === ConfirmationStatus.Canceled) {
    stopWatching();
  }
}, { deep: true });
</script>

<template>
  <div>
    <slot
      :navigate="navigateToStaging"
      :tool="tool"
      :message="message"
    >
      <RcButton
        small
        tertiary
        @click="navigateToStaging"
      >
        <div class="show-yaml-tool-label">
          <i class="icon icon-document" />
          <span
            v-clean-tooltip="tooltip"
            class="show-yaml-tool-label-text"
          >
            {{ label }}
          </span>
        </div>
      </RcButton>
    </slot>
  </div>
</template>

<style scoped lang="scss">
.show-yaml-tool-label {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;

  &-text {
    word-break: break-word;
    white-space: pre-line;
    list-style-position: inside;
  }
}
</style>
