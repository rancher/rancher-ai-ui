export const provisioningCluster = {
  type:     'provisioning.cattle.io.cluster',
  metadata: {
    name:      'e2e-provisioning-cluster',
    namespace: 'fleet-default',
    labels:    { 'e2e-test': 'true' }
  },
  spec: {
    kubernetesVersion: 'v1.28.0',
    rkeConfig:         {}
  }
};