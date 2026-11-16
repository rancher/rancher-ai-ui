import { reactive } from 'vue';
import { flushPromises } from '@vue/test-utils';
import {
  CATALOG, CONFIG_MAP, POD, SECRET, WORKLOAD_TYPES
} from '@shell/config/types';
import { isAdminUser } from '@shell/store/type-map';
import { getHelmChart, getHelmRepositoryExact } from '@shell/utils/uiplugins';
import Chat from '../../handlers/chat';
import {
  AGENT_CHART_NAME,
  AGENT_CONFIG_CONFIG_MAP_NAME,
  AGENT_CONFIG_SECRET_NAME,
  AGENT_NAME,
  AGENT_NAMESPACE,
  AGENT_REPO_NAME,
  RANCHER_AI_SCHEMA,
} from '../../product';
import { InstallStep, InstallStepStatus } from '../../types';
import { useAiAgentInstallerComposable } from '../useAiAgentInstallerComposable';

jest.mock('../../utils/log', () => ({ warn: jest.fn() }));
jest.mock('@shell/store/type-map', () => ({ isAdminUser: jest.fn(() => true) }));
jest.mock('@shell/utils/uiplugins', () => ({
  getHelmChart:           jest.fn(),
  getHelmRepositoryExact: jest.fn(),
}));
jest.mock('../../handlers/chat', () => ({
  __esModule: true,
  default:    {
    isOpen: jest.fn(() => false),
    open:   jest.fn(),
  },
}));

// The store resources, kept reactive like the ones updated by the websocket
const mockResources: Record<string, Record<string, any>> = reactive({});
const mockSchemas: Record<string, any> = reactive({});
const mockRequest = jest.fn();

const mockStore = {
  state:   {},
  getters: {
    'management/schemaFor': (type: string) => mockSchemas[type],
    'management/byId':      (type: string, id: string) => mockResources[type]?.[id],
    'management/all':       (type: string) => Object.values(mockResources[type] || {}),
    'management/matching':  (type: string, selector: string, namespace: string) => Object.values(mockResources[type] || {})
      .filter((resource: any) => resource.metadata?.namespace === namespace),
  },
  dispatch: jest.fn(async(action: string, params: any) => {
    switch (action) {
    case 'management/find': {
      const resource = mockResources[params.type]?.[params.id];

      if (!resource) {
        throw new Error('Not found');
      }

      return resource;
    }
    case 'management/findAll':
    case 'management/findMatching':
      return Object.values(mockResources[params.type] || {});
    case 'management/request':
      return mockRequest(params);
    default:
      return null;
    }
  }),
};

jest.mock('vuex', () => ({ useStore: () => mockStore }));

const DEPLOYMENT_ID = `${ AGENT_NAMESPACE }/${ AGENT_NAME }`;
const APP_ID = `${ AGENT_NAMESPACE }/${ AGENT_NAME }`;

function addResource(type: string, id: string, resource: Record<string, any>) {
  if (!mockResources[type]) {
    mockResources[type] = {};
  }

  const [namespace, name] = id.includes('/') ? id.split('/') : [undefined, id];

  mockResources[type][id] = {
    id,
    ...resource,
    metadata: {
      name,
      namespace,
      ...resource.metadata,
    },
  };
}

function removeResource(type: string, id: string) {
  delete mockResources[type][id];
}

function addRepository(downloaded: string | null = 'True', message?: string) {
  addResource(CATALOG.CLUSTER_REPO, AGENT_REPO_NAME, {
    status:   {
      conditions: downloaded ? [{
        type:   'OCIDownloaded',
        status: downloaded,
        message
      }] : []
    },
    links:    { info: '/v1/catalog.cattle.io.clusterrepos/rancher-ai?link=info' },
    doAction: jest.fn(),
  });
}

function addAgentApp(status = 'deployed', name = AGENT_NAME) {
  addResource(CATALOG.APP, `${ AGENT_NAMESPACE }/${ name }`, {
    spec: {
      chart: { metadata: { name: AGENT_CHART_NAME } },
      info:  { status },
    },
    doAction: jest.fn(),
  });
}

