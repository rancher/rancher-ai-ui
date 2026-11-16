import {
  computed, reactive, ref, watch, WatchStopHandle
} from 'vue';
import { useStore } from 'vuex';
import { cloneDeep, isEqual, merge } from 'lodash';
import {
  CATALOG, CONFIG_MAP, POD, SECRET, WORKLOAD_TYPES
} from '@shell/config/types';
import { SECRET_TYPES } from '@shell/config/secret';
import { base64Encode } from '@shell/utils/crypto';
import { isAdminUser } from '@shell/store/type-map';
import { CATALOG as CATALOG_ANNOTATIONS } from '@shell/config/labels-annotations';
import { getHelmChart, getHelmRepositoryExact } from '@shell/utils/uiplugins';
import {
  AGENT_CHART_NAME,
  AGENT_CONFIG_CONFIG_MAP_NAME,
  AGENT_CONFIG_SECRET_NAME,
  AGENT_NAME,
  AGENT_NAMESPACE,
  AGENT_RELEASE_NAME,
  AGENT_REPO_AUTH_ENABLED,
  AGENT_REPO_AUTH_SECRET_GENERATE_NAME,
  AGENT_REPO_AUTH_SECRET_NAMESPACE,
  AGENT_REPO_NAME,
  AGENT_REPO_URL,
  RANCHER_AI_SCHEMA,
} from '../product';
import { InstallStep, InstallStepStatus } from '../types';
import { warn } from '../utils/log';
import { decodeModelKey } from '../utils/settings';
import Chat from '../handlers/chat';

interface RepositoryCredentials {
  username: string;
  password: string;
}

interface InstallStepState {
  status: InstallStepStatus;
  error?: string;
}

interface AgentResource {
  kind: string;
  type: string;
  id: string;
}

const AGENT_DEPLOYMENT_ID = `${ AGENT_NAMESPACE }/${ AGENT_NAME }`;

// Deployed by the chart: removing any of them breaks the agent
const AGENT_RESOURCES: AgentResource[] = [
  {
    kind: 'deployment',
    type: WORKLOAD_TYPES.DEPLOYMENT,
    id:   AGENT_DEPLOYMENT_ID
  },
  {
    kind: 'secret',
    type: SECRET,
    id:   `${ AGENT_NAMESPACE }/${ AGENT_CONFIG_SECRET_NAME }`
  },
  {
    kind: 'config map',
    type: CONFIG_MAP,
    id:   `${ AGENT_NAMESPACE }/${ AGENT_CONFIG_CONFIG_MAP_NAME }`
  },
];

// Container states that won't recover without a change to the release
const POD_FAILURE_REASONS = [
  'CrashLoopBackOff',
  'ImagePullBackOff',
  'ErrImagePull',
  'InvalidImageName',
  'CreateContainerConfigError',
  'CreateContainerError'
];

// Shared between the chat panel and the settings page
const state = reactive({
  started:          false,
  // The Apps are in the store and kept up to date
  appsLoaded:       false,
  // The Apps request completed, successfully or not
  appsChecked:      false,
  verifyingConfig:  false,
  configApplied:    false,
  repositoryName:   AGENT_REPO_NAME,
  repositoryExists: false,
  appExists:        false,
  // The chart resources found once the agent step completed, validated until the installation ends
  agentResources:   [] as AgentResource[],
  agentCrdExists:   false,
  // Helm values edited by the user; the defaults are used when null
  values:           null as Record<string, any> | null,
  steps:            {
    [InstallStep.Repository]: { status: InstallStepStatus.Pending },
    [InstallStep.Agent]:      { status: InstallStepStatus.Pending },
    [InstallStep.Configure]:  { status: InstallStepStatus.Pending },
  } as Record<InstallStep, InstallStepState>,
});

class CancelledError extends Error {}

// Incremented to cancel the steps currently running
const currentRun = ref(0);
let stopValidation: WatchStopHandle | null = null;
// The chart defaults merged with our overrides, to tell whether the user customized them
let defaultValues: Record<string, any> | null = null;

/**
 * Resolves with the first truthy value of `source`, which reads the resources kept up to date in the store.
 * Rejects if the run is cancelled meanwhile.
 */
