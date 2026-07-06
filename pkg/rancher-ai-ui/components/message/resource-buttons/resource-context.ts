import type { Store as VuexStore } from 'vuex';
import { STORE } from '@shell/store/store-types';
import { NORMAN, MANAGEMENT, METRIC } from '@shell/config/types';
import { ActionResource } from '../../../types';
import { warn } from '../../../utils/log';

type Store = VuexStore<any> & { rootGetters?: Record<string, string> };

interface Schema {
  attributes: {
    crd?: boolean | string;
    namespaced?: boolean;
    group?: string;
  };
}
interface Product {
  name: string;
  inStore?: string;
}

interface DetailLocation {
  name: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

const PRODUCT = {
  EXPLORER: 'explorer',
  FLEET:    'fleet',
};

const RANCHER_STORES = [STORE.MANAGEMENT, STORE.CLUSTER, STORE.RANCHER];

const MANAGEMENT_GROUP = 'management.cattle.io';
const FLEET_GROUP = 'fleet.cattle.io';

const NODE_METRICS = 'nodemetrics';
const POD_METRICS = 'podmetrics';

const MANAGEMENT_CLOUD_CREDENTIAL = 'management.cattle.io.cloudcredential';

/**
 * Check if the given schema represents a Custom Resource Definition (CRD)
 *
 * @param schema - The schema object to check
 * @returns True if the schema represents a Custom Resource Definition (CRD), false otherwise
 */
export function isCRD(schema: Schema | null): boolean {
  return schema?.attributes.crd === true || schema?.attributes.crd === 'true';
}

/**
 * Get the product by its name from the store's active products
 *
 * @param store - The Vuex store instance
 * @param productName - The name of the product to retrieve
 * @returns The product object if found, otherwise undefined
 */
export function getProductByName(store: Store, productName: string): Product {
  const activeProducts = store.getters['type-map/activeProducts'];

  return activeProducts.find((p: Product) => p.name === productName);
}

/**
 * Convert Norman API type to Management API type to ensure they are correctly fetched
 * @param type - The Norman type (e.g., 'project', 'globalRole')
 * @returns The Management API type (e.g., 'management.cattle.io.project')
 */
export function convertToManagementType(type: string): string {
  const managementTypeMap: Record<string, string> = {
    [NORMAN.AUTH_CONFIG]:                   MANAGEMENT.AUTH_CONFIG,
    [NORMAN.CLUSTER]:                       MANAGEMENT.CLUSTER,
    [NORMAN.CLUSTER_ROLE_TEMPLATE_BINDING]: MANAGEMENT.CLUSTER_ROLE_TEMPLATE_BINDING,
    [NORMAN.CLOUD_CREDENTIAL]:              MANAGEMENT_CLOUD_CREDENTIAL,
    [NORMAN.GLOBAL_ROLE]:                   MANAGEMENT.GLOBAL_ROLE,
    [NORMAN.GLOBAL_ROLE_BINDING]:           MANAGEMENT.GLOBAL_ROLE_BINDING,
    [NORMAN.KONTAINER_DRIVER]:              MANAGEMENT.KONTAINER_DRIVER,
    [NORMAN.PROJECT]:                       MANAGEMENT.PROJECT,
    [NORMAN.PROJECT_ROLE_TEMPLATE_BINDING]: MANAGEMENT.PROJECT_ROLE_TEMPLATE_BINDING,
    [NORMAN.ROLE_TEMPLATE]:                 MANAGEMENT.ROLE_TEMPLATE,
    [NORMAN.SETTING]:                       MANAGEMENT.SETTING,
    [NORMAN.TOKEN]:                         MANAGEMENT.TOKEN,
    [NORMAN.USER]:                          MANAGEMENT.USER,
    [NODE_METRICS]:                         METRIC.NODE,
    [POD_METRICS]:                          METRIC.POD,
  };

  return managementTypeMap[type] || type;
}

export function getManagementSchema(store: Store, type = '') {
  const managementType = convertToManagementType(type);

  return store.getters[`${ STORE.MANAGEMENT }/schemaFor`](managementType);
}

/**
 * Get the store context for a given product.
 * If the product is a Rancher product, return 'management'. Otherwise, return the product's inStore value.
 *
 * @param product - The product object containing name and inStore properties
 * @returns The store context (e.g., 'management', 'cluster', or the product's inStore value)
 */
export function getInStore(product: Product): string {
  // We want to use management for Rancher resources
  if (!product.inStore || RANCHER_STORES.includes(product.inStore)) {
    return STORE.MANAGEMENT;
  }

  // Return the real store (e.g. harvester)
  return product.inStore;
}

/**
 * Check if the given store context is a management store.
 * @param inStore - The store context to check (e.g., 'management', 'cluster')
 * @returns True if the store is a management store, false otherwise
 */
export function isManagementStore(inStore: string): boolean {
  return inStore === STORE.MANAGEMENT;
}

/**
 * Check if the given schema belongs to the management group.
 * @param schema - The schema object to check
 * @returns True if the schema belongs to the management group, false otherwise
 */
export function isManagementGroup(schema: Schema | null): boolean {
  return schema?.attributes?.group === MANAGEMENT_GROUP;
}

/**
 * Normalize the resource type based on the store context.
 * If the store is a management store, convert the type to its management equivalent.
 *
 * @param inStore - The store context (e.g., 'management', 'cluster')
 * @param type - The resource type to normalize (e.g., 'project', 'globalRole')
 * @returns The normalized resource type
 */
export function normalizeType(inStore: string, type = ''): string {
  if (isManagementStore(inStore)) {
    return convertToManagementType(type);
  }

  return type;
}

/**
 * Normalize the resource ID based on the schema and store context.
 * For namespaced resources, the ID is 'namespace/name'.
 * For non-namespaced resources, the ID is 'cluster/name' (i.e. project, clusterRole).
 *
 * @param schema - The schema object for the resource type
 * @param cluster - The cluster name (used for non-namespaced resources)
 * @param namespace - The namespace name (used for namespaced resources)
 * @param name - The resource name
 * @returns The normalized resource ID
 */
export function normalizeId(schema: Schema | null, cluster = '', namespace = '', name = ''): string {
  if (isManagementGroup(schema)) {
    return `${ cluster }/${ name }`;
  }

  return namespace ? `${ namespace }/${ name }` : name;
}

/**
 * Normalize the namespace for a resource based on its schema and store context.
 * For namespaced resources, return the namespace.
 * For non-namespaced resources, return the cluster name (i.e., project, clusterRole).
 *
 * @param schema - The schema object for the resource type
 * @param cluster - The cluster name (used for non-namespaced resources)
 * @param namespace - The namespace name (used for namespaced resources)
 * @returns The normalized namespace or cluster name
 */
export function normalizeNamespace(schema: Schema | null, cluster = '', namespace = ''): string {
  if (isManagementGroup(schema)) {
    return cluster;
  }

  return namespace;
}

/**
 * Get the product that owns the given resource type based on
 * the store's active products and the resource's schema.
 *
 * @param store - The Vuex store instance
 * @param schema - The schema object for the resource type (can be null)
 * @param resourceType - The resource type to find the owning product for
 * @returns The product that owns the resource type, or the explorer product if not found
 */
export function getProduct(store: Store, schema: Schema | null, resourceType = ''): Product {
  const activeProducts = store.getters['type-map/activeProducts'];

  if (resourceType.startsWith(FLEET_GROUP)) {
    return getProductByName(store, PRODUCT.FLEET);
  }

  // Return explorer if type is native
  if (!schema || !isCRD(schema)) {
    return getProductByName(store, PRODUCT.EXPLORER);
  }

  for (const product of activeProducts) {
    if (product.inExplorer) {
      continue;
    }

    const allTypes = store.getters['type-map/allTypes'](product.name)?.['all'] || {};

    if (allTypes[resourceType]) {
      return product;
    }
  }

  return getProductByName(store, PRODUCT.EXPLORER);
}

/**
 * Get the detail location for a given resource by instantiating its model and accessing the detailLocation getter.
 * This function handles the necessary context for the model to work correctly, including getters and rootGetters.
 *
 * @param store - The Vuex store instance
 * @param productName - The name of the product that owns the resource
 * @param inStore - The store context (e.g., 'management', 'cluster')
 * @param resource - The resource object containing cluster, type, namespace, and name
 * @returns The detail location object if available, otherwise null
 */
export function getDetailLocation(
  store: Store,
  productName: string,
  schema: Schema | null,
  inStore: string,
  resource: ActionResource = {},
): DetailLocation | null {
  const {
    cluster, type, namespace, name
  } = resource;

  const normalizedType = normalizeType(inStore, type);
  const normalizedId = normalizeId(schema, cluster, namespace, name);
  const normalizedNamespace = normalizeNamespace(schema, cluster, namespace);

  try {
    // Build minimal data object for model instantiation
    const data = {
      type:     normalizedType,
      id:       normalizedId,
      metadata: {
        name,
        namespace: normalizedNamespace,
      }
    };

    // Get the correct store context
    const storeCtx = store.getters[`${ inStore }/classify`];

    if (!storeCtx) {
      return null;
    }

    // Instantiate the model with the correct store context
    // The Resource base class constructor is: constructor(data, ctx, rehydrateNamespace, isClone)
    const ModelClass = storeCtx(data);

    // Create a context object that proxies getters to the target store
    // This allows model getters like this.$getters.schemaFor to work
    const context = {
      getters: new Proxy({}, {
        get: (target, prop: string) => {
          // First try target store's getter
          const getter = store.getters[`${ inStore }/${ prop }`];

          if (getter !== undefined) {
            return getter;
          }

          // Fall back to root getters
          return store.rootGetters?.[prop];
        }
      }),
      rootGetters: new Proxy({}, {
        get: (target, prop: string) => {
          // Override specific root getters
          if (prop === 'currentProduct') {
            return {
              name: productName,
              inStore
            };
          }
          if (prop === 'productId') {
            return productName;
          }
          if (prop === 'clusterId') {
            return cluster;
          }

          // All other root getters pass through
          return store.rootGetters?.[prop];
        }
      }),
      state:     store.state,
      rootState: store.state,
      dispatch:  store.dispatch.bind(store),
      commit:    store.commit.bind(store)
    };

    const modelInstance = new ModelClass(data, context, null, false);

    // Get the detail location from the model's getter
    return modelInstance.detailLocation || null;
  } catch (e) {
    warn('Failed to build detail location from model:', e);
  }

  return null;
}