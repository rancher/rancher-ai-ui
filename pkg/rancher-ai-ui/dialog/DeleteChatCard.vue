<script setup lang="ts">
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { Card } from '@components/Card';
import RcButton from '@components/RcButton/RcButton.vue';
import { computed } from 'vue';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  name: {
    type:    String,
    default: '',
  },
  onConfirm: {
    type:     Function,
    required: true,
  },
  onClose: {
    type:    Function,
    default: () => {},
  }
});

const emit = defineEmits([
  'confirm',
  'close',
]);

const nameLabel = computed(() => {
  const name = props.name;

  if (!name) {
    return '';
  }

  return name.length > 13 ? `${ name.substring(0, 10) }...` : name;
});

function confirm() {
  props.onConfirm();
  emit('confirm');
  close();
}

function close() {
  props.onClose();
  emit('close');
}
</script>

<template>
  <Card
    class="prompt-remove"
    :show-highlight-border="false"
  >
    <template #title>
      <h4 class="text-default-text">
        {{ t('promptRemove.title') }}
      </h4>
    </template>
    <template #body>
      <div
        class="mb-10"
      >
        <span>
          {{ t('ai.history.chat.delete.modal.message') }}
        </span>
        <span v-if="props.name">
          <b>{{ nameLabel }}</b>
        </span>
        <br>
        <span>
          {{ t('ai.history.chat.delete.modal.warning') }}
        </span>
      </div>
    </template>
    <template #actions>
      <button
        class="btn role-secondary"
        @click="close"
      >
        {{ t('ai.history.chat.delete.modal.cancel') }}
      </button>
      <div class="spacer" />
      <RcButton
        class="btn bg-error ml-10"
        data-testid="prompt-remove-confirm-button"
        @click="confirm"
      >
        {{ t('ai.history.chat.delete.modal.confirm') }}
      </RcButton>
    </template>
  </Card>
</template>

<style lang="scss" scoped>
  .prompt-remove {
    &.card-container {
      box-shadow: none;
    }

    #confirm {
      width: 90%;
      margin-left: 3px;
    }

    .actions {
      text-align: right;
    }
  }

  .bg-error {
    background-color: var(--error);
  }
</style>
