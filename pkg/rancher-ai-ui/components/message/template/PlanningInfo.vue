<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import RichTranslation from '@shell/components/RichTranslation.vue';
import { PRODUCT_NAME } from '../../../product';
import { Message } from '../../../types';
import SystemAvatar from '../avatar/SystemAvatar.vue';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  message: {
    type:    Object as PropType<Message>,
    default: () => ({} as Message),
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
});

const isAdmin = computed(() => {
  const principal = props.message.templateContent?.content?.principal;

  return principal?.loginName === 'admin';
});

function routeToSettings() {
  store.state.$router.push({
    name:   `c-cluster-settings-${ PRODUCT_NAME }`,
    params: { cluster: store.state.$route.params.cluster || 'local' },
    query:  { section: 'chat-settings' },
  });
}
</script>

<template>
  <div
    class="chat-planning-info-message"
    :class="{ 'disabled-panel': props.disabled }"
  >
    <SystemAvatar class="chat-msg-avatar" />
    <div
      v-if="props.message?.templateContent?.content?.message"
      class="chat-planning-info-msg-bubble"
    >
      <div class="chat-planning-info-msg-text">
        <RichTranslation
          :k="`ai.planning.notification.approvalInfo.label.${ isAdmin ? 'admin' : 'user' }`"
        >
          <template #goToChatSettings="{ content }">
            <a
              v-clean-tooltip="{ content: t('ai.planning.notification.approvalInfo.tooltip'), delay: { show: 300 } }"
              class="text-label clickable-label"
              @click="routeToSettings()"
            >
              {{ content }}
            </a>
          </template>
        </RichTranslation>
      </div>
    </div>
  </div>
</template>

<style lang='scss' scoped>
.chat-planning-info-message {
  display: flex;
  gap: 8px;
}

.chat-planning-info-msg-bubble {
  position: relative;
  background: var(--body-bg);
  color: var(--body-text);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 2px 8px 0 var(--shadow);
  padding: 12px;
  line-height: 21px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chat-planning-info-msg-text, :deep() pre {
  word-break: break-word;
  white-space: pre-line;
  list-style-position: inside;
}

.chat-planning-info-msg-text {
  &:deep(code) {
    padding: initial;
    border: initial;
    border-radius: initial;
    background-color: transparent;
    color: #025937;
  }

  &:deep(ul) {
    white-space: normal;
    margin: 0;
    padding-left: 1rem;
  }

  &:deep(th) {
    text-align: left;
  }

  &:deep(pre) {
    margin: 0;
  }
}

.clickable-label {
  cursor: pointer;
  text-decoration: none;
  color: var(--link);
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &:hover {
    text-decoration: underline;
  }

  i {
    font-size: 0.9em;
    display: inline-block;
  }
}
</style>
