export const gitRepo = {
  apiVersion: 'fleet.cattle.io/v1alpha1',
  kind:       'GitRepo',
  metadata:   {
    finalizers: [
      'fleet.cattle.io/gitrepo-finalizer',
    ],
    name:      'e2e-git-repo',
    namespace: 'fleet-default',
  },
  spec:      {
    branch:          'master',
    correctDrift:    {},
    pollingInterval: '1m0s',
    repo:            'https://localhost:8005/',
    targets:         [
      {
        clusterSelector: {
          matchExpressions: [
            {
              key:      'provider.cattle.io',
              operator: 'NotIn',
              values:   ['harvester'],
            },
          ],
        },
      },
    ],
  },
};
