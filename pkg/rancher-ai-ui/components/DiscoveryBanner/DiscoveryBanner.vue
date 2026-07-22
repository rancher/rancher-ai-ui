<script setup lang="ts">
import { computed } from 'vue';
import Banner from '@components/Banner/Banner.vue';
import RichTranslation from '@shell/components/RichTranslation.vue';

interface DiscoveryStatus {
  result?: 'success' | 'warning' | 'info' | null;
  message?: string;
}

type BannerAction = 'confirm' | 'cancel';

interface BannerProps {
  color: string;
  key: string;
  message: string;
  action: BannerAction;
}

const props = defineProps({
  status: {
    type:    Object as () => DiscoveryStatus,
    default: () => ({} as DiscoveryStatus),
  },
  translationKey: {
    type:    String,
    default: '',
  },
});

const emit = defineEmits(['confirm', 'cancel']);

const banner = computed<BannerProps>(() => {
  const status = props.status;

  const color = status?.result || 'info';
  const key = status?.result === undefined ? 'info' : status?.result || 'inProgress';
  const message = status?.message || '';
  const action = status?.result === null ? 'cancel' : 'confirm';

  return {
    color,
    key,
    message,
    action,
  };
});

function emitAction(value: BannerAction) {
  emit(value);
}
</script>

<template>
  <Banner
    class="m-0"
    :color="banner.color"
  >
    <RichTranslation
      :k="`${props.translationKey}.${banner.key}`"
    >
      <template #message>
        <span
          v-if="banner.message"
          v-clean-html="t(`${props.translationKey}.message`, { message: banner.message }, true)"
        />
      </template>
      <template #action="{ content }">
        <span
          v-clean-html="content"
          class="clickable-label"
          :data-testid="`rancher-ai-ui-discovery-banner-button-${props.translationKey}`"
          @click="emitAction(banner.action)"
        />
      </template>
    </RichTranslation>
  </Banner>
</template>

<style scoped lang="scss">
.clickable-label {
  text-decoration: underline;
  cursor: pointer;
}
</style>
