<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import ContextTag from '../context/ContextTag.vue';

const store = useStore();
const t = store.getters['i18n/t'];

const isCollapsed = ref(false);

interface Props {
  links?: string[];
}
const { links = [] } = defineProps<Props>();

const items = computed(() => {
  return links.map((value) => {
    const chunks = value?.split('/') || [];
    const lastChunk = chunks[chunks.length - 1] || '';
    const label = lastChunk
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      label: label || 'Link',
      value
    };
  });
});

function openLink(url: string) {
  window.open(url, '_blank');
}

</script>

<template>
  <div class="chat-source-container">
    <div class="chat-msg-source-label">
      <span>{{ t('ai.message.source.label') }}</span>
      <i
        class="icon icon-sm"
        :class="{
          'icon icon-chevron-up text-label': !isCollapsed,
          'icon icon-chevron-down text-label': isCollapsed
        }"
        @click="isCollapsed = !isCollapsed"
      />
    </div>
    <div
      v-if="!isCollapsed"
      class="chat-msg-source-tags"
    >
      <div
        v-for="item in items"
        :key="item.value"
        @click="openLink(item.value)"
      >
        <span class="sr-only">{{ t('ai.generic.opensInNewTab') }}</span>
        <ContextTag
          :remove-enabled="false"
          :item="{ value: item.label }"
          type="user"
          class="chat-msg-source-tag"
        />
      </div>
    </div>
  </div>
</template>

<style lang='scss' scoped>
.chat-msg-source-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9fabc6;

  span {
    font: 9px sans-serif;
    font-weight: 500;
  }
}

.chat-msg-source-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.chat-msg-source-tag {
  height: auto;
  color: #9fabc6;
  border-radius: 8px;
  padding: 2px 8px;
  font-size: 0.75rem;
  border: 1px solid #9fabc6;
  cursor: pointer;
}

// Only display content to screen readers
.sr-only {
  visibility: hidden;
}
</style>
