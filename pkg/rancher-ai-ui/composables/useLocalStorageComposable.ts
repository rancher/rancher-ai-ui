import { computed } from 'vue';
import { useStore } from 'vuex';
import { NORMAN } from '@shell/config/types';

/**
 * Revision number for the local storage schema.
 *
 * IMPORTANT: update the REVISION number when we want to invalidate existing local storage data.
 */
const REVISION = 1;

/**
 * Composable for managing the local storage.
 */
export function useLocalStorageComposable() {
  const store = useStore();

  const user = computed(() => {
    const principal = store.getters['rancher/byId'](NORMAN.PRINCIPAL, store.getters['auth/principalId']) || {};

    return principal.loginName;
  });

  const storage = computed(() => store.getters['rancher-ai-ui/storage/get'](user.value, REVISION));

  function get(key: string): any {
    return storage.value?.[key];
  }

  function set(key: string, value: any) {
    store.commit('rancher-ai-ui/storage/set', {
      key,
      value,
      user:     user.value,
      revision: REVISION
    });
  }

  return {
    get,
    set
  };
}
