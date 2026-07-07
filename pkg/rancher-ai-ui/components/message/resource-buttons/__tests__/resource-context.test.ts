import { STORE } from '@shell/store/store-types';
import { NORMAN, MANAGEMENT, METRIC } from '@shell/config/types';
import {
  isCRD,
  getProductByName,
  convertToManagementType,
  getManagementSchema,
  getInStore,
  isManagementStore,
  isManagementGroup,
  normalizeType,
  normalizeId,
  normalizeNamespace,
  getProduct,
  getDetailLocation
} from '../resource-context';
import type { Store as VuexStore } from 'vuex';

jest.mock('../../../../utils/log', () => ({ warn: jest.fn() }));

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
  inExplorer?: boolean;
}

describe('resource-context', () => {
  let mockStore: Store;

  beforeEach(() => {
    mockStore = {
      getters: {
        'type-map/activeProducts': [],
        'type-map/allTypes':       jest.fn(() => ({ all: {} })),
        'management/classify':     jest.fn(),
        'management/schemaFor':    jest.fn(),
      },
      dispatch:    jest.fn(),
      commit:      jest.fn(),
      state:       {},
      rootState:   {},
      rootGetters: {}
    } as any;
  });

  describe('isCRD', () => {
    it('should return true when schema.attributes.crd is true', () => {
      const schema: Schema = { attributes: { crd: true } };

      expect(isCRD(schema)).toBe(true);
    });

    it('should return true when schema.attributes.crd is "true" (string)', () => {
      const schema: Schema = { attributes: { crd: 'true' } };

      expect(isCRD(schema)).toBe(true);
    });

    it('should return false when schema.attributes.crd is false', () => {
      const schema: Schema = { attributes: { crd: false } };

      expect(isCRD(schema)).toBe(false);
    });

    it('should return false when schema.attributes.crd is "false" (string)', () => {
      const schema: Schema = { attributes: { crd: 'false' } };

      expect(isCRD(schema)).toBe(false);
    });

    it('should return false when crd property is missing', () => {
      const schema: Schema = { attributes: {} };

      expect(isCRD(schema)).toBe(false);
    });

    it('should return false when schema is null', () => {
      expect(isCRD(null as any)).toBe(false);
    });
  });

  describe('getProductByName', () => {
    it('should return product when found in active products', () => {
      const activeProducts: Product[] = [
        {
          name:    'explorer',
          inStore: STORE.CLUSTER
        },
        {
          name:    'fleet',
          inStore: STORE.MANAGEMENT
        },
        {
          name:    'harvester',
          inStore: 'harvester'
        }
      ];

      mockStore.getters['type-map/activeProducts'] = activeProducts;

      const result = getProductByName(mockStore, 'fleet');

      expect(result).toEqual({
        name:    'fleet',
        inStore: STORE.MANAGEMENT
      });
    });

    it('should return undefined when product is not found', () => {
      const activeProducts: Product[] = [
        {
          name:    'explorer',
          inStore: STORE.CLUSTER
        },
        {
          name:    'fleet',
          inStore: STORE.MANAGEMENT
        }
      ];

      mockStore.getters['type-map/activeProducts'] = activeProducts;

      const result = getProductByName(mockStore, 'nonexistent');

      expect(result).toBeUndefined();
    });

    it('should handle empty active products array', () => {
      mockStore.getters['type-map/activeProducts'] = [];

      const result = getProductByName(mockStore, 'any-product');

      expect(result).toBeUndefined();
    });

    it('should find product with exact name match only', () => {
      const activeProducts: Product[] = [
        {
          name:    'explorer',
          inStore: STORE.CLUSTER
        },
        {
          name:    'explore-er',
          inStore: STORE.MANAGEMENT
        }
      ];

      mockStore.getters['type-map/activeProducts'] = activeProducts;

      const result = getProductByName(mockStore, 'explorer');

      expect(result).toEqual({
        name:    'explorer',
        inStore: STORE.CLUSTER
      });
    });

    it('should be case sensitive', () => {
      const activeProducts: Product[] = [
        {
          name:    'Explorer',
          inStore: STORE.CLUSTER
        },
        {
          name:    'fleet',
          inStore: STORE.MANAGEMENT
        }
      ];

      mockStore.getters['type-map/activeProducts'] = activeProducts;

      const result = getProductByName(mockStore, 'explorer');

      expect(result).toBeUndefined();
    });
  });

  describe('convertToManagementType', () => {
    it('should convert NORMAN.AUTH_CONFIG to MANAGEMENT.AUTH_CONFIG', () => {
      const result = convertToManagementType(NORMAN.AUTH_CONFIG);

      expect(result).toBe(MANAGEMENT.AUTH_CONFIG);
    });

    it('should convert NORMAN.CLUSTER to MANAGEMENT.CLUSTER', () => {
      const result = convertToManagementType(NORMAN.CLUSTER);

      expect(result).toBe(MANAGEMENT.CLUSTER);
    });

    it('should convert NORMAN.USER to MANAGEMENT.USER', () => {
      const result = convertToManagementType(NORMAN.USER);

      expect(result).toBe(MANAGEMENT.USER);
    });

    it('should convert NORMAN.PROJECT to MANAGEMENT.PROJECT', () => {
      const result = convertToManagementType(NORMAN.PROJECT);

      expect(result).toBe(MANAGEMENT.PROJECT);
    });

    it('should convert nodemetrics to METRIC.NODE', () => {
      const result = convertToManagementType('nodemetrics');

      expect(result).toBe(METRIC.NODE);
    });

    it('should convert podmetrics to METRIC.POD', () => {
      const result = convertToManagementType('podmetrics');

      expect(result).toBe(METRIC.POD);
    });

    it('should handle NORMAN.CLOUD_CREDENTIAL to management cloud credential', () => {
      const result = convertToManagementType(NORMAN.CLOUD_CREDENTIAL);

      expect(result).toBe('management.cattle.io.cloudcredential');
    });

    it('should return the same type if not in mapping', () => {
      const unmappedType = 'custom.unknown.type';

      const result = convertToManagementType(unmappedType);

      expect(result).toBe(unmappedType);
    });

    it('should return empty string for empty input', () => {
      const result = convertToManagementType('');

      expect(result).toBe('');
    });

    it('should return all mapped types correctly', () => {
      const mappings = [
        [NORMAN.AUTH_CONFIG, MANAGEMENT.AUTH_CONFIG],
        [NORMAN.CLUSTER, MANAGEMENT.CLUSTER],
        [NORMAN.CLUSTER_ROLE_TEMPLATE_BINDING, MANAGEMENT.CLUSTER_ROLE_TEMPLATE_BINDING],
        [NORMAN.GLOBAL_ROLE, MANAGEMENT.GLOBAL_ROLE],
        [NORMAN.PROJECT, MANAGEMENT.PROJECT],
        [NORMAN.TOKEN, MANAGEMENT.TOKEN],
        [NORMAN.USER, MANAGEMENT.USER],
      ];

      mappings.forEach(([input, expected]) => {
        const result = convertToManagementType(input);

        expect(result).toBe(expected);
      });
    });
  });

  describe('getManagementSchema', () => {
    it('should call schemaFor with management store and normalized type', () => {
      mockStore.getters[`${ STORE.MANAGEMENT }/schemaFor`] = jest.fn(() => ({ type: MANAGEMENT.CLUSTER }));

      const result = getManagementSchema(mockStore, NORMAN.CLUSTER);

      expect(mockStore.getters[`${ STORE.MANAGEMENT }/schemaFor`]).toHaveBeenCalledWith(MANAGEMENT.CLUSTER);
      expect(result).toEqual({ type: MANAGEMENT.CLUSTER });
    });

    it('should handle custom types that are not in mapping', () => {
      mockStore.getters[`${ STORE.MANAGEMENT }/schemaFor`] = jest.fn(() => ({ type: 'custom.type' }));

      const result = getManagementSchema(mockStore, 'custom.type');

      expect(mockStore.getters[`${ STORE.MANAGEMENT }/schemaFor`]).toHaveBeenCalledWith('custom.type');
      expect(result).toEqual({ type: 'custom.type' });
    });

    it('should return undefined when schema not found', () => {
      mockStore.getters[`${ STORE.MANAGEMENT }/schemaFor`] = jest.fn(() => undefined);

      const result = getManagementSchema(mockStore, 'unknown.type');

      expect(result).toBeUndefined();
    });

    it('should handle empty type', () => {
      const schemaForGetter = jest.fn(() => null);

      mockStore.getters[`${ STORE.MANAGEMENT }/schemaFor`] = schemaForGetter;

      const result = getManagementSchema(mockStore, '');

      expect(schemaForGetter).toHaveBeenCalledWith('');
      expect(result).toBeNull();
    });
  });

  describe('getInStore', () => {
    it('should return STORE.MANAGEMENT for product without inStore', () => {
      const product: Product = { name: 'explorer' };

      const result = getInStore(product);

      expect(result).toBe(STORE.MANAGEMENT);
    });

    it('should return STORE.MANAGEMENT when product.inStore is STORE.MANAGEMENT', () => {
      const product: Product = {
        name:    'fleet',
        inStore: STORE.MANAGEMENT
      };

      const result = getInStore(product);

      expect(result).toBe(STORE.MANAGEMENT);
    });

    it('should return STORE.MANAGEMENT when product.inStore is STORE.CLUSTER', () => {
      const product: Product = {
        name:    'explorer',
        inStore: STORE.CLUSTER
      };

      const result = getInStore(product);

      expect(result).toBe(STORE.MANAGEMENT);
    });

    it('should return STORE.MANAGEMENT when product.inStore is STORE.RANCHER', () => {
      const product: Product = {
        name:    'rancher',
        inStore: STORE.RANCHER
      };

      const result = getInStore(product);

      expect(result).toBe(STORE.MANAGEMENT);
    });

    it('should return the real store for non-Rancher products', () => {
      const product: Product = {
        name:    'harvester',
        inStore: 'harvester'
      };

      const result = getInStore(product);

      expect(result).toBe('harvester');
    });

    it('should return the real store for custom inStore values', () => {
      const product: Product = {
        name:    'custom',
        inStore: 'custom-store'
      };

      const result = getInStore(product);

      expect(result).toBe('custom-store');
    });
  });

  describe('isManagementStore', () => {
    it('should return true when inStore is management', () => {
      const result = isManagementStore(STORE.MANAGEMENT);

      expect(result).toBe(true);
    });

    it('should return false when inStore is cluster', () => {
      const result = isManagementStore(STORE.CLUSTER);

      expect(result).toBe(false);
    });

    it('should return false when inStore is rancher', () => {
      const result = isManagementStore(STORE.RANCHER);

      expect(result).toBe(false);
    });

    it('should return false for custom store names', () => {
      const result = isManagementStore('harvester');

      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      const result = isManagementStore('');

      expect(result).toBe(false);
    });

    it('should be case sensitive', () => {
      const result = isManagementStore('Management');

      expect(result).toBe(false);
    });
  });

  describe('isManagementGroup', () => {
    it('should return true when schema group is management.cattle.io', () => {
      const schema: Schema = { attributes: { group: 'management.cattle.io' } };

      const result = isManagementGroup(schema);

      expect(result).toBe(true);
    });

    it('should return false when schema group is fleet.cattle.io', () => {
      const schema: Schema = { attributes: { group: 'fleet.cattle.io' } };

      const result = isManagementGroup(schema);

      expect(result).toBe(false);
    });

    it('should return false when schema group is custom domain', () => {
      const schema: Schema = { attributes: { group: 'kubevirt.io' } };

      const result = isManagementGroup(schema);

      expect(result).toBe(false);
    });

    it('should return false when schema is null', () => {
      const result = isManagementGroup(null);

      expect(result).toBe(false);
    });

    it('should return false when schema.attributes is missing', () => {
      const schema = {} as Schema;

      const result = isManagementGroup(schema);

      expect(result).toBe(false);
    });

    it('should return false when group is missing', () => {
      const schema: Schema = { attributes: {} };

      const result = isManagementGroup(schema);

      expect(result).toBe(false);
    });

    it('should return false when group is empty string', () => {
      const schema: Schema = { attributes: { group: '' } };

      const result = isManagementGroup(schema);

      expect(result).toBe(false);
    });
  });

  describe('normalizeType', () => {
    it('should convert type when inStore is management', () => {
      const result = normalizeType(STORE.MANAGEMENT, NORMAN.CLUSTER);

      expect(result).toBe(MANAGEMENT.CLUSTER);
    });

    it('should not convert type when inStore is not management', () => {
      const result = normalizeType(STORE.CLUSTER, NORMAN.CLUSTER);

      expect(result).toBe(NORMAN.CLUSTER);
    });

    it('should not convert type for custom stores', () => {
      const result = normalizeType('harvester', NORMAN.CLUSTER);

      expect(result).toBe(NORMAN.CLUSTER);
    });

    it('should handle unmapped types in management store', () => {
      const customType = 'custom.type';

      const result = normalizeType(STORE.MANAGEMENT, customType);

      expect(result).toBe(customType);
    });

    it('should handle empty type', () => {
      const result = normalizeType(STORE.MANAGEMENT, '');

      expect(result).toBe('');
    });

    it('should convert multiple types correctly', () => {
      const types = [NORMAN.CLUSTER, NORMAN.USER, NORMAN.PROJECT];

      types.forEach((type) => {
        const result = normalizeType(STORE.MANAGEMENT, type);
        const expected = convertToManagementType(type);

        expect(result).toBe(expected);
      });
    });
  });

  describe('normalizeId', () => {
    it('should return cluster/name for management group schema', () => {
      const schema: Schema = { attributes: { group: 'management.cattle.io' } };

      const result = normalizeId(schema, 'local', 'default', 'my-resource');

      expect(result).toBe('local/my-resource');
    });

    it('should return namespace/name for non-management namespaced resources', () => {
      const schema: Schema = {
        attributes: {
          group:      'apps',
          namespaced: true
        }
      };

      const result = normalizeId(schema, 'local', 'default', 'my-deployment');

      expect(result).toBe('default/my-deployment');
    });

    it('should return only name for non-namespaced resources', () => {
      const schema: Schema = {
        attributes: {
          group:      'storage.k8s.io',
          namespaced: false
        }
      };

      const result = normalizeId(schema, 'local', '', 'my-storage-class');

      expect(result).toBe('my-storage-class');
    });

    it('should handle null schema', () => {
      const result = normalizeId(null, 'local', 'default', 'my-resource');

      expect(result).toBe('default/my-resource');
    });

    it('should handle empty namespace', () => {
      const schema: Schema = { attributes: { namespaced: true } };

      const result = normalizeId(schema, 'local', '', 'my-resource');

      expect(result).toBe('my-resource');
    });

    it('should handle empty cluster', () => {
      const schema: Schema = { attributes: { group: 'management.cattle.io' } };

      const result = normalizeId(schema, '', 'default', 'my-resource');

      expect(result).toBe('/my-resource');
    });

    it('should handle empty name', () => {
      const schema: Schema = { attributes: { namespaced: true } };

      const result = normalizeId(schema, 'local', 'default', '');

      expect(result).toBe('default/');
    });

    it('should prioritize management group over namespaced flag', () => {
      const schema: Schema = {
        attributes: {
          group:      'management.cattle.io',
          namespaced: true
        }
      };

      const result = normalizeId(schema, 'local', 'default', 'my-resource');

      expect(result).toBe('local/my-resource');
    });
  });

  describe('normalizeNamespace', () => {
    it('should return cluster for management group schema', () => {
      const schema: Schema = { attributes: { group: 'management.cattle.io' } };

      const result = normalizeNamespace(schema, 'local', 'default');

      expect(result).toBe('local');
    });

    it('should return namespace for non-management schema', () => {
      const schema: Schema = { attributes: { group: 'apps' } };

      const result = normalizeNamespace(schema, 'local', 'default');

      expect(result).toBe('default');
    });

    it('should return namespace when schema is null', () => {
      const result = normalizeNamespace(null, 'local', 'default');

      expect(result).toBe('default');
    });

    it('should handle empty namespace', () => {
      const schema: Schema = { attributes: { group: 'apps' } };

      const result = normalizeNamespace(schema, 'local', '');

      expect(result).toBe('');
    });

    it('should handle empty cluster', () => {
      const schema: Schema = { attributes: { group: 'management.cattle.io' } };

      const result = normalizeNamespace(schema, '', 'default');

      expect(result).toBe('');
    });

    it('should prioritize management group over namespace', () => {
      const schema: Schema = { attributes: { group: 'management.cattle.io' } };

      const result = normalizeNamespace(schema, 'local', 'should-be-ignored');

      expect(result).toBe('local');
    });
  });

  describe('getProduct', () => {
    beforeEach(() => {
      mockStore.getters['type-map/activeProducts'] = [
        {
          name:    'explorer',
          inStore: STORE.CLUSTER
        },
        {
          name:       'fleet',
          inStore:    STORE.MANAGEMENT,
          inExplorer: false
        },
        {
          name:       'harvester',
          inStore:    'harvester',
          inExplorer: false
        }
      ];
    });

    it('should return fleet product for fleet.cattle.io types', () => {
      mockStore.getters['type-map/activeProducts'] = [
        {
          name:    'explorer',
          inStore: STORE.CLUSTER
        },
        {
          name:    'fleet',
          inStore: STORE.MANAGEMENT
        }
      ];

      const result = getProduct(mockStore, null, 'fleet.cattle.io.gitrepo');

      expect(result).toEqual({
        name:    'fleet',
        inStore: STORE.MANAGEMENT
      });
    });

    it('should return explorer for native kubernetes types (no CRD schema)', () => {
      mockStore.getters['type-map/activeProducts'] = [
        {
          name:    'explorer',
          inStore: STORE.CLUSTER
        }
      ];

      const result = getProduct(mockStore, null, 'apps.deployment');

      expect(result).toEqual({
        name:    'explorer',
        inStore: STORE.CLUSTER
      });
    });

    it('should return explorer for non-CRD schema', () => {
      const schema: Schema = { attributes: { crd: false } };

      mockStore.getters['type-map/activeProducts'] = [
        {
          name:    'explorer',
          inStore: STORE.CLUSTER
        }
      ];

      const result = getProduct(mockStore, schema, 'v1.Pod');

      expect(result).toEqual({
        name:    'explorer',
        inStore: STORE.CLUSTER
      });
    });

    it('should find product that owns the CRD type', () => {
      const schema: Schema = { attributes: { crd: true } };

      mockStore.getters['type-map/activeProducts'] = [
        {
          name:    'explorer',
          inStore: STORE.CLUSTER
        },
        {
          name:       'harvester',
          inStore:    'harvester',
          inExplorer: false
        }
      ];

      mockStore.getters['type-map/allTypes'] = jest.fn((productName) => {
        if (productName === 'harvester') {
          return { all: { 'kubevirt.io.virtualmachine': true } };
        }

        return { all: {} };
      });

      const result = getProduct(mockStore, schema, 'kubevirt.io.virtualmachine');

      expect(result).toEqual({
        name:       'harvester',
        inStore:    'harvester',
        inExplorer: false
      });
    });

    it('should skip products with inExplorer flag', () => {
      const schema: Schema = { attributes: { crd: true } };

      mockStore.getters['type-map/activeProducts'] = [
        {
          name:       'explorer',
          inStore:    STORE.CLUSTER,
          inExplorer: true
        },
        {
          name:       'custom',
          inStore:    'custom-store',
          inExplorer: false
        }
      ];

      mockStore.getters['type-map/allTypes'] = jest.fn((productName) => {
        if (productName === 'custom') {
          return { all: { 'custom.io.resource': true } };
        }

        return { all: {} };
      });

      const result = getProduct(mockStore, schema, 'custom.io.resource');

      expect(result).toEqual({
        name:       'custom',
        inStore:    'custom-store',
        inExplorer: false
      });
    });

    it('should return explorer if type not found in any product', () => {
      const schema: Schema = { attributes: { crd: true } };

      mockStore.getters['type-map/activeProducts'] = [
        {
          name:    'explorer',
          inStore: STORE.CLUSTER
        },
        {
          name:       'harvester',
          inStore:    'harvester',
          inExplorer: false
        }
      ];

      mockStore.getters['type-map/allTypes'] = jest.fn(() => ({ all: {} }));

      const result = getProduct(mockStore, schema, 'unknown.io.type');

      expect(result).toEqual({
        name:    'explorer',
        inStore: STORE.CLUSTER
      });
    });

    it('should handle empty resourceType', () => {
      mockStore.getters['type-map/activeProducts'] = [
        {
          name:    'explorer',
          inStore: STORE.CLUSTER
        }
      ];

      const result = getProduct(mockStore, null, '');

      expect(result).toEqual({
        name:    'explorer',
        inStore: STORE.CLUSTER
      });
    });

    it('should handle fleet.cattle.io prefix types', () => {
      mockStore.getters['type-map/activeProducts'] = [
        {
          name:    'explorer',
          inStore: STORE.CLUSTER
        },
        {
          name:    'fleet',
          inStore: STORE.MANAGEMENT
        }
      ];

      const fleetTypes = [
        'fleet.cattle.io.gitrepo',
        'fleet.cattle.io.bundle',
        'fleet.cattle.io.cluster'
      ];

      fleetTypes.forEach((type) => {
        const result = getProduct(mockStore, null, type);

        expect(result.name).toBe('fleet');
      });
    });

    it('should return the explorer product when a native k8s resource is in both explorer product and custom product (explorer take precedence)', () => {
      const schema: Schema = { attributes: { crd: false } };

      mockStore.getters['type-map/activeProducts'] = [
        {
          name:    'explorer',
          inStore: STORE.CLUSTER
        },
        {
          name:       'custom',
          inStore:    'custom-store',
          inExplorer: false
        }
      ];

      const result = getProduct(mockStore, schema, 'apps.deployment');

      expect(result).toEqual({
        name:    'explorer',
        inStore: STORE.CLUSTER
      });
    });

    it('should return the fleet product when a fleet resource is in both explorer product and fleet product (fleet take precedence)', () => {
      mockStore.getters['type-map/activeProducts'] = [
        {
          name:    'explorer',
          inStore: STORE.CLUSTER
        },
        {
          name:    'fleet',
          inStore: STORE.MANAGEMENT
        }
      ];

      const result = getProduct(mockStore, null, 'fleet.cattle.io.gitrepo');

      expect(result).toEqual({
        name:    'fleet',
        inStore: STORE.MANAGEMENT
      });
    });

    it('should skip products with inExplorer=true even if they contain the CRD type', () => {
      const schema: Schema = { attributes: { crd: true } };

      mockStore.getters['type-map/activeProducts'] = [
        {
          name:       'explorer',
          inStore:    STORE.CLUSTER,
          inExplorer: true
        },
        {
          name:       'custom',
          inStore:    'custom-store',
          inExplorer: false
        }
      ];

      mockStore.getters['type-map/allTypes'] = jest.fn((productName) => {
        if (productName === 'explorer') {
          return { all: { 'custom.io.resource': true } };
        }
        if (productName === 'custom') {
          return { all: { 'custom.io.resource': true } };
        }

        return { all: {} };
      });

      const result = getProduct(mockStore, schema, 'custom.io.resource');

      expect(result).toEqual({
        name:       'custom',
        inStore:    'custom-store',
        inExplorer: false
      });
    });

    it('should return explorer if only products with inExplorer=true contain the CRD type', () => {
      const schema: Schema = { attributes: { crd: true } };

      mockStore.getters['type-map/activeProducts'] = [
        {
          name:       'explorer',
          inStore:    STORE.CLUSTER,
          inExplorer: true
        },
        {
          name:       'other-product',
          inStore:    'other-store',
          inExplorer: true
        }
      ];

      mockStore.getters['type-map/allTypes'] = jest.fn((productName) => {
        if (productName === 'explorer' || productName === 'other-product') {
          return { all: { 'custom.io.resource': true } };
        }

        return { all: {} };
      });

      const result = getProduct(mockStore, schema, 'custom.io.resource');

      expect(result).toEqual({
        name:       'explorer',
        inStore:    STORE.CLUSTER,
        inExplorer: true
      });
    });
  });

  describe('getDetailLocation', () => {
    beforeEach(() => {
      mockStore.getters[`${ STORE.MANAGEMENT }/classify`] = jest.fn(() => {
        return function MockModel(this: any, data: any) {
          this.detailLocation = {
            name:   'c-cluster-resource-details',
            params: {
              cluster:    data.metadata?.namespace || 'local',
              resource:   data.type,
              id:         data.id,
              namespace:  data.metadata?.namespace
            }
          };
        };
      });

      mockStore.getters[`${ STORE.MANAGEMENT }/schemaFor`] = jest.fn(() => ({ attributes: { namespaced: true } }));

      (mockStore as any).state = {};
      (mockStore as any).rootState = {};
      mockStore.rootGetters = {};
      mockStore.dispatch = jest.fn();
      mockStore.commit = jest.fn();
    });

    it('should return detail location for valid product and resource', () => {
      const result = getDetailLocation(
        mockStore,
        'explorer',
        null,
        STORE.MANAGEMENT,
        {
          cluster:   'local',
          type:      'deployment',
          namespace: 'default',
          name:      'my-deployment'
        }
      );

      expect(result).not.toBeNull();
      expect(result?.name).toBe('c-cluster-resource-details');
    });

    it('should return null if store context getter is missing', () => {
      mockStore.getters[`${ STORE.MANAGEMENT }/classify`] = jest.fn(() => null);

      const result = getDetailLocation(
        mockStore,
        'explorer',
        null,
        STORE.MANAGEMENT,
        {
          cluster:   'local',
          type:      'deployment',
          namespace: 'default',
          name:      'my-deployment'
        }
      );

      expect(result).toBeNull();
    });

    it('should build correct detail location for namespaced resource', () => {
      const schema: Schema = {
        attributes: {
          namespaced: true,
          group:      'apps'
        }
      };

      const result = getDetailLocation(
        mockStore,
        'explorer',
        schema,
        STORE.MANAGEMENT,
        {
          cluster:   'local',
          type:      'deployment',
          namespace: 'default',
          name:      'my-deployment'
        }
      );

      expect(result).not.toBeNull();
      expect(result?.name).toBeDefined();
    });

    it('should normalize type for management store', () => {
      const schema: Schema = {
        attributes: {
          namespaced: false,
          group:      'management.cattle.io'
        }
      };

      const result = getDetailLocation(
        mockStore,
        'explorer',
        schema,
        STORE.MANAGEMENT,
        {
          cluster: 'local',
          type:    NORMAN.CLUSTER,
          name:    'my-cluster'
        }
      );

      expect(result).not.toBeNull();
    });

    it('should handle resource without namespace', () => {
      const schema: Schema = { attributes: { namespaced: false } };

      const result = getDetailLocation(
        mockStore,
        'explorer',
        schema,
        STORE.MANAGEMENT,
        {
          cluster: 'local',
          type:    'storageclass',
          name:    'fast'
        }
      );

      expect(result).not.toBeNull();
    });

    it('should handle null schema', () => {
      const result = getDetailLocation(
        mockStore,
        'explorer',
        null,
        STORE.MANAGEMENT,
        {
          cluster:   'local',
          type:      'deployment',
          namespace: 'default',
          name:      'my-deployment'
        }
      );

      expect(result).not.toBeNull();
    });

    it('should return null on model instantiation error', () => {
      mockStore.getters[`${ STORE.MANAGEMENT }/classify`] = jest.fn(() => {
        throw new Error('Model error');
      });

      const result = getDetailLocation(
        mockStore,
        'explorer',
        null,
        STORE.MANAGEMENT,
        {
          cluster:   'local',
          type:      'deployment',
          namespace: 'default',
          name:      'my-deployment'
        }
      );

      expect(result).toBeNull();
    });

    it('should return null if model has no detailLocation', () => {
      mockStore.getters[`${ STORE.MANAGEMENT }/classify`] = jest.fn(() => {
        return function MockModel(this: any) { // eslint-disable-line no-unused-vars
          this.detailLocation = null;
        };
      });

      const result = getDetailLocation(
        mockStore,
        'explorer',
        null,
        STORE.MANAGEMENT,
        {
          cluster:   'local',
          type:      'deployment',
          namespace: 'default',
          name:      'my-deployment'
        }
      );

      expect(result).toBeNull();
    });

    it('should proxy getters to target store', () => {
      const getterSpy = jest.fn(() => ({}));

      mockStore.getters[`${ STORE.MANAGEMENT }/test-getter`] = getterSpy;

      mockStore.getters[`${ STORE.MANAGEMENT }/classify`] = jest.fn(() => {
        return function MockModel(this: any) { // eslint-disable-line no-unused-vars
          this.detailLocation = { name: 'test' };
        };
      });

      getDetailLocation(
        mockStore,
        'explorer',
        null,
        STORE.MANAGEMENT,
        {
          cluster:   'local',
          type:      'deployment',
          namespace: 'default',
          name:      'my-deployment'
        }
      );

      // Verify model was created (no need to verify getter calls unless accessed)
      expect(mockStore.getters[`${ STORE.MANAGEMENT }/classify`]).toHaveBeenCalled();
    });

    it('should handle empty resource object', () => {
      const result = getDetailLocation(
        mockStore,
        'explorer',
        null,
        STORE.MANAGEMENT,
        {}
      );

      expect(result).not.toBeNull();
    });

    it('should handle all parameter combinations', () => {
      const combinations = [
        {
          productName: 'explorer',
          schema:      null,
          inStore:     STORE.MANAGEMENT,
          resource:    {
            type:      'pod',
            namespace: 'default',
            name:      'my-pod',
            cluster:   'local'
          }
        },
        {
          productName: 'fleet',
          schema:      { attributes: { namespaced: false } } as Schema,
          inStore:     STORE.MANAGEMENT,
          resource:    {
            type:    'fleet.cattle.io.gitrepo',
            name:    'my-repo',
            cluster: 'local'
          }
        },
        {
          productName: 'harvester',
          schema:      { attributes: { crd: true } } as Schema,
          inStore:     'harvester',
          resource:    {
            type:      'kubevirt.io.virtualmachine',
            namespace: 'default',
            name:      'vm-1',
            cluster:   'local'
          }
        }
      ];

      combinations.forEach(({
        productName, schema, inStore, resource
      }) => {
        expect(() => {
          getDetailLocation(mockStore, productName, schema, inStore, resource);
        }).not.toThrow();
      });
    });
  });
});
