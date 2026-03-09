<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import RichTranslation from '@shell/components/RichTranslation.vue';
import { PERMISSIONS_DOCS_URL } from '../../../product';
import { Message } from '../../../types';
// @ts-expect-error FIXME: Cannot find module '../../../assets/liz-icon.svg'... Remove this comment to see the full error message
import lizIcon from '../../../assets/liz-icon.svg';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  message: {
    type:    Object as PropType<Message>,
    default: () => ({} as Message),
  },
});

const user = computed(() => {
  const principal = props.message.templateContent?.content?.principal;

  const out = { name: principal?.name || 'User' };

  if (principal?.loginName === 'admin') {
    out.name = principal?.loginName;
  }

  return out;
});
</script>

<template>
  <div
    class="chat-no-permissions-message"
  >
    <div class="chat-no-permissions-msg-splash">
      <div class="chat-no-permissions-msg-avatar-panel">
        <div class="chat-no-permissions-msg-avatar-circle">
          <img
            :src="lizIcon"
            alt="Liz Avatar"
            width="70"
            height="70"
          />
        </div>
        <div class="chat-no-permissions-msg-greeting">
          <span class="chat-no-permissions-msg-greeting-bubble">
            {{ t('ai.message.system.welcome.greetings.line3', { name: user.name }, true) }}
          </span>
        </div>
      </div>
      <div class="chat-no-permissions-msg-text-panel">
        <span>
          {{ t('ai.message.system.welcome.greetings.line1', {}, true) }}
        </span>
      </div>
    </div>
    <div
      v-if="props.message.templateContent?.content?.message"
      class="chat-no-permissions-msg-bubble"
    >
      <div class="chat-no-permissions-msg-text">
        <RichTranslation
          :k="'ai.message.system.noPermission.info'"
        >
          <template #docsUrl="{ content }">
            <a
              :href="`${ PERMISSIONS_DOCS_URL }`"
              tabindex="0"
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              {{ content }} <i class="icon icon-external-link" />
              <span class="sr-only">{{ t('generic.opensInNewTab') }}</span>
            </a>
          </template>
        </RichTranslation>
      </div>
    </div>
  </div>
</template>

<style lang='scss' scoped>
.chat-no-permissions-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: auto;
}

.chat-no-permissions-msg-splash {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: 16px;
  margin-bottom: 24px;
}

.chat-no-permissions-msg-avatar-panel {
  display: grid;
  place-items: center;
  position: relative;
  width: 100%;
  max-width: 250px;
  min-width: 150px;
}

.chat-no-permissions-msg-greeting {
  position: relative;
  background-color: transparent;
  width: 100%;
  height: 104px;
  grid-area: 1 / 1;
  z-index: 20;
}

.chat-no-permissions-msg-avatar-circle {
  grid-area: 1 / 1;
  width: 75%;
  z-index: 10;
  position: absolute;

  display: flex;
  align-items: center;
  justify-content: center;
  width: 104px;
  height: 104px;
  position: relative;

  background: var(--body-bg);
  color: var(--body-text);
  border: 1px solid var(--border);
  border-radius: 90px;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04);
}

.chat-no-permissions-msg-greeting-bubble {
  position: absolute;
  top: 0px;
  right: 0px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #35B777;
  color: var(--body-text);
  white-space: nowrap;
  pointer-events: none;
  transform-origin: right center;
}

.chat-no-permissions-msg-bubble {
  position: relative;
  background: var(--body-bg);
  color: var(--body-text);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.04);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  line-height: 21px;
}

.chat-no-permissions-msg-text-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
  font-family: Lato;
  font-size: 18px;
  font-style: normal;
  font-weight: 600;
  line-height: 28px;
}

.chat-no-permissions-msg-text, :deep() pre {
  word-break: break-word;
  white-space: pre-line;
  list-style-position: inside;
}

</style>
