<script setup lang="ts">
import { ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import YamlEditor from '@shell/components/YamlEditor.vue';
import Banner from '@components/Banner/Banner.vue';
import RcButton from '@components/RcButton/RcButton.vue';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  value: {
    type:    String,
    default: '',
  },
  loading: {
    type:    Boolean,
    default: true,
  },
  error: {
    type:    String,
    default: '',
  },
});

const emit = defineEmits(['save', 'restore', 'close']);

const yaml = ref(props.value);

watch(() => props.value, (value) => {
  yaml.value = value;
});
</script>

<template>
  <div
    class="agent-values"
    data-testid="rancher-ai-ui-install-agent-values"
  >
    <h4 class="m-0">
      {{ t('ai.install.values.title') }}
    </h4>
    <p class="text-deemphasized m-0">
      {{ t('ai.install.values.description') }}
    </p>

    <div
      v-if="props.loading"
      class="agent-values-editor agent-values-loading"
      data-testid="rancher-ai-ui-install-agent-values-loading"
    >
      <i class="icon icon-spinner icon-spin icon-2x" />
    </div>
    <div
      v-else-if="yaml"
      class="agent-values-editor"
    >
      <YamlEditor
        v-model:value="yaml"
        :scrolling="true"
        data-testid="rancher-ai-ui-install-agent-values-editor"
      />
    </div>

    <Banner
      v-if="props.error"
      class="m-0"
      color="error"
      :label="props.error"
    />

    <div class="agent-values-actions">
      <RcButton
        variant="tertiary"
        :aria-label="t('ai.install.values.ariaLabel.restore')"
        data-testid="rancher-ai-ui-install-agent-values-restore"
        @click="emit('restore')"
      >
        {{ t('ai.install.values.restore') }}
      </RcButton>
      <div class="agent-values-actions-right">
        <RcButton
          variant="secondary"
          :aria-label="t('ai.install.values.ariaLabel.cancel')"
          data-testid="rancher-ai-ui-install-agent-values-cancel"
          @click="emit('close')"
        >
          {{ t('generic.cancel') }}
        </RcButton>
        <RcButton
          variant="primary"
          :disabled="props.loading || !yaml"
          :aria-label="t('ai.install.values.ariaLabel.save')"
          data-testid="rancher-ai-ui-install-agent-values-save"
          @click="emit('save', yaml)"
        >
          {{ t('generic.save') }}
        </RcButton>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.agent-values {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.agent-values-editor {
  height: 60vh;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: auto;
}

.agent-values-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.agent-values-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.agent-values-actions-right {
  display: flex;
  gap: 8px;
}
</style>
