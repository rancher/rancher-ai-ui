<script setup lang="ts">
import { computed, watch, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import RcButton from '@components/RcButton/RcButton.vue';
import { ConfirmationStatus, Message, ToolActionEventType, ToolCall } from '../../types';
import { EditorMode } from '../../pages/staging/yaml-editor/types';
import { ComponentName } from '../../pages/staging/types';
import { warn } from '../../utils/log';
import { useStagingComposable } from '../../composables/useStagingComposable';

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

const emit = defineEmits(['action']);

const { open: openStaging } = useStagingComposable();

const isConfirmingMessage = computed(() => props.message.confirmation?.status === ConfirmationStatus.Pending);

const isValidInput = computed(() => {
  const {
    yaml,
    resourceKind,
    resourceNamespace,
    resourceName,
  } = props.tool.input;

  return !!yaml && !!resourceKind && !!resourceNamespace && !!resourceName;
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

function navigateToStaging() {
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

  openStaging({
    component: {
      name:    ComponentName.YAML_EDITOR,
      watcher: isConfirmingMessage.value ? {
        close: (fn: Function) => watch(() => props.message.confirmation?.status, (newVal) => {
          if (newVal && newVal !== ConfirmationStatus.Pending) {
            fn();
          }
        }, { deep: true })
      } : undefined,
    },
    data:      {
      original: '',
      patched:     yaml,
      resource:       {
        kind:      resourceKind,
        namespace: resourceNamespace,
        name:      resourceName
      },
      title,
      editorMode:   EditorMode.VIEW_CODE,
      handleCancel: isConfirmingMessage.value ? () => emitConfirmationAction(false) : undefined,
      handleApply:  isConfirmingMessage.value ? () => emitConfirmationAction(true) : undefined,
    }
  });
}

function emitConfirmationAction(value: boolean) {
  emit('action', {
    type: ToolActionEventType.Confirm,
    value
  });
}
</script>

<template>
  <div v-if="isValidInput">
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
