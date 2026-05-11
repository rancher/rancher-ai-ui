<script setup lang="ts">
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';

const store = useStore();
const { t } = useI18n(store);

</script>

<template>
  <div
    class="chat-news-msg-bubble"
  >
    <div class="chat-news-msg-text">
      <div class="chat-news-msg-text-title">
        <span><b>{{ t('ai.message.system.news.label') }}</b></span>
      </div>
      <span
        v-clean-html="t(`ai.message.system.news.message.info`, {}, true)"
      />
    </div>
  </div>
</template>

<style lang='scss' scoped>
.chat-news-msg-bubble {
  position: relative;
  background: var(--body-bg);
  color: var(--body-text);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 2px 8px 0 var(--shadow);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  line-height: 21px;
}

.chat-news-msg-text, :deep() pre {
  word-break: break-word;
  white-space: pre-line;
  list-style-position: inside;
}

.chat-news-msg-text-title {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 4px;
}
</style>
