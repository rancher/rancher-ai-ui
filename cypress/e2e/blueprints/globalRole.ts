export const globalRole = {
  apiVersion:  'management.cattle.io/v3',
  kind:        'GlobalRole',
  displayName: 'my-role',
  metadata:    { name: 'my-role' },
  rules:       [{
    apiGroups: [''],
    resources: ['configmaps'],
    verbs:     ['get', 'list', 'watch']
  }]
};