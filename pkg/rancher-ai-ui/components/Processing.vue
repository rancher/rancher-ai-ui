<script setup lang="ts">
import debounce from 'lodash/debounce';
import {
  ref, computed, onMounted,
  onBeforeUnmount,
  watch
} from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';

const store = useStore();
const { t } = useI18n(store);

const IDLE = 'idle';
const now = ref(Date.now());

let interval: any;

const props = defineProps({
  phases: {
    type:    Array as () => string[],
    default: () => [],
  },
  phase: {
    type:    String,
    default: '',
  },
  showProgress: {
    type:    Boolean,
    default: true,
  },
});

const dots = computed(() => {
  const cycle = Math.floor((now.value / 500) % 4);

  return '.'.repeat(cycle);
});

// Debounce props.phase to avoid rapid changes
const phase = ref(props.phase);
const applyPhase = debounce((v) => {
  phase.value = v;
}, 150);

watch(() => props.phase, (v) => applyPhase(v), { immediate: true });

const label = computed(() => {
  if (phase.value && phase.value !== IDLE && (!props.phases.length || props.phases.includes(phase.value))) {
    return t(`ai.phase.${ phase.value }`);
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
    <div
      v-if="props.showProgress"
      class="dots"
    >
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
