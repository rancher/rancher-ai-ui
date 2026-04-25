<script setup lang="ts">
import jsyaml from 'js-yaml';
import { computed, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import YamlEditor from '@shell/components/YamlEditor';
import RcButton from '@components/RcButton/RcButton.vue';
import { EditorMode } from './types';

interface StagingData {
  original: string;
  patched: string;
  resource?: {
    kind: string;
    namespace: string;
    name: string;
  };
  title?: string;
  editorMode: EditorMode;
  handleCancel: () => void;
  handleApply: () => void;
}

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  value: {
    type:    Object as () => StagingData | null,
    default: null,
  },
});

const emit = defineEmits(['close']);

const original = computed(() => {
  let yaml = props.value?.original || '';

  if (typeof yaml !== 'string') {
    yaml = jsyaml.dump(yaml);
  }

  return yaml;
});

const patched = computed(() => {
  let yaml = props.value?.patched || '';

  if (typeof yaml !== 'string') {
    yaml = jsyaml.dump(yaml);
  }

  return yaml;
});

const resourceLabel = computed(() => {
  if (!props.value?.resource) {
    return t('ai.staging.yaml-editor.unknownResource', {}, true);
  }

  const { kind, name, namespace } = props.value.resource;
  const id = namespace ? `${ namespace }/${ name }` : name;

  return `${ kind }: ${ id }`;
});

const proposedContent = ref('');

const showActions = computed(() => {
  return props.value?.handleApply || props.value?.handleCancel;
});

function handleCancel() {
  if (props.value?.handleCancel) {
    props.value.handleCancel();
  }

  emit('close');
}

function handleApply() {
  if (props.value?.handleApply) {
    props.value.handleApply();
  }

  emit('close');
}

watch(patched, (val) => {
  proposedContent.value = val;
}, { immediate: true });
</script>

<template>
  <div class="staging-yaml-editor">
    <div class="staging-yaml-header">
      <div class="staging-yaml-title">
        <h1>{{ props.value?.title || t('ai.staging.yaml-editor.title', {}, true) }}</h1>
        <p class="resource-label">
          {{ resourceLabel }}
        </p>
      </div>
      <div
        v-if="showActions"
        class="staging-yaml-actions"
      >
        <RcButton
          secondary
          @click="handleCancel"
        >
          {{ t('ai.staging.yaml-editor.cancel', {}, true) }}
        </RcButton>
        <RcButton
          primary
          @click="handleApply"
        >
          {{ t('ai.staging.yaml-editor.apply', {}, true) }}
        </RcButton>
      </div>
      <div
        v-else
        class="staging-yaml-actions"
      >
        <RcButton
          secondary
          @click="emit('close')"
        >
          {{ t('ai.staging.yaml-editor.close', {}, true) }}
        </RcButton>
      </div>
    </div>

    <div class="staging-yaml-editor-container">
      <YamlEditor
        :key="resourceLabel"
        ref="editorRef"
        :value="proposedContent"
        :initial-yaml-values="original"
        :editor-mode="props.value?.editorMode"
        :scrolling="true"
        class="yaml-editor"
        data-testid="staging-yaml-editor"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.staging-yaml-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  background: var(--body-bg);
}

.staging-yaml-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.staging-yaml-title {
  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }

  .resource-label {
    margin: 8px 0 0 0;
    color: var(--text-secondary);
    font-size: 14px;
  }
}

.staging-yaml-actions {
  display: flex;
  gap: 12px;
}

.staging-yaml-editor-container {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: auto;
}
</style>
