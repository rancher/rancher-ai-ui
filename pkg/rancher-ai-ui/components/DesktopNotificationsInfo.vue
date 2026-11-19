<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import RichTranslation from '@shell/components/RichTranslation.vue';
import { SessionKey, StorageKey } from '../types';
import { useLocalStorageComposable } from '../composables/useLocalStorageComposable';
import Notifications from '../handlers/notification';

const store = useStore();
const { t } = useI18n(store);

const storage = useLocalStorageComposable();

const userAgent = navigator.userAgent;
const isChromeOrFirefox = /Firefox\//.test(userAgent) || (/Chrome\//.test(userAgent) && !/Edg\/|OPR\//.test(userAgent));

// A dismissed browser prompt leaves the permission pending
const isDismissed = computed(() => !!store.getters['rancher-ai-ui/chat/session']?.[SessionKey.DISMISSED_DESKTOP_NOTIFICATIONS_INFO]);

const show = computed(() => !isDismissed.value && !!storage.get(StorageKey.ENABLE_DESKTOP_NOTIFICATIONS) && Notifications.isPermissionPending());

function dismiss() {
  store.commit('rancher-ai-ui/chat/setSession', { [SessionKey.DISMISSED_DESKTOP_NOTIFICATIONS_INFO]: true });
}

function allow() {
  Notifications.requestPermission();

  dismiss();
}

function turnOff() {
  storage.set(StorageKey.ENABLE_DESKTOP_NOTIFICATIONS, false);

  dismiss();
}
</script>

<template>
  <Transition name="fade-dissolve">
    <div
      v-if="show"
      class="chat-notifications-action-msg-bubble"
      data-testid="rancher-ai-ui-desktop-notifications-action-message"
    >
      <RichTranslation k="ai.message.system.desktopNotifications.info">
        <template #allow="{ content }">
          <a
            class="text-label clickable-label"
            data-testid="rancher-ai-ui-desktop-notifications-allow"
            @click="allow"
          >
            {{ content }}
          </a>
        </template>
        <template #turnOff="{ content }">
          <a
            class="text-label clickable-label"
            data-testid="rancher-ai-ui-desktop-notifications-turn-off"
            @click="turnOff"
          >
            {{ content }}
          </a>
        </template>
      </RichTranslation>
      <span
        v-if="!isChromeOrFirefox"
        v-clean-html="t('ai.message.system.desktopNotifications.settingsHint', {}, true)"
        data-testid="rancher-ai-ui-desktop-notifications-settings-hint"
      />
    </div>
  </Transition>
</template>

<style lang='scss' scoped>
.chat-notifications-action-msg-bubble {
  background: var(--body-bg);
  color: var(--body-text);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  width: 100%;
  line-height: 21px;
  word-break: break-word;
}

.clickable-label {
  cursor: pointer;
  text-decoration: none;
  color: var(--link);

  &:hover {
    text-decoration: underline;
  }
}

.fade-dissolve-enter-active,
.fade-dissolve-leave-active {
  transition: opacity 0.3s ease;
}

.fade-dissolve-enter-from,
.fade-dissolve-leave-to {
  opacity: 0;
}
</style>
