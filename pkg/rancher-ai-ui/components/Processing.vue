<script setup lang="ts">
import {
  ref, computed, onMounted,
  onBeforeUnmount
} from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';

const store = useStore();
const { t } = useI18n(store);

const now = ref(Date.now());

let interval: any;

const props = withDefaults(defineProps<{
  phases?: string[];
  phase?: string | null;
}>(), {
  phases: () => [],
  phase:  null,
});

const dots = computed(() => {
  const cycle = Math.floor((now.value / 500) % 4);

  return '.'.repeat(cycle);
});

const label = computed(() => {
  if (props.phase && props.phase !== 'idle' && (!props.phases.length || props.phases.includes(props.phase))) {
    return t(`ai.phase.${ props.phase }`);
  }

  return '';
});

onMounted(() => {
  interval = setInterval(() => {
    now.value = Date.now();
  }, 500);
});

onBeforeUnmount(() => {
  if (interval) {
    clearInterval(interval);
  }
});
</script>

<template>
  <div
    v-if="label"
    class="processing-message"
    :data-testid="`rancher-ai-ui-processing-phase-${ label }`"
  >
    <span>
      {{ label }}
    </span>
    <div class="dots">
      <span>
        {{ dots }}
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.processing-message {
  .dots {
    display: inline-flex;
    width: 12px;
  }
}
</style>
