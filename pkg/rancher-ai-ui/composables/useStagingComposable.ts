import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import { PRODUCT_NAME } from '../product';

interface OpenArgs {
  component: { name: string; watcher?: { close: (fn: Function) => void } }; // eslint-disable-line no-unused-vars
  data: any;
}

/**
 * Composable for managing the staging component which is generic
 * and can be used across the app to open a staging page with any component and data.
 * The staging page will be responsible for rendering the component with the provided data.
 */
export function useStagingComposable() {
  const store = useStore();
  const route = useRoute();
  const router = useRouter();

  function open(args: OpenArgs) {
    let currentRoute = route.path || '';

    // Prevent setting route to staging page itself
    if (currentRoute.includes('/explorer/staging')) {
      currentRoute = store.getters['rancher-ai-ui/staging/all']?.previousRoute || '';
    }

    store.commit('rancher-ai-ui/staging/setData', {
      ...args,
      route: currentRoute,
    });

    router.push({
      name:   `c-cluster-${ PRODUCT_NAME }-staging`,
      params: {
        cluster: 'local', // TODO pass actual cluster if needed
        product: 'explorer',
      },
    });
  }

  return { open };
}
