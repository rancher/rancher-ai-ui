export const EXTENSION_NAMESPACE = 'cattle-ui-plugin-system';

export const elementalRepo = {
  apiVersion: 'catalog.cattle.io/v1',
  kind:       'ClusterRepo',
  metadata:   { name: 'elemental-repo' },
  spec:       {
    gitBranch: 'gh-pages',
    gitRepo:   'https://github.com/rancher/elemental-ui',
  }
};

export const elementalExtension = {
  charts: [
    {
      chartName:   'elemental',
      version:     '3.0.2-rc.996',
      releaseName: 'elemental',
      annotations: {},
      values:      {}
    }
  ],
  namespace: EXTENSION_NAMESPACE
};