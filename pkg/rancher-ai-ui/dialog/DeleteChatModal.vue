<script setup lang="ts">
import { useStore } from 'vuex';
import AppModal from '@shell/components/AppModal.vue';
import { Card } from '@components/Card';
import RcButton from '@components/RcButton/RcButton.vue';
import { computed } from 'vue';

const store = useStore();
const t = store.getters['i18n/t'];

const props = defineProps({
  name: {
    type:    String,
    default: '',
  },
});

const nameLabel = computed(() => {
  const name = props.name;

  if (!name) {
    return '';
  }

  return name.length > 13 ? `${ name.substring(0, 10) }...` : name;
});

const emit = defineEmits([
  'confirm',
  'close',
]);

function confirm() {
  emit('confirm');
}

function close() {
  emit('close');
}
</script>

<template>
  <app-modal
    custom-class="remove-modal"
    name="promptRemove"
    :width="400"
    height="auto"
    styles="max-height: 100vh;"
    @close="close"
  >
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
  </app-modal>
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
