import { PRODUCT_NAME } from '../product';
import { CoreStoreSpecifics, CoreStoreConfig } from '@shell/core/types';
import { ContextTag, Context, HookContextTag } from '../types';
import { validateContext } from '../utils/context';

const enum ContextType {
  ALL       = 'all',       // eslint-disable-line no-unused-vars
  CLUSTER   = 'cluster',   // eslint-disable-line no-unused-vars
  NAMESPACE = 'namespace', // eslint-disable-line no-unused-vars
}

/**
 * Determine if context should be allowed based on cluster and path
 *
 * Excludes context if not in the current cluster path
 */
function allowCluster(rootState: any, currentCluster: any): boolean {
  const currentPath = rootState?.targetRoute?.path || '';

  return currentCluster && currentPath.includes(`/c/${ currentCluster.name }`);
};

/**
 * Determine if context should be allowed based on namespace and path
 *
 * Excludes context if not in the active namespace filters
 *
 * Possible activeNamespaceFilters values:
 *
 * ['all://user']  // Only User Namespaces
 * ['all://system']  // Only System Namespaces
 * ['namespaced://true']  // All Namespaced Resources
 * ['namespaced://false']  // All Cluster Resources
 * ['ns://{namespace}', 'ns://{namespace2}', ...] // One or more Specific Namespace
 *
 * The logic below only handles the 'ns://' case, as the others are not handled.
 */
function allowNamespace(rootGetters: any): boolean {
  const activeNamespaceFilters = rootGetters['activeNamespaceFilters'] || [];

  return !!activeNamespaceFilters.find((n: string) => n?.startsWith('ns://'));
}

/**
 * Determine if context should be allowed based on product and path
 *
 * Excludes context if in home, settings, or auth paths
 *
 * @param contextType - The type of context to check (cluster, namespace, or all)
 */
function allowProduct(rootState: any, contextType: ContextType = ContextType.ALL): boolean {
  const currentPath = rootState?.targetRoute?.path || '';

  switch (contextType) {
  case ContextType.CLUSTER:
  case ContextType.NAMESPACE:
  case ContextType.ALL:
    return !currentPath.includes('/home') &&
        rootState.productId !== 'settings' &&
        rootState.productId !== 'auth' &&
        rootState.productId !== 'uiplugins';

  default:
    return true;
  }
};

/**
 * Manages the state of context within the Rancher AI UI.
 *
 * Context is used to provide additional information to AI prompts.
 */

interface State {
  context: Context[];
}

const getters = {
  /**
   * Gets the default context from the main Rancher UI (those without a hookId).
   */
  default: (state: State, getters: any, rootState: any, rootGetters: any) => {
    const all = rootGetters['ui-context/all'] || [];

    const out =  all
      .filter((c: Context) => !c.hookId)
      .filter(validateContext);

    return out;
  },

  transient: (state: State) => {
    return state.context || [];
  },

  /**
   * Gets all active context.
   *
   * This includes context from the current cluster, active namespaces,
   * default context from the main Rancher UI, and any transient context
   * added specifically for Rancher AI.
   */
  all: (state: State, getters: any, rootState: any, rootGetters: any) => {
    const t = rootGetters['i18n/t'];

    // Get current cluster from the store
    const currentCluster = rootGetters['currentCluster'];

    const activeCluster = allowProduct(rootState) && allowCluster(rootState, currentCluster) ? [{
      tag:         ContextTag.CLUSTER,
      value:       currentCluster.name,
      valueLabel:  currentCluster.nameDisplay || currentCluster.name,
      description: t('ai.context.resources.cluster'),
      icon:        'icon-cluster'
    }] : [];

    // Get active namespaces from the store
    const namespaces = rootGetters['namespaces']() || {};

    let activeNamespaces: Context[] = [];

    if (allowProduct(rootState) && allowNamespace(rootGetters)) {
      activeNamespaces = Object.keys(namespaces)
        .filter((k) => !!namespaces[k])
        .map((value) => ({
          tag:         ContextTag.NAMESPACE,
          value,
          description: t('ai.context.resources.namespace'),
          icon:        'icon-namespace'
        }));
    }

    /**
     * Add resource's namespace as context if available
     *
     * This is added here to ensure it is included in the final context list
     * This will work only in Details pages where the context is set by the hook
     *
     * TODO for the long term, consider refactoring how context is managed and added.
     */
    const uiContext = rootGetters['ui-context/all'] || [];
    const resourceDetailsContext = uiContext.find((c: Context) => c.tag === HookContextTag.DetailsState);

    const resourceNamespaceCtx = resourceDetailsContext?.value?.namespace ? [{
      tag:         ContextTag.NAMESPACE,
      description: t('ai.context.resources.namespace'),
      icon:        'icon-namespace',
      value:       resourceDetailsContext?.value?.namespace
    }] : [];

    const all = [
      ...activeCluster,
      ...activeNamespaces,
      ...resourceNamespaceCtx,
      ...getters.default,
      ...state.context,
    ];

    const unique = all.filter((item, index, self) => index === self.findIndex((c) => c.tag === item.tag && c.value === item.value)
    );

    return unique;
  }
};

const mutations = {
  add: (state: State, context: Context[]) => {
    const toAdd = Array.isArray(context) ? context : [context];

    toAdd.forEach((context) => {
      if (!state.context.find((c) => c.tag === context.tag && c.value === context.value)) {
        state.context.push(context);
      }
    });
  },

  reset(state: State) {
    state.context = [];
  }
};

const actions = {};

const factory = (): CoreStoreSpecifics => {
  return {
    state: (): State => {
      return { context: [] };
    },
    getters:   { ...getters },
    mutations: { ...mutations },
    actions:   { ...actions },
  };
};
const config: CoreStoreConfig = { namespace: `${ PRODUCT_NAME }/context` };

export default {
  specifics: factory(),
  config
};