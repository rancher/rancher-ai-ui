<script setup lang="ts">
import { ref } from 'vue';
import { useStore } from 'vuex';
import {
  RcDropdown,
  RcDropdownTrigger,
  RcDropdownItem,
} from '@components/RcDropdown';

const store = useStore();
const t = store.getters['i18n/t'];

const emit = defineEmits([
  'delete:chat',
]);

const options = ref([
  {
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
  <div class="chat-console-menu-container">
    <rc-dropdown
      class="menu-dropdown"
      placement="top-end"
      @update:open="isOpen = $event"
    >
      <rc-dropdown-trigger
        ghost
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
          {{ opt.label }}
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
