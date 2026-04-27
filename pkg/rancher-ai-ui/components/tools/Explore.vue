<script setup lang="ts">
import { computed, onMounted, ref, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import {
  CATALOG, EVENT, FLEET, MANAGEMENT, NODE, POD, WORKLOAD_TYPES
} from '@shell/config/types';
import RcButton from '@components/RcButton/RcButton.vue';
import { Message, ToolCall } from '../../types';
import { warn } from '../../utils/log';

interface RouteConfig {
  schema: string;
  resolve: (...args: string[]) => string; // eslint-disable-line no-unused-vars
}

const enum ROUTE_ID {
  ProjectsNamespaces = 'projects-namespaces', // eslint-disable-line no-unused-vars
  Nodes = 'nodes', // eslint-disable-line no-unused-vars
  Events = 'events', // eslint-disable-line no-unused-vars
  Charts = 'charts', // eslint-disable-line no-unused-vars
  Clusters = 'clusters', // eslint-disable-line no-unused-vars
  Fleet = 'fleet', // eslint-disable-line no-unused-vars
  Users = 'users', // eslint-disable-line no-unused-vars
  Settings = 'settings', // eslint-disable-line no-unused-vars
  Deployments = 'deployments', // eslint-disable-line no-unused-vars
  Pods = 'pods', // eslint-disable-line no-unused-vars
}

const ROUTES: Record<string, RouteConfig> = {
  [ROUTE_ID.ProjectsNamespaces]: {
    schema:  MANAGEMENT.PROJECT,
    resolve: (cluster: string) => `/c/${ cluster }/explorer/projectsnamespaces`,
  },
  [ROUTE_ID.Nodes]: {
    schema:  NODE,
    resolve: (cluster: string) => `/c/${ cluster }/explorer/node`,
  },
  [ROUTE_ID.Events]: {
    schema:  EVENT,
    resolve: (cluster: string) => `/c/${ cluster }/explorer/event`,
  },
  [ROUTE_ID.Charts]: {
    schema:  CATALOG.APP,
    resolve: (cluster: string) => `/c/${ cluster }/apps/charts`,
  },
  [ROUTE_ID.Clusters]: {
    schema:  'provisioning.cattle.io.cluster',
    resolve: () => '/c/_/manager/provisioning.cattle.io.cluster',
  },
  [ROUTE_ID.Fleet]: {
    schema:  FLEET.GIT_REPO,
    resolve: () => '/c/_/fleet',
  },
  [ROUTE_ID.Users]: {
    schema:  MANAGEMENT.USER,
    resolve: () => '/c/_/auth/management.cattle.io.user',
  },
  [ROUTE_ID.Settings]: {
    schema:  MANAGEMENT.SETTING,
    resolve: () => '/c/_/settings/management.cattle.io.setting',
  },
  [ROUTE_ID.Deployments]: {
    schema:  WORKLOAD_TYPES.DEPLOYMENT,
    resolve: (cluster: string) => `/c/${ cluster }/explorer/apps.deployment`,
  },
  [ROUTE_ID.Pods]: {
    schema:  POD,
    resolve: (cluster: string) => `/c/${ cluster }/explorer/pod`,
  }
};

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  tool: {
    type:    Object as PropType<ToolCall>,
    default: () => {},
  },
  message: {
    type:    Object as PropType<Message>,
    default: () => ({} as Message),
  },
  label: {
    type:    String,
    default: '',
  },
});

const emit = defineEmits(['action']); // eslint-disable-line no-unused-vars

const inStore = 'management';

const isLoading = ref(true);

const cluster = computed(() => {
  const allClusters = store.getters[`${ inStore }/all`](MANAGEMENT.CLUSTER) || [];

  return allClusters.find((c: any) => c.nameDisplay === props.tool.input.cluster || c.name === props.tool.input.cluster);
});

const route = computed(() => {
  const config = ROUTES[props.tool.input.route];

  if (!config) {
    return null;
  }

  const { schema, resolve } = config;

  if (!store.getters[`${ inStore }/schemaFor`](schema)) {
    return null;
  }

  if (cluster.value) {
    return resolve(cluster.value.name);
  }

  return null;
});

const label = computed(() => {
  return props.tool.input.label || t(`ai.tools.${ props.tool.toolName }.name`, {}, true) || props.tool.toolName;
});

function navigateToRoute() {
  if (route.value) {
    store.state.$router.push(route.value);
  } else {
    warn(`Unknown route: ${ props.tool.input.route }`);
  }
}

const tooltip = computed(() => {
  return t(`ai.tools.${ props.tool.toolName }.tooltip`, {
    label:   label.value,
    cluster: cluster.value?.name
  }, true);
});

onMounted(async() => {
  await store.dispatch('loadManagement');
  await store.dispatch(`${ inStore }/findAll`, { type: MANAGEMENT.CLUSTER });

  isLoading.value = false;
});
</script>

<template>
  <span v-if="isLoading">
    <i class="icon icon-spinner icon-spin ml-5" />
  </span>
  <div v-if="route">
    <RcButton
      v-clean-tooltip="tooltip"
      small
      tertiary
      @click="navigateToRoute"
    >
      <div class="explore-tool-label">
        <i class="icon icon-list-grouped" />
        <span class="explore-tool-label-text">
          {{ label }}
        </span>
      </div>
    </RcButton>
  </div>
</template>

<style scoped lang="scss">
.explore-tool-label {
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