function addAgentPod(name: string, overrides: Record<string, any> = {}) {
  addResource(POD, `${ AGENT_NAMESPACE }/${ name }`, {
    metadata: { creationTimestamp: '2026-01-01T00:01:00Z' },
    status:   {
      phase:             'Running',
      containerStatuses: [{ ready: true }],
    },
    ...overrides,
  });
}

/**
 * The resources deployed by the chart, with the agent up and running.
 */
function deployAgent({ withPod = true } = {}) {
  addResource(WORKLOAD_TYPES.DEPLOYMENT, DEPLOYMENT_ID, {
    metadata: {
      generation:        1,
      creationTimestamp: '2026-01-01T00:00:00Z',
    },
    spec: {
      replicas: 1,
      selector: { matchLabels: { app: AGENT_NAME } },
    },
    status: {
      observedGeneration: 1,
      replicas:           1,
      updatedReplicas:    1,
      availableReplicas:  1,
    },
  });
  addResource(SECRET, `${ AGENT_NAMESPACE }/${ AGENT_CONFIG_SECRET_NAME }`, {});
  addResource(CONFIG_MAP, `${ AGENT_NAMESPACE }/${ AGENT_CONFIG_CONFIG_MAP_NAME }`, {
    data: {
      ACTIVE_LLM:   'openai',
      OPENAI_MODEL: 'gpt-4o',
    },
  });
  mockSchemas[RANCHER_AI_SCHEMA.AI_AGENT_CONFIG] = { id: RANCHER_AI_SCHEMA.AI_AGENT_CONFIG };

  if (withPod) {
    addAgentPod('rancher-ai-agent-abc');
  }
}

/**
 * Simulates the Helm operation run by the install action, deploying the chart resources.
 */
function mockHelmInstall(exitCode = 0) {
  mockResources[CATALOG.CLUSTER_REPO][AGENT_REPO_NAME].doAction.mockImplementation(async() => {
    addResource(CATALOG.OPERATION, 'cattle-system/helm-op', {
      status: {
        podName:      'helm-op-pod',
        podNamespace: 'cattle-system',
      },
    });
    addResource(POD, 'cattle-system/helm-op-pod', {
      status: {
        containerStatuses: [{
          name:  'helm',
          state: { terminated: { exitCode } }
        }]
      }
    });

    if (!exitCode) {
      deployAgent();
      addAgentApp();
    }

    return {
      operationName:      'helm-op',
      operationNamespace: 'cattle-system',
    };
  });
}

function stepStatus(installer: ReturnType<typeof useAiAgentInstallerComposable>, step: InstallStep) {
  return installer.state.steps[step];
}

