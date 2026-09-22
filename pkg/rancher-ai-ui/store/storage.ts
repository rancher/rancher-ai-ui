import { CoreStoreSpecifics, CoreStoreConfig } from '@shell/core/types';
import { PRODUCT_NAME } from '../product';
import { warn } from '../utils/log';
import { StorageKey } from '../types';

/**
 * Manages the state for storage data
 */
interface State {
  data?: Record<StorageKey, any>;
}

const DEFAULT_STORAGE = { [StorageKey.ENABLE_AUTO_SCROLL]: true };

const getters = {
  get: (state: State) => (user: string, revision: number) => {
    if (state?.data) {
      return state.data;
    }

    try {
      const stored = window.localStorage.getItem(PRODUCT_NAME);

      if (stored) {
        const parsed = JSON.parse(stored);

        if (parsed.revision === `${ revision }` || parsed.user === user) {
          return parsed.data;
        }
      }
    } catch (error) {
      warn(`Failed to get local storage item`, error);
    }

    return DEFAULT_STORAGE;
  }
};

const mutations = {
  set(state: State, {
    key, value, user, revision
  }: { key: string, value: any, user: string, revision: number }) {
    try {
      const toSave: any = {
        data: {
          ...DEFAULT_STORAGE,
          ...state.data,
          [key]: value,
        },
        user,
        revision
      };

      window.localStorage.setItem(PRODUCT_NAME, JSON.stringify(toSave));

      state.data = toSave.data;
    } catch (error) {
      warn(`Failed to set local storage item [${ key }]`, error);
    }
  }
};

const actions = {};

const factory = (): CoreStoreSpecifics => {
  return {
    state: (): State => {
      return { data: undefined };
    },
    getters:   { ...getters },
    mutations: { ...mutations },
    actions:   { ...actions },
  };
};

const config: CoreStoreConfig = { namespace: `${ PRODUCT_NAME }/storage` };

export default {
  specifics: factory(),
  config
};
