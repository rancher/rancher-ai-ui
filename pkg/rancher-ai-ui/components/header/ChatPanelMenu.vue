<script setup lang="ts">
import { type PropType, ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import {
  RcDropdown,
  RcDropdownTrigger,
  RcDropdownItem,
} from '@components/RcDropdown';
import { Preferences, StorageKey } from '../../types';
import Notifications from '../../handlers/notification';

interface MenuOption {
  label:       string;
  description: string;
  icon?:       string;
  warning?:    string;
  action:     () => void;
}

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

const options = () => {
  const isAutoScrollEnabled = props.preferences[StorageKey.ENABLE_AUTO_SCROLL];
  const isDesktopNotificationsEnabled = props.preferences[StorageKey.ENABLE_DESKTOP_NOTIFICATIONS];

  const out: MenuOption[] = [
    {
      label:       t('ai.menu.options.chat.download.label'),
      description: t('ai.menu.options.chat.download.description'),
      icon:        'icon-download',
      action:      () => {
        emit('download:chat');
      },
    },
  ];

  if (!props.disabled) {
    out.push(
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
        label:       t(`ai.menu.options.chat.desktopNotifications.label.${ isDesktopNotificationsEnabled ? 'disable' : 'enable' }`),
        description: t(`ai.menu.options.chat.desktopNotifications.description.${ isDesktopNotificationsEnabled ? 'disable' : 'enable' }`),
        icon:        isDesktopNotificationsEnabled ? 'icon-notify-bell-off' : 'icon-notify-bell',
        warning:     isDesktopNotificationsEnabled && Notifications.isBlocked() ? t('ai.menu.options.chat.desktopNotifications.blocked', {}, true) : '',
        action:      () => {
          emit('update:preferences', {
            key:   StorageKey.ENABLE_DESKTOP_NOTIFICATIONS,
            value: !isDesktopNotificationsEnabled
          });
        }
      }
    );
  }

  out.push(
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
    }
  );

  return out;
};

/**
 * Tracks whether the chat panel menu is open.
 * Used to close the chat panel menu when the chat becomes disabled.
 */
const isOpen = ref(false);
</script>

<template>
  <div class="chat-console-menu-container">
    <rc-dropdown
      placement="top-end"
      :open="isOpen && !props.disabled"
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
          v-for="(opt, i) in options()"
          :key="i"
          v-clean-tooltip="opt.description"
          @click="opt.action"
        >
          {{ opt.label }}
          <i
            v-if="opt.warning"
            v-clean-tooltip="opt.warning"
            class="icon icon-error text-error"
            :aria-label="opt.warning"
            data-testid="rancher-ai-ui-chat-menu-notifications-blocked"
          />
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
.chat-console-menu-container {
  .rc-button {
    border-radius: var(--border-radius);

    &:hover {
      background: var(--accent-btn);
    }
  }
}
</style>