describe('useAiAgentInstallerComposable', () => {
  let installer: ReturnType<typeof useAiAgentInstallerComposable>;

  beforeEach(async() => {
    jest.clearAllMocks();

    Object.keys(mockResources).forEach((type) => delete mockResources[type]);
    Object.keys(mockSchemas).forEach((type) => delete mockSchemas[type]);
    mockSchemas[CATALOG.CLUSTER_REPO] = { collectionMethods: ['GET', 'POST'] };
    mockSchemas[CATALOG.APP] = { collectionMethods: ['GET', 'POST'] };

    (isAdminUser as jest.Mock).mockReturnValue(true);
    (Chat.isOpen as jest.Mock).mockReturnValue(false);
    (getHelmChart as jest.Mock).mockResolvedValue({ version: '1.0.0' });
    (getHelmRepositoryExact as jest.Mock).mockImplementation(async() => mockResources[CATALOG.CLUSTER_REPO]?.[AGENT_REPO_NAME]);

    installer = useAiAgentInstallerComposable();
    installer.reset();
    // The state is shared between the composable instances
    installer.state.appsLoaded = false;
    installer.state.appsChecked = false;
    installer.state.repositoryName = AGENT_REPO_NAME;
    await installer.loadAiAgentApp();
  });

  afterEach(() => {
    installer.reset();
  });

  describe('Install state', () => {
    it('should not offer the installation to users who are not admins', async() => {
      (isAdminUser as jest.Mock).mockReturnValue(false);

      const notAdmin = useAiAgentInstallerComposable();

      expect(notAdmin.canInstall.value).toBe(false);
      expect(notAdmin.isAgentNotInstalled.value).toBe(false);
      expect(notAdmin.isInstallStateKnown.value).toBe(true);
    });

    it('should detect the agent Helm release by its chart, whatever the release name', async() => {
      expect(installer.isAgentAppMissing.value).toBe(true);
      expect(installer.isAgentNotInstalled.value).toBe(true);

      addAgentApp('deployed', 'custom-release-name');

      expect(installer.isAgentAppMissing.value).toBe(false);
      expect(installer.isAgentNotInstalled.value).toBe(false);
      expect(installer.agentApp.value?.metadata.name).toBe('custom-release-name');
    });
  });

  describe('Repository step', () => {
    it('should wait for the user to review the Helm values when the agent is not deployed', async() => {
      addRepository();

      await installer.install();

      expect(installer.state.started).toBe(true);
      expect(stepStatus(installer, InstallStep.Repository).status).toBe(InstallStepStatus.Done);
      expect(stepStatus(installer, InstallStep.Agent).status).toBe(InstallStepStatus.Pending);
      expect(installer.isAgentNotInstalled.value).toBe(true);
    });

    it('should complete once the repository index is downloaded', async() => {
      addRepository(null);

      const installing = installer.install();

      await flushPromises();
      expect(stepStatus(installer, InstallStep.Repository).status).toBe(InstallStepStatus.InProgress);

      mockResources[CATALOG.CLUSTER_REPO][AGENT_REPO_NAME].status.conditions = [{
        type:   'OCIDownloaded',
        status: 'True'
      }];
      await installing;

      expect(stepStatus(installer, InstallStep.Repository).status).toBe(InstallStepStatus.Done);
    });

    it('should fail when the repository index cannot be downloaded', async() => {
      addRepository('False', 'unauthorized');

      await installer.install();

      expect(stepStatus(installer, InstallStep.Repository).status).toBe(InstallStepStatus.Error);
      expect(stepStatus(installer, InstallStep.Repository).error).toContain('unauthorized');
      expect(installer.canStartInstall.value).toBe(true);
    });

    it('should cancel the running steps on reset', async() => {
      addRepository(null);

      const installing = installer.install();

      await flushPromises();
      installer.reset();
      await installing;

      expect(installer.state.started).toBe(false);
      expect(stepStatus(installer, InstallStep.Repository).status).toBe(InstallStepStatus.Pending);
      expect(stepStatus(installer, InstallStep.Repository).error).toBeUndefined();
    });
  });

  describe('Agent step', () => {
    it('should skip the chart installation when the agent is already running', async() => {
      addRepository();
      deployAgent();

      await installer.install();

      expect(mockResources[CATALOG.CLUSTER_REPO][AGENT_REPO_NAME].doAction).not.toHaveBeenCalled();
      expect(stepStatus(installer, InstallStep.Agent).status).toBe(InstallStepStatus.Done);
      expect(stepStatus(installer, InstallStep.Configure).status).toBe(InstallStepStatus.InProgress);
    });

    it('should complete only once the agent pods are ready', async() => {
      addRepository();
      deployAgent({ withPod: false });
      addAgentPod('rancher-ai-agent-abc', {
        status: {
          phase:             'Running',
          containerStatuses: [{ ready: false }]
        }
      });

      const installing = installer.install();

      await flushPromises();
      expect(stepStatus(installer, InstallStep.Agent).status).toBe(InstallStepStatus.InProgress);

      mockResources[POD][`${ AGENT_NAMESPACE }/rancher-ai-agent-abc`].status.containerStatuses[0].ready = true;
      await installing;

      expect(stepStatus(installer, InstallStep.Agent).status).toBe(InstallStepStatus.Done);
    });

    it('should fail when an agent pod cannot start', async() => {
      addRepository();
      deployAgent({ withPod: false });
      addAgentPod('rancher-ai-agent-abc', {
        status: {
          phase:             'Pending',
          containerStatuses: [{
            ready: false,
            state: {
              waiting: {
                reason:  'ImagePullBackOff',
                message: 'image not found'
              }
            }
          }],
        },
      });

      await installer.install();

      expect(stepStatus(installer, InstallStep.Agent).status).toBe(InstallStepStatus.Error);
      expect(stepStatus(installer, InstallStep.Agent).error).toContain('ImagePullBackOff: image not found');
    });

    it('should ignore the failed pods of a previous installation', async() => {
      addRepository();
      deployAgent();
      addAgentPod('rancher-ai-agent-old', {
        metadata: { creationTimestamp: '2025-12-31T00:00:00Z' },
        status:   { phase: 'Failed' },
      });

      await installer.install();

      expect(stepStatus(installer, InstallStep.Agent).status).toBe(InstallStepStatus.Done);
    });

    it('should install the chart with the values overrides', async() => {
      addRepository();
      await installer.install();
      mockHelmInstall();

      await installer.installChart();

      const repository = mockResources[CATALOG.CLUSTER_REPO][AGENT_REPO_NAME];

      expect(repository.doAction).toHaveBeenCalledWith('install', expect.objectContaining({
        namespace: AGENT_NAMESPACE,
        wait:      false,
        charts:    [expect.objectContaining({
          chartName: AGENT_CHART_NAME,
          version:   '1.0.0',
          values:    {
            plan:         { enabled: true },
            planApproval: { enabled: true }
          },
        })],
      }));
      expect(stepStatus(installer, InstallStep.Agent).status).toBe(InstallStepStatus.Done);
      expect(installer.isAgentNotInstalled.value).toBe(false);
    });

    it('should show the Helm error when the chart installation fails', async() => {
      addRepository();
      await installer.install();
      mockHelmInstall(1);
      mockRequest.mockResolvedValue('installing chart\nError: INSTALLATION FAILED: invalid values\n');

      await installer.installChart();

      expect(stepStatus(installer, InstallStep.Agent).status).toBe(InstallStepStatus.Error);
      expect(stepStatus(installer, InstallStep.Agent).error).toBe('Helm installation failed: INSTALLATION FAILED: invalid values');
    });

    it('should uninstall the current release before installing the chart again', async() => {
      addRepository();
      addAgentApp();
      await installer.install();
      mockHelmInstall();

      const app = mockResources[CATALOG.APP][APP_ID];

      app.doAction.mockImplementation(async() => removeResource(CATALOG.APP, APP_ID));

      await installer.installChart();

      expect(app.doAction).toHaveBeenCalledWith('uninstall', {});
      expect(app.doAction.mock.invocationCallOrder[0]).toBeLessThan(mockResources[CATALOG.CLUSTER_REPO][AGENT_REPO_NAME].doAction.mock.invocationCallOrder[0]);
      expect(stepStatus(installer, InstallStep.Agent).status).toBe(InstallStepStatus.Done);
    });

    it('should wait for an ongoing uninstallation instead of starting a new one', async() => {
      addRepository();
      addAgentApp('uninstalling');
      await installer.install();
      mockHelmInstall();

      const app = mockResources[CATALOG.APP][APP_ID];
      const installing = installer.installChart();

      await flushPromises();
      expect(mockResources[CATALOG.CLUSTER_REPO][AGENT_REPO_NAME].doAction).not.toHaveBeenCalled();

      removeResource(CATALOG.APP, APP_ID);
      await installing;

      expect(app.doAction).not.toHaveBeenCalled();
      expect(stepStatus(installer, InstallStep.Agent).status).toBe(InstallStepStatus.Done);
    });
  });

  describe('Helm values', () => {
    beforeEach(async() => {
      addRepository();
      await installer.install();
      mockRequest.mockResolvedValue({
        values: {
          image: { tag: 'v1' },
          plan:  { enabled: false }
        }
      });
    });

    it('should load the chart defaults merged with the overrides', async() => {
      const values = await installer.loadValues();

      expect(values).toStrictEqual({
        image:        { tag: 'v1' },
        plan:         { enabled: true },
        planApproval: { enabled: true },
      });
    });

    it('should only keep the values that differ from the defaults', async() => {
      const values = await installer.loadValues();

      installer.setValues(values);
      expect(installer.state.values).toBeNull();

      installer.setValues({
        ...values,
        image: { tag: 'v2' }
      });
      expect(installer.state.values).toStrictEqual(expect.objectContaining({ image: { tag: 'v2' } }));
      expect(await installer.loadValues()).toStrictEqual(installer.state.values);
    });
  });

  describe('Validation of the completed steps', () => {
    it('should fail the repository step when the repository is removed', async() => {
      addRepository();
      await installer.install();

      removeResource(CATALOG.CLUSTER_REPO, AGENT_REPO_NAME);
      await flushPromises();

      expect(stepStatus(installer, InstallStep.Repository).status).toBe(InstallStepStatus.Error);
      expect(stepStatus(installer, InstallStep.Repository).error).toContain('has been removed');
    });

    it('should fail the agent step when a resource deployed by the chart is removed', async() => {
      addRepository();
      deployAgent();
      await installer.install();

      removeResource(SECRET, `${ AGENT_NAMESPACE }/${ AGENT_CONFIG_SECRET_NAME }`);
      await flushPromises();

      expect(stepStatus(installer, InstallStep.Agent).status).toBe(InstallStepStatus.Error);
      expect(stepStatus(installer, InstallStep.Agent).error).toBe(`The ${ AGENT_NAMESPACE }/${ AGENT_CONFIG_SECRET_NAME } secret has been removed`);
      expect(stepStatus(installer, InstallStep.Configure).status).toBe(InstallStepStatus.Pending);
    });

    it('should fail the agent step when the AI agent CRD is removed', async() => {
      addRepository();
      deployAgent();
      await installer.install();

      delete mockSchemas[RANCHER_AI_SCHEMA.AI_AGENT_CONFIG];
      await flushPromises();

      expect(stepStatus(installer, InstallStep.Agent).status).toBe(InstallStepStatus.Error);
      expect(stepStatus(installer, InstallStep.Agent).error).toContain('CRD has been removed');
    });
  });

  describe('Configure step', () => {
    beforeEach(async() => {
      addRepository();
      deployAgent();
      await installer.install();
    });

    it('should complete once the configuration is valid and the agent is running', async() => {
      installer.markConfigApplied();
      await flushPromises();

      expect(stepStatus(installer, InstallStep.Configure).status).toBe(InstallStepStatus.Done);
      expect(installer.state.configApplied).toBe(true);
      expect(installer.state.verifyingConfig).toBe(false);
      expect(Chat.open).toHaveBeenCalledTimes(1);
    });

    it('should fail when the LLM provider is not configured', async() => {
      mockResources[CONFIG_MAP][`${ AGENT_NAMESPACE }/${ AGENT_CONFIG_CONFIG_MAP_NAME }`].data = {};

      installer.markConfigApplied();
      await flushPromises();

      expect(stepStatus(installer, InstallStep.Configure).status).toBe(InstallStepStatus.Error);
      expect(stepStatus(installer, InstallStep.Configure).error).toBe('The LLM provider is not configured');
      expect(installer.state.configApplied).toBe(false);
    });

    it('should ignore the saved configuration when the installation is not waiting for it', async() => {
      installer.reset();

      installer.markConfigApplied();
      await flushPromises();

      expect(stepStatus(installer, InstallStep.Configure).status).toBe(InstallStepStatus.Pending);
      expect(Chat.open).not.toHaveBeenCalled();
    });
  });

  describe('openChatAndInstall', () => {
    it('should open the chat and start the installation only once', async() => {
      addRepository();

      installer.openChatAndInstall();
      await flushPromises();

      expect(Chat.open).toHaveBeenCalledTimes(1);
      expect(installer.state.started).toBe(true);

      (Chat.isOpen as jest.Mock).mockReturnValue(true);
      installer.openChatAndInstall();
      await flushPromises();

      expect(Chat.open).toHaveBeenCalledTimes(1);
      expect(getHelmRepositoryExact).toHaveBeenCalledTimes(1);
    });
  });
});
