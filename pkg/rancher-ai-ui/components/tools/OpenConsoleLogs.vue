<script setup lang="ts">
import { computed, onMounted, type PropType } from 'vue';
import { useStore } from 'vuex';
import { warn } from '../../utils/log';
import { useI18n } from '@shell/composables/useI18n';
import RcButton from '@components/RcButton/RcButton.vue';
import { ToolCall } from '../../types';

const store = useStore();
const { t } = useI18n(store);

const inStore = 'management';
const POD_TYPE = 'pod';

const props = defineProps({
  tool: {
    type:    Object as PropType<ToolCall>,
    default: () => {},
  },
});

const emit = defineEmits(['action']); // eslint-disable-line no-unused-vars

const pod = computed(() => {
  const { cluster, namespace, name } = props.tool.input || {};

  if (!cluster || !namespace || !name) {
    return null;
  }

  const id = `${ namespace }/${ name }`;

  return store.getters[`${ inStore }/byId`](POD_TYPE, id);
});

const tooltip = computed(() => {
  const { namespace, name } = props.tool.input || {};

  return t(`ai.tools.${ props.tool.toolName }.tooltip`, {
    namespace,
    name
  }, true);
});

async function openConsoleLogs() {
  const { cluster } = props.tool.input || {};

  if (!cluster) {
    warn('Cannot open console logs: cluster information is missing');

    return;
  }

  const currentPath = store.state.$router.currentRoute.value.path;
  const expectedBasePath = `/c/${ cluster }/explorer`;

  // If not in explorer route, navigate there first
  if (!currentPath.includes(expectedBasePath)) {
    await store.state.$router.push({ path: expectedBasePath });
  }

  const containerName = pod.value?.spec?.containers?.[0]?.name;

  store.dispatch('wm/open', {
    id:        `${ containerName }-logs`,
    label:     pod.value?.metadata?.name,
    icon:      'file',
    component: 'ContainerLogs',
    attrs:     {
      pod,
      initialContainer: containerName
    }
  }, { root: true });
}

onMounted(async() => {
  await store.dispatch('loadManagement');

  const {
    cluster, type = POD_TYPE, namespace, name
  } = props.tool.input || {};

  try {
    const id = `${ namespace }/${ name }`;

    if (cluster === 'local') {
      await store.dispatch(`${ inStore }/find`, {
        cluster,
        type,
        id,
      });
    } else {
      const url = `/k8s/clusters/${ cluster }/v1`;

      const data = await store.dispatch(`${ inStore }/request`, { url: `${ url }/${ type }s/${ id }?exclude=metadata.managedFields` });

      // Convert to model and store in cache
      await store.dispatch(`${ inStore }/load`, {
        data,
        invalidatePageCache: false
      });
    }
  } catch (e) {
    warn(`Action - Could not find resource with { cluster: ${ cluster }, type: ${ type }, name: ${ name }, namespace: ${ namespace } }`, e);
  }
});
</script>

<template>
  <div v-if="!!pod">
    <RcButton
      small
      tertiary
      @click="() => openConsoleLogs()"
    >
      <div class="open-console-logs-tool-label">
        <i class="icon icon-application" />
        <span
          v-clean-tooltip="tooltip"
          class="open-console-logs-tool-label-text"
        >
          {{ t(`ai.tools.${ props.tool.toolName }.name`, {}, true) }}
        </span>
      </div>
    </RcButton>
  </div>
</template>

<style scoped lang="scss">
.open-console-logs-tool-label {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;

  &-text {
    word-break: break-word;
    white-space: pre-line;
    list-style-position: inside;
  }
}
</style>