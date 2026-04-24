<script setup lang="ts">
import { computed, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ComponentName } from './types';
import YamlEditor from './yaml-editor/index.vue';

const router = useRouter();
const store = useStore();

const staging = computed(() => store.getters['rancher-ai-ui/staging/all']);

function getStagingComponent(component: ComponentName) {
  switch (component) {
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

watch(staging, (val) => {
  if (!val) {
    close();
  }
}, {
  immediate: true,
  deep:      true
});
</script>

<template>
  <component
    :is="getStagingComponent(staging?.component)"
    :key="staging?.id"
    :value="staging?.data"
    @close="close"
  />
</template>