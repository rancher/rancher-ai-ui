<script setup lang="ts">
import { ref, PropType, onMounted, nextTick } from 'vue';
import { useStore } from 'vuex';
import Banner from '@components/Banner/Banner.vue';

const props = defineProps({
  sectionId: {
    type:     String,
    required: true,
  },
  title: {
    type:     String,
    default:  '',
  },
  description: {
    type:     String,
    default:  '',
  },
  banner: {
    type:     Object as PropType<{ color: string; label: string } | null>,
    default:  () => null,
  },
});

const store = useStore();

const isExpanded = ref(true);

function ensureScrollToRow() {
  const section = store.state.$router.currentRoute.value?.query?.section;

  if (section && section === props.sectionId) {
    nextTick(() => {
      const element = document.getElementById(props.sectionId);

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block:    'start'
        });
      }
    });
  }
}

onMounted(() => {
  ensureScrollToRow();
});
</script>

<template>
  <div
    :id="props.sectionId"
    class="settings-row"
  >
    <div class="header">
      <div
        class="title clickable"
        :tabindex="0"
        @click="isExpanded = !isExpanded"
        @keydown.space.enter.stop.prevent="isExpanded = !isExpanded"
      >
        <i
          :class="{
            ['icon icon-chevron-right']: !isExpanded,
            ['icon icon-chevron-down']: isExpanded,
          }"
        />
        <h2 class="label">
          {{ props.title }}
        </h2>
      </div>
      <div
        v-if="props.description"
        class="description mt-10"
      >
        <label
          class="text-label"
          :aria-describedby="props.description"
        >
          {{ props.description }}
        </label>
      </div>
    </div>

    <template v-if="isExpanded">
      <div
        v-if="props.banner"
      >
        <Banner
          class="m-0"
          :color="props.banner.color"
          :label="props.banner.label"
        />
      </div>

      <div class="body">
        <slot />
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.settings-row {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.header {
  .title {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    width: fit-content;

    &:focus-visible {
      @include focus-outline;
    }

    .label {
      margin: 0 !important;
    }
  }
}

.clickable {
  cursor: pointer;
}
</style>