function until<T>(source: () => T, run: number): Promise<NonNullable<T>> {
  return new Promise((resolve, reject) => {
    const isSettled = (value: T) => {
      if (run !== currentRun.value) {
        reject(new CancelledError());
      } else if (value) {
        resolve(value as NonNullable<T>);
      }

      return run !== currentRun.value || !!value;
    };

    if (isSettled(source())) {
      return;
    }

    const stop = watch([source, currentRun], ([value]) => {
      if (isSettled(value as T)) {
        stop();
      }
    });
  });
}

function errorMessage(err: any): string {
  return err?.message || err?.data?.message || err?._statusText || `${ err || '' }`;
}

function podSelector(deployment: any): string {
  return Object.entries(deployment.spec?.selector?.matchLabels || {}).map(([key, value]) => `${ key }=${ value }`).join(',');
}

/**
 * Composable for the single-click installation of the AI agent:
 *
 * 1. Add the AI agent Helm repository (OCI ClusterRepo)
 * 2. Install the AI agent chart
 * 3. Wait for the user to configure the AI assistant in the settings page
 */
export function useAiAgentInstallerComposable() {
  const store = useStore();

  const canInstall = computed(() => {
    const canCreate = (type: string) => !!store.getters['management/schemaFor'](type)?.collectionMethods?.find((m: string) => m.toUpperCase() === 'POST');

    return isAdminUser(store.getters) && canCreate(CATALOG.CLUSTER_REPO) && canCreate(CATALOG.APP);
  });

  const hasFailedStep = computed(() => Object.values(state.steps).some((step) => step.status === InstallStepStatus.Error));

  // The installation can be started, or restarted after a failure
  const canStartInstall = computed(() => !state.started || hasFailedStep.value);

  const canOpenChatAndInstall = computed(() => !Chat.isOpen(store));

  const repository = computed(() => store.getters['management/byId'](CATALOG.CLUSTER_REPO, state.repositoryName));

  // The AI agent Helm release, whatever its name
  const agentApp = computed(() => store.getters['management/all'](CATALOG.APP)
    .find((app: any) => app.metadata?.namespace === AGENT_NAMESPACE && app.spec?.chart?.metadata?.name === AGENT_CHART_NAME));

  const agentDeployment = computed(() => store.getters['management/byId'](WORKLOAD_TYPES.DEPLOYMENT, AGENT_DEPLOYMENT_ID));

  const isAgentAppMissing = computed(() => state.appsLoaded && !agentApp.value);

  // The AI agent Helm chart is not installed, or is still being installed
  const isAgentNotInstalled = computed(() => {
    if (!canInstall.value) {
      return false;
    }

    if (isAgentAppMissing.value) {
      return true;
    }

    if (state.started && state.steps[InstallStep.Agent].status !== InstallStepStatus.Done) {
      return true;
    }

    return false;
  });

  // Until the Apps are loaded we can't tell if the agent is installed
  const isInstallStateKnown = computed(() => !canInstall.value || state.started || state.appsChecked);

  function setStep(step: InstallStep, status: InstallStepStatus, error?: string) {
    state.steps[step] = {
      status,
      error
    };
  }

  /**
   * Loads the resource in the store, kept up to date from then on; null if it doesn't exist.
   */
  async function findResource(type: string, id: string, opt: Record<string, any> = {}) {
    try {
      return await store.dispatch('management/find', {
        type,
        id,
        opt
      });
    } catch (err) { // eslint-disable-line no-unused-vars
      return null;
    }
  }

  async function loadAiAgentApp() {
    if (state.appsLoaded || !canInstall.value) {
      return;
    }

    try {
      await store.dispatch('management/findAll', { type: CATALOG.APP });
      state.appsLoaded = true;
    } catch (err) {
      warn('Unable to load the Apps:', err);
    } finally {
      state.appsChecked = true;
    }
  }

  // Whether the agent is installed decides between the chat and the install flow
  watch(canInstall, (value) => {
    if (value) {
      loadAiAgentApp();
    }
  }, { immediate: true });

  /**
   * Step 1: adds the OCI ClusterRepo, if missing, and waits for its index to be downloaded.
   */
  async function ensureRepository(run: number) {
    const existing = await getHelmRepositoryExact(store, AGENT_REPO_URL);

    state.repositoryName = existing?.metadata?.name || (await createRepository()).metadata.name;
    // The lookup above doesn't keep the repository up to date
    await findResource(CATALOG.CLUSTER_REPO, state.repositoryName);

    const result = await until(() => {
      // OCI repositories report OCIDownloaded instead of Downloaded
      const downloaded = repository.value?.status?.conditions?.find((c: any) => c.type === 'OCIDownloaded' || c.type === 'Downloaded');

      if (downloaded?.status === 'False' && downloaded.message) {
        return `Unable to download the Helm repository ${ AGENT_REPO_URL }: ${ downloaded.message }`;
      }

      return downloaded?.status === 'True';
    }, run);

    if (typeof result === 'string') {
      throw new Error(result);
    }

    state.repositoryExists = true;
  }

  async function createRepository(credentials?: RepositoryCredentials) {
    const spec: Record<string, any> = { url: AGENT_REPO_URL };

    if (AGENT_REPO_AUTH_ENABLED) {
      if (!credentials) {
        throw new Error(`Credentials are required to access ${ AGENT_REPO_URL }`);
      }

      const secret = await store.dispatch('management/create', {
        type:     SECRET,
        _type:    SECRET_TYPES.BASIC,
        metadata: {
          namespace:    AGENT_REPO_AUTH_SECRET_NAMESPACE,
          generateName: AGENT_REPO_AUTH_SECRET_GENERATE_NAME,
        },
        data: {
          username: base64Encode(credentials.username),
          password: base64Encode(credentials.password),
        },
      });
      const saved = await secret.save();

      spec.clientSecret = {
        name:      saved.metadata.name,
        namespace: saved.metadata.namespace,
      };
    }

    const model = await store.dispatch('management/create', {
      type:     CATALOG.CLUSTER_REPO,
      metadata: { name: AGENT_REPO_NAME },
      spec,
    });

    return await model.save();
  }

  async function findRepository() {
    const repo = await findResource(CATALOG.CLUSTER_REPO, state.repositoryName);

    if (!repo) {
      throw new Error(`The Helm repository ${ AGENT_REPO_URL } was not found`);
    }

    return repo;
  }

  function getValuesOverrides(): Record<string, any> {
    return {
      plan:         { enabled: true },
      planApproval: { enabled: true },
    };
  }

  /**
   * Returns the Helm values for the agent chart: the ones edited by the user,
   * or the chart defaults merged with our overrides.
   */
  async function loadValues(): Promise<Record<string, any>> {
    if (state.values) {
      return cloneDeep(state.values);
    }

    const repo = await findRepository();
    const info = await store.dispatch('management/request', {
      method: 'GET',
      url:    `${ repo.links?.info }&chartName=${ AGENT_CHART_NAME }`,
    });

    const defaults = merge(cloneDeep(info?.values || {}), getValuesOverrides());

    defaultValues = defaults;

    return cloneDeep(defaults);
  }

  function setValues(values: Record<string, any> | null) {
    state.values = values && !isEqual(values, defaultValues) ? values : null;
  }

  /**
   * Returns the "Error: ..." line printed by Helm in the operation pod logs.
   */
  async function fetchHelmError(namespace: string, name: string): Promise<string> {
    try {
      const logs = await store.dispatch('management/request', {
        url:          `/k8s/clusters/local/api/v1/namespaces/${ namespace }/pods/${ name }/log?container=helm&tailLines=50`,
        responseType: 'text',
      });
      const text = typeof logs === 'string' ? logs : logs?.data || '';

      return text.split('\n').reverse().find((line: string) => line.startsWith('Error:'))?.replace(/^Error:\s*/, '') || '';
    } catch (err) {
      warn('Unable to read the Helm operation logs:', err);

      return '';
    }
  }

  /**
   * Waits for the Helm command run by the operation pod to complete; throws if it failed.
   */
  async function waitForHelmOperation(operation: any, action: string, run: number) {
    if (!operation?.operationName) {
      return;
    }

    const operationId = `${ operation.operationNamespace }/${ operation.operationName }`;

    await findResource(CATALOG.OPERATION, operationId);

    const { podName, podNamespace } = await until(() => {
      const status = store.getters['management/byId'](CATALOG.OPERATION, operationId)?.status;

      return status?.podName ? status : null;
    }, run);
    const podId = `${ podNamespace }/${ podName }`;

    await findResource(POD, podId);

    const terminated = await until(() => {
      const pod = store.getters['management/byId'](POD, podId);

      return pod?.status?.containerStatuses?.find((c: any) => c.name === 'helm')?.state?.terminated;
    }, run);

    if (terminated.exitCode !== 0) {
      const reason = await fetchHelmError(podNamespace, podName) || terminated.message || terminated.reason;

      throw new Error(`Helm ${ action } failed: ${ reason }`);
    }
  }

  /**
   * True when the agent deployment has rolled out and its pods are ready; an error message if it can't get there.
   */
  function agentRolloutStatus(): true | string | null {
    const deployment = agentDeployment.value;

    if (!deployment) {
      return `The ${ AGENT_NAME } deployment was not found`;
    }

    const selector = podSelector(deployment);
    const createdAt = new Date(deployment.metadata?.creationTimestamp).getTime();
    // Skip the pods of a previous installation and the ones being replaced by a rollout
    const pods = store.getters['management/matching'](POD, selector, AGENT_NAMESPACE)
      .filter((pod: any) => !pod.metadata?.deletionTimestamp && new Date(pod.metadata?.creationTimestamp).getTime() >= createdAt);

    for (const pod of pods) {
      const statuses = [...(pod.status?.initContainerStatuses || []), ...(pod.status?.containerStatuses || [])];
      const failed = statuses.find((c: any) => POD_FAILURE_REASONS.includes(c.state?.waiting?.reason));

      if (pod.status?.phase === 'Failed' || failed) {
        const reason = failed ? `${ failed.state.waiting.reason }: ${ failed.state.waiting.message || '' }` : pod.status?.reason || 'Failed';

        return `Pod ${ pod.metadata?.name } is not running. ${ reason }`.trim();
      }
    }

    const desired = deployment.spec?.replicas ?? 1;
    const status = deployment.status || {};
    // status.replicas still counts the old pods while a rollout is in progress
    const rolledOut = (status.observedGeneration ?? 0) >= (deployment.metadata?.generation ?? 0) &&
      (status.updatedReplicas || 0) >= desired &&
      (status.availableReplicas || 0) >= desired &&
      (status.replicas || 0) <= desired;
    const podsReady = pods.length > 0 && pods.every((pod: any) => pod.status?.phase === 'Running' &&
      (pod.status?.containerStatuses || []).every((c: any) => c.ready));

    return rolledOut && podsReady ? true : null;
  }

  /**
   * Waits until the agent deployment is rolled out and its pods are ready.
   */
  async function waitForAgentReady(run: number) {
    // Forced: after a reinstall the store can still hold the removed deployment and pods
    const deployment = await findResource(WORKLOAD_TYPES.DEPLOYMENT, AGENT_DEPLOYMENT_ID, { force: true });

    if (deployment) {
      await store.dispatch('management/findMatching', {
        type:      POD,
        selector:  podSelector(deployment),
        namespace: AGENT_NAMESPACE,
        opt:       { force: true },
      });
    }

    const result = await until(agentRolloutStatus, run);

    if (typeof result === 'string') {
      throw new Error(result);
    }
  }

  /**
   * Removes the current AI agent Helm release, if any: waits for an ongoing uninstallation, or starts a new one.
   */
  async function uninstallAgent(run: number) {
    const id = agentApp.value?.id || `${ AGENT_NAMESPACE }/${ AGENT_RELEASE_NAME }`;
    // Forced: the store copy can be stale, e.g. while the App detail page replaces the Apps watch
    const app = await findResource(CATALOG.APP, id, { force: true });

    if (!app) {
      return;
    }

    if (app.spec?.info?.status !== 'uninstalling') {
      await app.doAction('uninstall', {});
    }

    await until(() => !store.getters['management/byId'](CATALOG.APP, id), run);
    state.appExists = false;
  }

  async function installAgent(run: number) {
    const repo = await findRepository();
    const chart = await getHelmChart(store, repo, AGENT_CHART_NAME);

    if (!chart) {
      throw new Error(`Chart ${ AGENT_CHART_NAME } not found in ${ AGENT_REPO_URL }`);
    }

    const operation = await repo.doAction('install', {
      charts: [{
        chartName:   AGENT_CHART_NAME,
        version:     chart.version,
        releaseName: AGENT_RELEASE_NAME,
        description: AGENT_CHART_NAME,
        annotations: {
          [CATALOG_ANNOTATIONS.SOURCE_REPO_TYPE]: 'cluster',
          [CATALOG_ANNOTATIONS.SOURCE_REPO_NAME]: state.repositoryName,
        },
        values: state.values ? cloneDeep(state.values) : getValuesOverrides(),
      }],
      noHooks:                  false,
      timeout:                  '600s',
      // Helm would only report failing pods at its timeout: their readiness is checked by waitForAgentReady
      wait:                     false,
      namespace:                AGENT_NAMESPACE,
      projectId:                '',
      disableOpenAPIValidation: false,
      skipCRDs:                 false,
    });

    await waitForHelmOperation(operation, 'installation', run);
  }

  /**
   * Step 2: installs the AI agent chart, replacing the current release when `reinstall` is set.
   */
  async function runAgentStep(run: number, reinstall: boolean) {
    setStep(InstallStep.Agent, InstallStepStatus.InProgress);

    try {
      if (reinstall) {
        await uninstallAgent(run);
        await installAgent(run);
      }

      await waitForAgentReady(run);

      // The settings page can only load the AI agent configs once the store knows the CRD registered by the chart
      await until(() => store.getters['management/schemaFor'](RANCHER_AI_SCHEMA.AI_AGENT_CONFIG), run);

      await loadAgentResources();
      // A deployment installed outside this flow has no Helm release to validate
      state.appExists = !!agentApp.value;
    } catch (err) {
      if (!(err instanceof CancelledError) && run === currentRun.value) {
        warn('Unable to install the AI agent:', err);
        setStep(InstallStep.Agent, InstallStepStatus.Error, errorMessage(err));
      }

      return;
    }

    if (run === currentRun.value) {
      setStep(InstallStep.Agent, InstallStepStatus.Done);
      setStep(InstallStep.Configure, InstallStepStatus.InProgress);
    }
  }

  /**
   * Step 1, then the agent step only if the agent is already deployed: otherwise the user reviews the Helm values first.
   */
  async function install() {
    const run = ++currentRun.value;

    state.started = true;
    state.configApplied = false;
    state.verifyingConfig = false;
    setStep(InstallStep.Repository, InstallStepStatus.InProgress);
    [InstallStep.Agent, InstallStep.Configure].forEach((step) => setStep(step, InstallStepStatus.Pending));
    startValidation();

    try {
      await ensureRepository(run);
    } catch (err) {
      if (!(err instanceof CancelledError) && run === currentRun.value) {
        warn('Unable to add the AI agent repository:', err);
        setStep(InstallStep.Repository, InstallStepStatus.Error, errorMessage(err));
      }

      return;
    }

    setStep(InstallStep.Repository, InstallStepStatus.Done);

    if (await findResource(WORKLOAD_TYPES.DEPLOYMENT, AGENT_DEPLOYMENT_ID)) {
      await runAgentStep(run, false);
    }
  }

  function installChart() {
    return runAgentStep(++currentRun.value, true);
  }

  /**
   * Loads the resources deployed by the chart, so that their removal can be detected.
   */
  async function loadAgentResources() {
    const found = await Promise.all(AGENT_RESOURCES.map((resource) => findResource(resource.type, resource.id)));

    state.agentResources = AGENT_RESOURCES.filter((_, i) => !!found[i]);
    state.agentCrdExists = !!store.getters['management/schemaFor'](RANCHER_AI_SCHEMA.AI_AGENT_CONFIG);
  }

  /**
   * The first resource deployed by the chart that has been removed.
   */
  function findRemovedAgentResource(): string | null {
    if (state.appExists && !agentApp.value) {
      return `The ${ AGENT_CHART_NAME } chart`;
    }

    const removed = state.agentResources.find(({ type, id }) => !store.getters['management/byId'](type, id));

    if (removed) {
      return `The ${ removed.id } ${ removed.kind }`;
    }

    if (state.agentCrdExists && !store.getters['management/schemaFor'](RANCHER_AI_SCHEMA.AI_AGENT_CONFIG)) {
      return `The ${ RANCHER_AI_SCHEMA.AI_AGENT_CONFIG } CRD`;
    }

    return null;
  }

  /**
   * Stops the running steps and marks the given step as failed, resetting the following ones.
   */
  function invalidate(step: InstallStep, error: string) {
    currentRun.value++;
    state.verifyingConfig = false;

    const steps = [InstallStep.Repository, InstallStep.Agent, InstallStep.Configure];

    steps.slice(steps.indexOf(step) + 1).forEach((s) => setStep(s, InstallStepStatus.Pending));
    setStep(step, InstallStepStatus.Error, error);

    if (step === InstallStep.Repository) {
      state.repositoryExists = false;
    } else {
      state.appExists = false;
      state.agentResources = [];
      state.agentCrdExists = false;
    }
  }

  /**
   * Invalidates the completed steps whose resources are removed, until the installation ends.
   */
  function startValidation() {
    if (stopValidation) {
      return;
    }

    stopValidation = watch(() => ({
      repository:           !!repository.value,
      removedAgentResource: findRemovedAgentResource(),
    }), ({ repository, removedAgentResource }) => {
      if (!repository && state.steps[InstallStep.Repository].status === InstallStepStatus.Done) {
        invalidate(InstallStep.Repository, `The Helm repository ${ state.repositoryName } has been removed`);
      } else if (removedAgentResource && state.steps[InstallStep.Agent].status === InstallStepStatus.Done) {
        invalidate(InstallStep.Agent, `${ removedAgentResource } has been removed`);
      }
    });
  }

  function endValidation() {
    if (stopValidation) {
      stopValidation();
      stopValidation = null;
    }
  }

  /**
   * Throws if the active LLM provider or its model are not set in the agent configuration.
   */
  async function checkAgentConfig() {
    // Saved through the agent API, so the store might not have received the update yet
    const configMap = await findResource(CONFIG_MAP, `${ AGENT_NAMESPACE }/${ AGENT_CONFIG_CONFIG_MAP_NAME }`, { force: true });
    const data = configMap?.data || {};

    if (!data.ACTIVE_LLM) {
      throw new Error('The LLM provider is not configured');
    }

    if (!data[decodeModelKey(data.ACTIVE_LLM)]) {
      throw new Error('The LLM model is not configured');
    }
  }

  /**
   * Step 3: completes once the saved configuration is valid and the redeployed agent is up and running.
   */
  async function verifyConfigApplied() {
    const run = ++currentRun.value;

    setStep(InstallStep.Configure, InstallStepStatus.InProgress);
    state.verifyingConfig = true;

    try {
      await checkAgentConfig();
      await waitForAgentReady(run);

      setStep(InstallStep.Configure, InstallStepStatus.Done);
      state.configApplied = true;
      endValidation();
    } catch (err) {
      if (!(err instanceof CancelledError) && run === currentRun.value) {
        warn('Unable to apply the AI assistant configuration:', err);
        setStep(InstallStep.Configure, InstallStepStatus.Error, errorMessage(err));
      }
    } finally {
      if (run === currentRun.value) {
        state.verifyingConfig = false;
      }
    }
  }

  /**
   * Called by the settings page once the AI assistant configuration has been saved.
   */
  function markConfigApplied() {
    const status = state.steps[InstallStep.Configure].status;

    if (status !== InstallStepStatus.InProgress && status !== InstallStepStatus.Error) {
      return;
    }

    verifyConfigApplied();

    if (!Chat.isOpen(store)) {
      Chat.open(store);
    }
  }

  function openChatAndInstall() {
    if (!Chat.isOpen(store)) {
      Chat.open(store);
    }

    // The chat shows the ongoing installation, which handles its own retries
    if (canStartInstall.value) {
      install();
    }
  }

  function reset() {
    currentRun.value++;
    endValidation();
    state.started = false;
    state.verifyingConfig = false;
    state.configApplied = false;
    state.repositoryExists = false;
    state.appExists = false;
    state.agentResources = [];
    state.agentCrdExists = false;
    state.values = null;
    [InstallStep.Repository, InstallStep.Agent, InstallStep.Configure].forEach((step) => setStep(step, InstallStepStatus.Pending));
  }

  return {
    state,
    canInstall,
    canOpenChatAndInstall,
    canStartInstall,
    openChatAndInstall,
    install,
    installChart,
    loadValues,
    setValues,
    isAgentAppMissing,
    isAgentNotInstalled,
    isInstallStateKnown,
    agentApp,
    repository,
    loadAiAgentApp,
    markConfigApplied,
    reset,
  };
}
