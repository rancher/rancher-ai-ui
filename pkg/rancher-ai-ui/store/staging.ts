import { PRODUCT_NAME } from '../product';
import { CoreStoreSpecifics, CoreStoreConfig } from '@shell/core/types';
import { randomStr } from '@shell/utils/string';

/**
 * Manages the state for staging component which is generic
 */

interface State {
  id?: string;
  previousRoute?: string;
  component?: string;
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
  setData(state: State, { component, route, data }: { component: string, route: string, data: any }) {
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

const actions = {
  setData({ state, rootState, commit }: any, { component, data }: { component: string, data: any }) {
    let route = rootState.$router.currentRoute.value.path || '';

    // Prevent setting route to staging page itself
    if (route.includes('/explorer/staging')) {
      route = state.previousRoute;
    }

    commit('setData', {
      component,
      route,
      data
    });
  }
};

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
