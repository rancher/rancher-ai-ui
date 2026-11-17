export const AGENT_NAME = 'rancher-ai-agent';
export const AGENT_NAMESPACE = 'cattle-ai-agent-system';
export const AGENT_CHART_NAME = 'rancher-ai-agent';
export const AGENT_REPO_NAME = 'rancher-ai';
export const AGENT_REPO_URL = 'oci://registry.suse.com/rancher/charts/rancher-ai-agent';

export const CLUSTER_REPOS_URL = /\/v1\/catalog\.cattle\.io\.clusterrepos(\?.*)?$/;

export const CHART_VALUES = { replicaCount: 1 };

export const fakeRepository = {
  id:       AGENT_REPO_NAME,
  type:     'catalog.cattle.io.clusterrepo',
  metadata: { name: AGENT_REPO_NAME },
  spec:     { url: AGENT_REPO_URL },
  status:   {
    conditions: [{
      type:   'OCIDownloaded',
      status: 'True'
    }]
  },
  links: {
    self: `/v1/catalog.cattle.io.clusterrepos/${ AGENT_REPO_NAME }`,
    info: `/v1/catalog.cattle.io.clusterrepos/${ AGENT_REPO_NAME }?link=info`,
  },
  actions: { install: `/v1/catalog.cattle.io.clusterrepos/${ AGENT_REPO_NAME }?action=install` },
};