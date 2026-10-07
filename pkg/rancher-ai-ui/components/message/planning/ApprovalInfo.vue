<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import RichTranslation from '@shell/components/RichTranslation.vue';
import { PRODUCT_NAME } from '../../../product';
import SystemAvatar from '../avatar/SystemAvatar.vue';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  principal: {
    type:    Object as PropType<{ loginName?: string }>,
    default: () => ({} as { loginName?: string }),
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
  timestamp: {
    type:    Date,
    default: () => new Date(),
  }
});

const userKey = computed(() => props.principal?.loginName === 'admin' ? 'admin' : 'user');

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
    class="chat-planning-approval-info"
    :class="{ 'disabled-panel': props.disabled }"
  >
    <SystemAvatar class="chat-msg-avatar" />
    <div class="chat-planning-approval-info-content">
      <div
        class="chat-planning-approval-info-msg-bubble"
      >
        <div class="chat-planning-approval-info-msg-text">
          <RichTranslation
            :k="`ai.planning.notification.approvalInfo.label.${ userKey }`"
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
      <div class="chat-msg-timestamp">
        {{ props.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
      </div>
    </div>
  </div>
</template>

<style lang='scss' scoped>
.chat-planning-approval-info {
  display: flex;
  gap: 8px;
}

.chat-planning-approval-info-msg-bubble {
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

.chat-planning-approval-info-msg-text, :deep() pre {
  word-break: break-word;
  white-space: pre-line;
  list-style-position: inside;
}

.chat-planning-approval-info-msg-text {
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

.chat-msg-timestamp {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 8px;
  margin-bottom: 8px;
  align-self: flex-end;
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
