import { PRODUCT_NAME } from '../product';
import { CoreStoreSpecifics, CoreStoreConfig } from '@shell/core/types';
import { randomStr } from '@shell/utils/string';

/**
 * Manages the state for staging component which is generic
 */

interface ComponentData {
  name: string;
  watcher?: {
    close: (fn: Function) => void; // eslint-disable-line no-unused-vars
  };
}

interface State {
  id?: string;
  previousRoute?: string;
  component?: ComponentData;
  data?: any;
}

const getters = {
  all(state: State) {
    if (!state.id) {
      return null;
    }

    return state;
  }
};

const mutations = {
  setData(state: State, { component, route, data }: { component: ComponentData, route: string, data: any }) {
    state.id = randomStr();
    state.previousRoute = route;
    state.component = component;
    state.data = data;
  },
  resetData(state: State) {
    state.id = undefined;
    state.previousRoute = undefined;
    state.component = undefined;
    state.data = undefined;
  }
};

const actions = {};

const factory = (): CoreStoreSpecifics => {
  return {
    state: (): State => {
      return {
        id:            undefined,
        previousRoute: undefined,
        component:     undefined,
        data:          undefined
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
