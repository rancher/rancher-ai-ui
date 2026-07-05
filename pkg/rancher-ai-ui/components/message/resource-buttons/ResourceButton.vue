<script setup lang="ts">
import {
  computed, onBeforeUnmount, ref, watch, type PropType
} from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import RcButton from '@components/RcButton/RcButton.vue';
import { warn } from '../../../utils/log';
import { MessageAction } from '../../../types';
import {
  getProduct, getDetailLocation, getInStore, isManagementStore, normalizeType,
  getManagementSchema,
  isManagementGroup,
  normalizeId
} from './resource-context';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  value: {
    type:    Object as PropType<MessageAction>,
    default: () => ({} as MessageAction),
  },
  isVisible: {
    type:    Boolean,
    default: false,
  }
});

const schema = ref(null);

const product = computed(() => getProduct(store, schema.value, props.value.resource?.type));

const inStore = computed(() => getInStore(product.value));

const resource = computed(() => {
  const {
    cluster, type, namespace, name
  } = props.value.resource || {};

  const normalizedType = normalizeType(inStore.value, type);
  const id = normalizeId(schema.value, cluster, namespace, name);

  return store.getters[`${ inStore.value }/byId`](normalizedType, id);
});

const label = computed(() => {
  if (props.value.label) {
    return props.value.label;
  }

  return t(`ai.message.actions.label`, {
    kind: resource.value ? resource.value.kind : props.value.resource?.kind || '',
    name: resource.value ? (resource.value.nameDisplay || resource.value.name) : props.value.resource?.name || ''
  }, true);
});

/**
 * Load the schema for the resource type, if available.
 * This is used to determine the product and store context for the resource.
 */
async function loadSchema() {
  const { cluster, type } = props.value.resource || {};

  const managementSchema = getManagementSchema(store, type);

  if (managementSchema) {
    return managementSchema;
  }

  try {
    const url = `/k8s/clusters/${ cluster }/v1/schemas/${ type }`;

    const schema = await store.dispatch('cluster/request', { url });

    if (schema) {
      return schema;
    }
  } catch (e) {
    warn(`Failed to load schema for ${ type } via cluster API:`, e);
  }

  return null;
}

/**
 * Fetch the resource from the store or cluster API, if not already available.
 * This is used to ensure that the resource is available for navigation to its detail page.
 */
async function fetchResource() {
  if (isManagementStore(inStore.value)) {
    await store.dispatch('loadManagement');
  }

  const {
    cluster, type, namespace, name
  } = props.value.resource || {};

  try {
    const normalizedType = normalizeType(inStore.value, type);
    const id = normalizeId(schema.value, cluster, namespace, name);

    if (isManagementGroup(schema.value)) {
      await store.dispatch(`${ inStore.value }/find`, {
        cluster,
        type: normalizedType,
        id,
      });
    } else if (cluster === 'local') {
      await store.dispatch(`${ inStore.value }/find`, {
        cluster,
        type: normalizedType,
        id,
      });
    } else {
      const url = `/k8s/clusters/${ cluster }/v1`;

      const data = await store.dispatch(`${ inStore.value }/request`, { url: `${ url }/${ normalizedType }s/${ id }?exclude=metadata.managedFields` });

      // Convert to model and store in cache
      await store.dispatch(`${ inStore.value }/load`, {
        data,
        invalidatePageCache: false
      });
    }
  } catch (e) {
    warn(`Could not find resource with { store: ${ inStore.value }, cluster: ${ cluster }, type: ${ type }, name: ${ name }, namespace: ${ namespace } }`, e);
  }
}

/**
 * Load the schema and resource.
 */
async function loadSchemaAndResource() {
  if (!!resource.value) {
    return;
  }

  if (!schema.value) {
    schema.value = await loadSchema();
  }

  if (!schema.value) {
    return;
  }

  await fetchResource();
}

function goTo() {
  if (!props.value.resource) {
    return;
  }

  if (!!resource.value) {
    const detailLocation = getDetailLocation(
      store,
      product.value.name,
      schema.value,
      inStore.value,
      props.value.resource
    );

    if (detailLocation) {
      store.state.$router.push(detailLocation);
    }
  }
}

/**
 * When moving from one cluster to another, we reset the store.
 * This watcher ensures that the schema and resource are reloaded if the button is visible.
 */
const clusterReadyWatcher = watch(() => store.getters.clusterReady, (isReady) => {
  if (isReady && props.isVisible) {
    loadSchemaAndResource();
  }
});

/**
 * Load the schema and resource when the button becomes visible.
 */
const isVisibleWatcher = watch(() => props.isVisible, async(isVisible) => {
  if (isVisible) {
    loadSchemaAndResource();
  }
}, { immediate: true });

onBeforeUnmount(() => {
  clusterReadyWatcher();
  isVisibleWatcher();
});
</script>

<template>
  <div ref="resourceButtonRef">
    <RcButton
      small
      variant="secondary"
      :disabled="!resource"
      :data-testid="`rancher-ai-ui-chat-message-resource-button-${ props.value?.resource?.name }`"
      @click="goTo"
    >
      <span class="rc-button-label">
        {{ label }}
      </span>
    </RcButton>
  </div>
</template>

<style lang='scss' scoped>
.rc-button-label {
  word-break: break-word;
  white-space: pre-line;
  list-style-position: inside;
}
</style>