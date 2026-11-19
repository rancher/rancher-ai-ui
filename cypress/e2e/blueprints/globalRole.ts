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

export const globalRoleBinding = (userName: string) => ({
  apiVersion:     'management.cattle.io/v3',
  kind:           'GlobalRoleBinding',
  metadata:       { name: 'my-role-binding' },
  globalRoleName: globalRole.metadata.name,
  userName,
});