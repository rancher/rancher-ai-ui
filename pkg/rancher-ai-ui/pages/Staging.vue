<script setup lang="ts">
import { computed, onMounted, ref, nextTick, watch } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { useRouter } from 'vue-router';import jsyaml from 'js-yaml';import YamlEditor, { EDITOR_MODES } from '@shell/components/YamlEditor';
import RcButton from '@components/RcButton/RcButton.vue';
import { PRODUCT_NAME } from '../product';

const store = useStore();
const router = useRouter();
const { t } = useI18n(store);

const yaml = ref('');
const isEditing = ref(false);
const editorRef = ref();

// Get YAML from store as a computed for reactivity
const storeYaml = computed(() => {
  const stagingState = store.state[`${PRODUCT_NAME}/staging`];
  let yaml = stagingState?.staging?.yaml || '';
  
  // Ensure it's a string
  if (typeof yaml !== 'string') {
    yaml = jsyaml.dump(yaml);
  }
  
  return yaml;
});

// Watch for changes in the YAML editor and update the store
watch(yaml, (newYaml) => {
  if (newYaml && newYaml !== storeYaml.value) {
    store.commit(`${PRODUCT_NAME}/staging/updateYaml`, newYaml);
    isEditing.value = true;
  }
});

const resource = computed(() => {
  const stagingState = store.state[`${PRODUCT_NAME}/staging`];
  return stagingState?.staging?.resource || null;
});

const resourceLabel = computed(() => {
  if (!resource.value) {
    return t('ai.staging.unknownResource', {}, true);
  }

  const { kind, name, namespace } = resource.value;
  const id = namespace ? `${namespace}/${name}` : name;
  
  return `${kind}: ${id}`;
});

onMounted(async () => {
  let yamlContent = storeYaml.value;

  console.log('Store state:', store.state[`${PRODUCT_NAME}/staging`]);
  console.log('Loaded YAML content:', yamlContent);
  
  if (!yamlContent) {
    console.warn('No YAML content found in store, navigating back');
    router.back();
    return;
  }
  
  // Ensure YAML is a string (convert objects to YAML string if needed)
  if (typeof yamlContent !== 'string') {
    yamlContent = jsyaml.dump(yamlContent);
  }
  
  yaml.value = yamlContent;
  await nextTick();
  console.log('YAML ref after nextTick:', yaml.value);
  console.log('Editor ref:', editorRef.value);
  
  // Force update the component if it has an updateValue method
  if (editorRef.value?.updateValue) {
    editorRef.value.updateValue(yamlContent);
  }
});

function handleCancel() {
  store.commit(`${PRODUCT_NAME}/staging/clearStaging`);
  router.back();
}

function handleApply() {
  // TODO: Apply YAML to cluster
  console.log('Applying YAML:', yaml.value);
  store.commit(`${PRODUCT_NAME}/staging/clearStaging`);
  router.back();
}

function onEditorReady() {
  const yamlValue = storeYaml.value;
  console.log('Editor ready, updating value:', yamlValue);
  if (editorRef.value?.updateValue && yamlValue) {
    // Ensure it's a string
    const stringYaml = typeof yamlValue === 'string' ? yamlValue : jsyaml.dump(yamlValue);
    editorRef.value.updateValue(stringYaml);
  }
}
</script>

<template>
  <div class="staging-editor">
    <div class="staging-header">
      <div class="staging-title">
        <h1>{{ t('ai.staging.title', {}, true) }}</h1>
        <p class="resource-label">{{ resourceLabel }}</p>
      </div>
      <div class="staging-actions">
        <RcButton
          secondary
          data-testid="staging-editor-cancel-button"
          @click="handleCancel"
        >
          {{ t('ai.staging.cancel', {}, true) }}
        </RcButton>
        <RcButton
          primary
          data-testid="staging-editor-apply-button"
          @click="handleApply"
        >
          {{ t('ai.staging.apply', {}, true) }}
        </RcButton>
      </div>
    </div>
    
    <div class="staging-editor-container">
      <YamlEditor
        ref="editorRef"
        v-model:value="yaml"
        :initial-yaml-values="storeYaml"
        :editor-mode="EDITOR_MODES.EDIT_CODE"
        class="yaml-editor flex-content"
        data-testid="staging-yaml-editor"
        @onReady="onEditorReady"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.staging-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  background: var(--body-bg);
}

.staging-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.staging-title {
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

.staging-actions {
  display: flex;
  gap: 12px;
}

.staging-editor-container {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}
</style>
