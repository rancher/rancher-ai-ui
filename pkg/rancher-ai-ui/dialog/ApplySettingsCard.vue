<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { Card } from '@components/Card';
import RcButton from '@components/RcButton/RcButton.vue';
import { StorageType } from '../types';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  storageType: {
    type:    String,
    default: '',
  },
  onConfirm: {
    type:     Function,
    required: true,
  },
  onCancel: {
    type:    Function,
    default: () => {},
  }
});

const emit = defineEmits([
  'confirm',
  'close',
]);

const warningMessage = computed(() => {
  if (!props.storageType) {
    return t('aiConfig.dialog.applySettings.warning.unknownStorage', {}, true);
  }
  if (props.storageType === StorageType.InMemory) {
    return t('aiConfig.dialog.applySettings.warning.inMemory', {}, true);
  }

  return '';
});

function confirm() {
  props.onConfirm();
  emit('close');
}

function close() {
  props.onCancel();
  emit('close');
}
</script>

<template>
  <Card
    class="prompt-apply-settings"
    :show-highlight-border="false"
  >
    <template #title>
      <h4 class="text-default-text">
        {{ t('aiConfig.dialog.applySettings.title') }}
      </h4>
    </template>
    <template #body>
      <div
        class="mb-10"
      >
        <span v-clean-html="warningMessage" />
      </div>
    </template>
    <template #actions>
      <button
        class="btn role-secondary"
        @click="close"
      >
        {{ t('aiConfig.dialog.applySettings.cancel') }}
      </button>
      <div class="spacer" />
      <RcButton
        class="btn bg-error ml-10"
        data-testid="prompt-apply-settings-confirm-button"
        @click="confirm"
      >
        {{ t('aiConfig.dialog.applySettings.confirm') }}
      </RcButton>
    </template>
  </Card>
</template>

<style lang="scss" scoped>
  .prompt-apply-settings {
    &.card-container {
      box-shadow: none;
    }

    #confirm {
      width: 90%;
      margin-left: 3px;
    }

    :deep(.card-wrap) {
      .card-actions {
        justify-content: space-between;
      }
    }
  }
</style>
