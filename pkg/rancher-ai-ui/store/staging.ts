import { PRODUCT_NAME } from '../product';
import { CoreStoreSpecifics, CoreStoreConfig } from '@shell/core/types';

/**
 * Manages the state for staging YAML content before applying to the cluster.
 */

interface StagingData {
  yaml: string;
  resource?: {
    kind: string;
    namespace?: string;
    name?: string;
  };
}

interface State {
  staging: StagingData | null;
}

const getters = {
  yaml: (state: State) => {
    return state.staging?.yaml || '';
  },
  resource: (state: State) => {
    return state.staging?.resource || null;
  },
};

const mutations = {
  setStagingYaml(state: State, data: StagingData) {
    state.staging = data;
  },

  clearStaging(state: State) {
    state.staging = null;
  },

  updateYaml(state: State, yaml: string) {
    if (state.staging) {
      state.staging.yaml = yaml;
    }
  },
};

const actions = {};

const factory = (): CoreStoreSpecifics => {
  return {
    state: (): State => {
      return {
        staging: null,
      };
    },
    getters:   { ...getters },
    mutations: { ...mutations },
    actions:   { ...actions },
  };
};

const config: CoreStoreConfig = { namespace: `${ PRODUCT_NAME }/staging` };

export default {
  specifics: factory(),
  config
};
