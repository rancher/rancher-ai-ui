<script lang="ts" setup>
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { computed, PropType } from 'vue';
import { LLMConfig } from '../../types';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  llmConfig: {
    type:     Object as PropType<LLMConfig | null>,
    default:  null,
  }
});

const llmModelDisplayName = computed(() => {
  if (!!props.llmConfig) {
    return t('ai.configurations.label', {
      name:  props.llmConfig.name,
      model: props.llmConfig.model
    }, true);
  }

  return t('ai.configurations.models.unknown');
});

const llmModelTooltip = computed(() => {
  if (!!props.llmConfig && props.llmConfig.model?.length > 20) {
    return props.llmConfig.model;
  }

  return '';
});
</script>

<template>
  <span
    v-clean-tooltip="llmModelTooltip"
    class="llm-model-label label text-deemphasized"
  >
    {{ llmModelDisplayName }}
  </span>
</template>

<style scoped lang="scss">
.llm-model-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  font-size: 12px;
}
</style>