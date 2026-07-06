export const machineInventorySchema = {
  'id':    'elemental.cattle.io.machineinventory',
  'type':  'schema',
  'links': {
    'collection': 'https://localhost:8005/v1/elemental.cattle.io.machineinventories',
    'self':       'https://localhost:8005/v1/schemas/elemental.cattle.io.machineinventory'
  },
  'pluralName':      'elemental.cattle.io.machineinventories',
  'resourceMethods': [
    'GET',
    'DELETE',
    'PUT',
    'PATCH'
  ],
  '_resourceFields':        null,
  'requiresResourceFields': true,
  'collectionMethods':      [
    'GET',
    'POST'
  ],
  'attributes': {
    'columns': [
      {
        'name':        'Name',
        'type':        'string',
        'format':      'name',
        'description': 'Name must be unique within a namespace. Is required when creating resources, although some resources may allow a client to request the generation of an appropriate name automatically. Name is primarily intended for creation idempotence and configuration definition. Cannot be updated. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names#names',
        'priority':    0,
        'field':       '$.metadata.fields[0]'
      },
      {
        'name':        'Age',
        'type':        'date',
        'format':      '',
        'description': 'CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.\n\nPopulated by the system. Read-only. Null for lists. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata',
        'priority':    0,
        'field':       '$.metadata.fields[1]'
      }
    ],
    'crd':                true,
    'crdJSONPathParsers': {
      'Age':  '{.metadata.creationTimestamp}',
      'Name': '{.metadata.name}'
    },
    'group':      'elemental.cattle.io',
    'kind':       'MachineInventory',
    'namespaced': true,
    'resource':   'machineinventories',
    'verbs':      [
      'delete',
      'deletecollection',
      'get',
      'list',
      'patch',
      'create',
      'update',
      'watch'
    ],
    'version': 'v1beta1'
  },
  '_id':    'elemental.cattle.io.machineinventory',
  '_group': 'elemental.cattle.io'
};