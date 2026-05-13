<script setup lang="ts">
import { ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import {
  RcDropdown,
  RcDropdownTrigger,
  RcDropdownItem,
} from '@components/RcDropdown';

const store = useStore();
const { t } = useI18n(store);

const emit = defineEmits([
  'update:chat',
  'delete:chat',
]);

const options = ref([
  {
    id:          'rename-chat',
    label:       t('ai.history.menu.items.rename'),
    icon:        'icon-edit',
    action:      () => {
      emit('update:chat');
    },
  },
  {
    id:          'delete-chat',
    label:       t('ai.history.menu.items.delete'),
    icon:        'icon-trash',
    action:      () => {
      emit('delete:chat');
    },
  },
]);

const isOpen = ref(false);
</script>

<template>
  <div
    class="history-chat-item-menu-container"
    data-testid="rancher-ai-ui-chat-history-chat-item-menu-button"
  >
    <rc-dropdown
      placement="top-end"
      @update:open="isOpen = $event"
    >
      <rc-dropdown-trigger
        variant="ghost"
        small
      >
        <i class="icon icon-actions" />
      </rc-dropdown-trigger>
      <template #dropdownCollection>
        <rc-dropdown-item
          v-for="(opt, i) in options"
          :key="i"
          class="history-chat-menu-dropdown-item"
          @click="opt.action"
        >
          <span
            :data-testid="`rancher-ai-ui-chat-history-chat-item-menu-button-option-${ opt.id }`"
          >
            {{ opt.label }}
          </span>
          <template
            #before
          >
            <i
              v-if="opt.icon"
              class="icon"
              :class="opt.icon"
            />
          </template>
        </rc-dropdown-item>
      </template>
    </rc-dropdown>
  </div>
</template>

<style lang="scss" scoped>
.history-chat-menu-dropdown-item {
  height: 32px;
}
</style>
