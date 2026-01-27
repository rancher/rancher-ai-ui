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

const props = defineProps({
  disabled: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'download:chat',
  'show:help',
  'config:chat'
]);

const options = ref([
  {
    label:       t('ai.menu.options.chat.download.label'),
    description: t('ai.menu.options.chat.download.description'),
    icon:        'icon-download',
    action:      () => {
      emit('download:chat');
    },
  },
  {
    label:       t('ai.menu.options.chat.config.label'),
    description: t('ai.menu.options.chat.config.description'),
    icon:        'icon-gear',
    action:      () => {
      emit('config:chat');
    },
  },
  // {
  //   label: t('ai.menu.options.chat.help.label'),
  //   description: t('ai.menu.options.chat.help.description'),
  //   icon:  'icon-question-mark',
  //   action: () => {
  //     emit('show:help');
  //   },
  // }
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
        :disabled="props.disabled"
      >
        <i class="icon icon-actions" />
      </rc-dropdown-trigger>
      <template #dropdownCollection>
        <rc-dropdown-item
          v-for="(opt, i) in options"
          :key="i"
          v-clean-tooltip="opt.description"
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
