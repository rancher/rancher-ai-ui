<script setup lang="ts">
import { computed, type PropType, ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import {
  RcDropdown,
  RcDropdownTrigger,
  RcDropdownItem,
} from '@components/RcDropdown';
import { Preferences, StorageKey } from '../../types';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  preferences: {
    type:     Object as PropType<Preferences>,
    default:  () => ({}),
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'download:chat',
  'show:help',
  'config:chat',
  'shortcuts:chat',
  'toggle:autoscroll',
  'update:preferences',
]);

const options = computed(() => {
  const isAutoScrollEnabled = props.preferences[StorageKey.ENABLE_AUTO_SCROLL];

  return [
    {
      label:       t('ai.menu.options.chat.download.label'),
      description: t('ai.menu.options.chat.download.description'),
      icon:        'icon-download',
      action:      () => {
        emit('download:chat');
      },
    },
    {
      label:       t(`ai.menu.options.chat.autoscroll.label.${ isAutoScrollEnabled ? 'disable' : 'enable' }`),
      description: t(`ai.menu.options.chat.autoscroll.description.${ isAutoScrollEnabled ? 'disable' : 'enable' }`),
      icon:        isAutoScrollEnabled ? 'icon-mouse-on' : 'icon-mouse-off',
      action:      () => {
        emit('update:preferences', {
          key:   StorageKey.ENABLE_AUTO_SCROLL,
          value: !isAutoScrollEnabled
        });
      },
    },
    {
      label:       t('ai.menu.options.chat.shortcuts.label'),
      description: t('ai.menu.options.chat.shortcuts.description'),
      icon:        'icon-keyboard',
      action:      () => {
        emit('shortcuts:chat');
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
  ];
});

const isOpen = ref(false);
</script>

<template>
  <div class="chat-console-menu-container">
    <rc-dropdown
      placement="top-end"
      @update:open="isOpen = $event"
    >
      <rc-dropdown-trigger
        variant="ghost"
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
