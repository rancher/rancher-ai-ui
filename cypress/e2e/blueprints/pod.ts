export const testPodDefault = {
  apiVersion: 'v1',
  kind:       'Pod',
  metadata:   {
    name:      'test-pod',
    namespace: 'default',
    labels:    {}
  },
  spec: {
    containers: [
      {
        name:  'container-0',
        image: 'nginx'
      }
    ]
  }
};

export const testPod = {
  apiVersion: 'v1',
  kind:       'Pod',
  metadata:   {
    name:      'test-pod',
    namespace: 'cattle-ai-agent-system',
    labels:    {}
  },
  spec: {
    containers: [
      {
        name:  'container-0',
        image: 'nginx'
      }
    ]
  }
};

export const errorPod = {
  apiVersion: 'v1',
  kind:       'Pod',
  metadata:   {
    name:      'error-pod',
    namespace: 'default',
    labels:    {}
  },
  spec: {
    containers: [
      {
        name:  'container-0',
        image: 'aaa'
      }
    ]
  }
};