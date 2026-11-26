import { mount, VueWrapper } from '@vue/test-utils';
import AgentValuesModal from '../AgentValuesModal.vue';

jest.mock('@shell/composables/useI18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
jest.mock('vuex', () => ({ useStore: () => ({}) }));

jest.mock('@components/RcButton/RcButton.vue', () => ({
  __esModule: true,
  default:    {
    name:     'RcButton',
    template: '<button class="rc-button"><slot /></button>',
    props:    ['variant', 'disabled'],
    emits:    ['click']
  }
}));

jest.mock('@shell/components/YamlEditor.vue', () => ({
  __esModule: true,
  default:    {
    name:     'YamlEditor',
    template: '<div />',
    props:    ['value', 'scrolling'],
    emits:    ['update:value']
  }
}));

jest.mock('@components/Banner/Banner.vue', () => ({
  __esModule: true,
  default:    {
    name:     'Banner',
    template: '<div />',
    props:    ['color', 'label']
  }
}));

const YAML = 'plan:\n  enabled: true\n';

function mountComponent(props: Record<string, unknown> = {}): VueWrapper<any> {
  return mount(AgentValuesModal, {
    props: {
      value:   YAML,
      loading: false,
      ...props
    }
  });
}

const findButton = (wrapper: VueWrapper<any>, id: string) => wrapper.findAllComponents({ name: 'RcButton' })
  .find((button) => button.vm.$attrs['data-testid'] === `rancher-ai-ui-install-agent-values-${ id }`)!;

const editor = (wrapper: VueWrapper<any>) => wrapper.findComponent({ name: 'YamlEditor' });

describe('AgentValuesModal.vue', () => {
  describe('While the values are loading', () => {
    it('should show a spinner instead of the editor and disable install', () => {
      const wrapper = mountComponent({ loading: true });

      expect(wrapper.find('[data-testid="rancher-ai-ui-install-agent-values-loading"]').exists()).toBe(true);
      expect(editor(wrapper).exists()).toBe(false);
      expect(findButton(wrapper, 'install').props('disabled')).toBe(true);
    });

    it('should show the values in the editor once loaded', async() => {
      const wrapper = mountComponent({
        loading: true,
        value:   ''
      });

      await wrapper.setProps({
        loading: false,
        value:   YAML
      });

      expect(wrapper.find('[data-testid="rancher-ai-ui-install-agent-values-loading"]').exists()).toBe(false);
      expect(editor(wrapper).props('value')).toBe(YAML);
      expect(findButton(wrapper, 'install').props('disabled')).toBe(false);
    });
  });

  describe('Editing', () => {
    it('should install the edited values', async() => {
      const wrapper = mountComponent();
      const edited = 'plan:\n  enabled: false\n';

      editor(wrapper).vm.$emit('update:value', edited);
      await wrapper.vm.$nextTick();

      findButton(wrapper, 'install').vm.$emit('click');

      expect(wrapper.emitted('save')).toStrictEqual([[edited]]);
    });

    it('should replace the edits when new values are passed', async() => {
      const wrapper = mountComponent();
      const restored = 'replicaCount: 1\n';

      editor(wrapper).vm.$emit('update:value', 'plan: edited\n');
      await wrapper.setProps({ value: restored });

      expect(editor(wrapper).props('value')).toBe(restored);

      findButton(wrapper, 'install').vm.$emit('click');

      expect(wrapper.emitted('save')).toStrictEqual([[restored]]);
    });

    it('should not allow installing empty values', async() => {
      const wrapper = mountComponent();

      editor(wrapper).vm.$emit('update:value', '');
      await wrapper.vm.$nextTick();

      expect(findButton(wrapper, 'install').props('disabled')).toBe(true);
    });
  });

  describe('Actions', () => {
    it('should close without saving the edits on cancel', async() => {
      const wrapper = mountComponent();

      editor(wrapper).vm.$emit('update:value', 'plan: edited\n');
      await wrapper.vm.$nextTick();

      findButton(wrapper, 'cancel').vm.$emit('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
      expect(wrapper.emitted('save')).toBeUndefined();
    });

    it('should ask to restore the defaults without saving the edits', async() => {
      const wrapper = mountComponent();

      editor(wrapper).vm.$emit('update:value', 'plan: edited\n');
      await wrapper.vm.$nextTick();

      findButton(wrapper, 'restore').vm.$emit('click');

      expect(wrapper.emitted('restore')).toHaveLength(1);
      expect(wrapper.emitted('save')).toBeUndefined();
    });
  });

  describe('Errors', () => {
    it('should show the error, keeping the edits', async() => {
      const wrapper = mountComponent();
      const edited = 'plan: [unclosed';

      editor(wrapper).vm.$emit('update:value', edited);
      await wrapper.setProps({ error: 'Invalid YAML' });

      const banner = wrapper.findComponent({ name: 'Banner' });

      expect(banner.props('color')).toBe('error');
      expect(banner.props('label')).toBe('Invalid YAML');
      expect(editor(wrapper).props('value')).toBe(edited);
    });

    it('should not show a banner without an error', () => {
      const wrapper = mountComponent();

      expect(wrapper.findComponent({ name: 'Banner' }).exists()).toBe(false);
    });
  });
});
