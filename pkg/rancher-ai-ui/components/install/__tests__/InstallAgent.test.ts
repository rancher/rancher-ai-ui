import { h, reactive, ref } from 'vue';
import { mount, flushPromises, VueWrapper } from '@vue/test-utils';
import InstallAgent from '../InstallAgent.vue';
import { InstallStep, InstallStepStatus } from '../../../types';
import { PRODUCT_NAME } from '../../../product';

jest.mock('@shell/composables/useI18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

const mockRouter = { push: jest.fn() };
const mockRoute = {
  name:   'c-cluster-explorer',
  params: { cluster: 'local' }
};

jest.mock('vuex', () => ({
  useStore: () => ({
    getters: {
      'rancher/byId':     () => ({ name: 'Test User' }),
      'auth/principalId': 'local://user',
    },
    state: {
      $router: mockRouter,
      $route:  mockRoute,
    },
  }),
}));

jest.mock('@components/RcButton/RcButton.vue', () => ({
  default: {
    name:     'RcButton',
    template: '<button class="rc-button"><slot /></button>',
    props:    ['small', 'variant', 'disabled'],
    emits:    ['click']
  }
}));

jest.mock('@shell/components/AppModal.vue', () => ({
  __esModule: true,
  default:    {
    name:     'AppModal',
    template: '<div />',
  },
}));

jest.mock('../AgentValuesModal.vue', () => ({
  __esModule: true,
  default:    {
    name:     'AgentValuesModal',
    template: '<div />',
    props:    ['value', 'loading', 'error'],
    emits:    ['save', 'restore', 'close'],
  },
}));

let mockInstaller: any;

jest.mock('../../../composables/useAiAgentInstallerComposable', () => ({ useAiAgentInstallerComposable: () => mockInstaller }));

function createInstaller(state: Record<string, any> = {}, steps: Partial<Record<InstallStep, InstallStepStatus>> = {}, errors: Partial<Record<InstallStep, string>> = {}) {
  const stepState = (key: InstallStep) => ({
    status: steps[key] || InstallStepStatus.Pending,
    error:  errors[key],
  });

  return {
    state: reactive({
      started:         true,
      verifyingConfig: false,
      configApplied:   false,
      values:          null,
      ...state,
      steps:           {
        [InstallStep.Repository]: stepState(InstallStep.Repository),
        [InstallStep.Agent]:      stepState(InstallStep.Agent),
        [InstallStep.Configure]:  stepState(InstallStep.Configure),
      },
    }),
    install:      jest.fn(),
    installChart: jest.fn(),
    loadValues:   jest.fn().mockResolvedValue({ plan: { enabled: true } }),
    setValues:    jest.fn(),
    agentApp:     ref(null),
    repository:   ref(null),
  };
}

function mountComponent() {
  return mount(InstallAgent, {
    global: {
      stubs: {
        // Renders its slot, where the values modal is mounted
        AppModal:   { setup: (_: unknown, { slots }: any) => () => h('div', slots.default?.()) },
        RouterLink: {
          name:  'RouterLink',
          props: ['to'],
          setup(_: unknown, { slots }: any) {
            return () => h('a', { 'data-testid': 'step-link' }, slots.default?.());
          },
        },
      },
      directives: { 'clean-html': jest.fn() },
      mocks:      { $route: mockRoute },
    },
  });
}

const byTestId = (wrapper: VueWrapper<any>, id: string) => wrapper.find(`[data-testid="${ id }"]`);

const findButton = (wrapper: VueWrapper<any>, id: string) => wrapper.findAllComponents({ name: 'RcButton' })
  .find((button) => button.vm.$attrs['data-testid'] === id);

async function clickButton(wrapper: VueWrapper<any>, id: string) {
  findButton(wrapper, id)?.vm.$emit('click');
  await flushPromises();
}

describe('InstallAgent.vue', () => {
  let wrapper: VueWrapper<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute.name = 'c-cluster-explorer';
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  describe('Before the installation starts', () => {
    it('should show the install button and start the installation on click', async() => {
      mockInstaller = createInstaller({ started: false });
      wrapper = mountComponent();

      expect(byTestId(wrapper, 'rancher-ai-ui-install-agent-step-repository').exists()).toBe(false);

      await clickButton(wrapper, 'rancher-ai-ui-install-agent-start');

      expect(mockInstaller.install).toHaveBeenCalledTimes(1);
    });
  });

  describe('Steps', () => {
    it('should show a spinner on the running step and the number of the following ones', () => {
      mockInstaller = createInstaller({}, { [InstallStep.Repository]: InstallStepStatus.InProgress });
      wrapper = mountComponent();

      const repository = byTestId(wrapper, 'rancher-ai-ui-install-agent-step-repository');
      const agent = byTestId(wrapper, 'rancher-ai-ui-install-agent-step-agent');
      const configure = byTestId(wrapper, 'rancher-ai-ui-install-agent-step-configure');

      expect(repository.find('.icon-spinner').exists()).toBe(true);
      expect(agent.classes()).toContain('disabled');
      expect(agent.find('.install-agent-step-number').text()).toBe('2');
      expect(configure.find('.install-agent-step-number').text()).toBe('3');
    });

    it('should show the error and the retry button when the repository step fails', async() => {
      mockInstaller = createInstaller({}, { [InstallStep.Repository]: InstallStepStatus.Error }, { [InstallStep.Repository]: 'Download failed' });
      wrapper = mountComponent();

      const repository = byTestId(wrapper, 'rancher-ai-ui-install-agent-step-repository');

      expect(repository.find('.icon-error').exists()).toBe(true);
      expect(repository.find('.install-agent-step-error').text()).toBe('Download failed');

      await clickButton(wrapper, 'rancher-ai-ui-install-agent-retry');

      expect(mockInstaller.install).toHaveBeenCalledTimes(1);
    });

    it('should link the repository step to the ClusterRepo once it exists', () => {
      mockInstaller = createInstaller({}, { [InstallStep.Repository]: InstallStepStatus.Done });
      mockInstaller.repository.value = { metadata: { name: 'rancher-ai' } };
      wrapper = mountComponent();

      const link = byTestId(wrapper, 'rancher-ai-ui-install-agent-step-repository').findComponent({ name: 'RouterLink' });

      expect(link.exists()).toBe(true);
      expect(link.props('to')).toStrictEqual(expect.objectContaining({ params: expect.objectContaining({ id: 'rancher-ai' }) }));
    });
  });

  describe('Agent step', () => {
    it('should install the chart when the repository is ready', async() => {
      mockInstaller = createInstaller({}, { [InstallStep.Repository]: InstallStepStatus.Done });
      wrapper = mountComponent();

      await clickButton(wrapper, 'rancher-ai-ui-install-agent-install-chart');

      expect(mockInstaller.installChart).toHaveBeenCalledTimes(1);
    });

    it('should hide the agent actions while the chart is being installed', () => {
      mockInstaller = createInstaller({}, {
        [InstallStep.Repository]: InstallStepStatus.Done,
        [InstallStep.Agent]:      InstallStepStatus.InProgress,
      });
      wrapper = mountComponent();

      expect(findButton(wrapper, 'rancher-ai-ui-install-agent-install-chart')).toBeUndefined();
      expect(findButton(wrapper, 'rancher-ai-ui-install-agent-edit-values')).toBeUndefined();
    });

    it('should label the values button as edited when the values are customized', () => {
      mockInstaller = createInstaller({ values: { plan: { enabled: false } } }, { [InstallStep.Repository]: InstallStepStatus.Done });
      wrapper = mountComponent();

      const label = findButton(wrapper, 'rancher-ai-ui-install-agent-edit-values')?.vm.$slots.default?.()[0].children;

      expect(String(label).trim()).toBe('ai.install.actions.editedValues');
    });
  });

  describe('Helm values modal', () => {
    async function openModal() {
      mockInstaller = createInstaller({}, { [InstallStep.Repository]: InstallStepStatus.Done });
      wrapper = mountComponent();

      await clickButton(wrapper, 'rancher-ai-ui-install-agent-edit-values');

      return wrapper.findComponent({ name: 'AgentValuesModal' });
    }

    it('should open the modal with the values as YAML', async() => {
      const modal = await openModal();

      expect(mockInstaller.loadValues).toHaveBeenCalledTimes(1);
      expect(modal.props('value')).toContain('plan:');
      expect(modal.props('value')).toContain('enabled: true');
      expect(modal.props('loading')).toBe(false);
    });

    it('should save valid YAML values and close the modal', async() => {
      const modal = await openModal();

      modal.vm.$emit('save', 'plan:\n  enabled: false\n');
      await flushPromises();

      expect(mockInstaller.setValues).toHaveBeenCalledWith({ plan: { enabled: false } });
      expect(wrapper.findComponent({ name: 'AgentValuesModal' }).exists()).toBe(false);
    });

    it('should show an error and keep the modal open for invalid YAML', async() => {
      const modal = await openModal();

      modal.vm.$emit('save', 'plan: [unclosed');
      await flushPromises();

      expect(mockInstaller.setValues).not.toHaveBeenCalled();
      expect(wrapper.findComponent({ name: 'AgentValuesModal' }).props('error')).toBe('ai.install.values.invalid');
    });

    it('should restore the default values and close the modal', async() => {
      const modal = await openModal();

      modal.vm.$emit('restore');
      await flushPromises();

      expect(mockInstaller.setValues).toHaveBeenCalledWith(null);
      expect(wrapper.findComponent({ name: 'AgentValuesModal' }).exists()).toBe(false);
    });
  });

  describe('Configure step', () => {
    const agentInstalled = {
      [InstallStep.Repository]: InstallStepStatus.Done,
      [InstallStep.Agent]:      InstallStepStatus.Done,
      [InstallStep.Configure]:  InstallStepStatus.InProgress,
    };

    it('should route to the settings page when clicking configure', async() => {
      mockInstaller = createInstaller({}, agentInstalled);
      wrapper = mountComponent();

      await clickButton(wrapper, 'rancher-ai-ui-install-agent-configure');

      expect(mockRouter.push).toHaveBeenCalledWith(expect.objectContaining({
        name:  `c-cluster-settings-${ PRODUCT_NAME }`,
        query: { section: 'ai-agent-settings' },
      }));
    });

    it('should hide the configure button on the settings page', () => {
      mockRoute.name = `c-cluster-settings-${ PRODUCT_NAME }`;
      mockInstaller = createInstaller({}, agentInstalled);
      wrapper = mountComponent();

      expect(findButton(wrapper, 'rancher-ai-ui-install-agent-configure')).toBeUndefined();
    });

    it('should show the verifying message while the configuration is checked', () => {
      mockInstaller = createInstaller({ verifyingConfig: true }, agentInstalled);
      wrapper = mountComponent();

      const configure = byTestId(wrapper, 'rancher-ai-ui-install-agent-step-configure');

      expect(configure.text()).toContain('ai.install.verifying');
      expect(configure.find('.icon-spinner').exists()).toBe(true);
      expect(findButton(wrapper, 'rancher-ai-ui-install-agent-configure')).toBeUndefined();
    });

    it('should emit reload once the configuration is applied', async() => {
      mockInstaller = createInstaller({ configApplied: true }, {
        ...agentInstalled,
        [InstallStep.Configure]: InstallStepStatus.Done,
      });
      wrapper = mountComponent();

      await clickButton(wrapper, 'rancher-ai-ui-install-agent-reload');

      expect(wrapper.emitted('reload')).toHaveLength(1);
    });
  });
});
