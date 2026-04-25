<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ComponentName } from './types';
import YamlEditor from './yaml-editor/index.vue';

const router = useRouter();
const store = useStore();

const staging = computed(() => store.getters['rancher-ai-ui/staging/all']);

function getStagingComponent(name: ComponentName) {
  switch (name) {
  case ComponentName.YAML_EDITOR:
    return YamlEditor;
  default:
    return null;
  }
}

function close() {
  let route;

  if (staging.value) {
    route = staging.value.previousRoute;

    store.commit('rancher-ai-ui/staging/resetData');
  }

  if (route) {
    router.push(route);
  } else {
    router.back();
  }
}

onMounted(() => {
  if (!staging.value) {
    close();
  }

  const watchConditionThen = staging.value?.component?.watcher?.close;

  if (watchConditionThen) {
    watchConditionThen(close);
  }
});
</script>

<template>
  <component
    :is="getStagingComponent(staging?.component?.name)"
    :key="staging?.id"
    :value="staging?.data"
    @close="close"
  />
</template>