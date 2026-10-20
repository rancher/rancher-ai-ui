import { shallowMount } from '@vue/test-utils';
import ApprovalInfo from '../ApprovalInfo.vue';

const mockStore = {
  state: {
    $router: { push: jest.fn() },
    $route:  { params: { cluster: 'local' } }
  }
};

const requiredSetup = () => ({ global: { provide: { store: mockStore } } });

describe('ApprovalInfo.vue', () => {
  describe('Component Initialization', () => {
    it('should render the component correctly', () => {
      const principal = { loginName: 'testuser' };
      const timestamp = new Date('2024-01-15T14:30:00');

      const wrapper = shallowMount(ApprovalInfo, {
        props: {
          principal,
          timestamp,
          disabled: false
        },
        ...requiredSetup()
      });

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('.chat-planning-approval-info').exists()).toBe(true);
    });

    it('should render with default props', () => {
      const wrapper = shallowMount(ApprovalInfo, { ...requiredSetup() });

      expect(wrapper.exists()).toBe(true);
      expect((wrapper.vm as any).props.disabled).toBe(false);
      expect((wrapper.vm as any).props.principal).toEqual({});
    });
  });

  describe('Props Handling', () => {
    it('should accept disabled prop', () => {
      const wrapper = shallowMount(ApprovalInfo, {
        props: { disabled: true },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).props.disabled).toBe(true);
      expect(wrapper.find('.disabled-panel').exists()).toBe(true);
    });

    it('should accept timestamp prop', () => {
      const timestamp = new Date('2024-01-15T14:30:00');

      const wrapper = shallowMount(ApprovalInfo, {
        props: { timestamp },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).props.timestamp).toEqual(timestamp);
    });

    it('should apply disabled-panel class when disabled is true', () => {
      const wrapper = shallowMount(ApprovalInfo, {
        props: { disabled: true },
        ...requiredSetup()
      });

      expect(wrapper.find('.chat-planning-approval-info.disabled-panel').exists()).toBe(true);
    });

    it('should not apply disabled-panel class when disabled is false', () => {
      const wrapper = shallowMount(ApprovalInfo, {
        props: { disabled: false },
        ...requiredSetup()
      });

      expect(wrapper.find('.chat-planning-approval-info.disabled-panel').exists()).toBe(false);
    });
  });

  describe('Computed Properties', () => {
    it('should compute userKey as "admin" when principal.loginName is "admin"', () => {
      const wrapper = shallowMount(ApprovalInfo, {
        props: { principal: { loginName: 'admin' } },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).userKey).toBe('admin');
    });

    it('should compute userKey as "user" for non-admin principals', () => {
      const wrapper = shallowMount(ApprovalInfo, {
        props: { principal: { loginName: 'testuser' } },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).userKey).toBe('user');
    });

    it('should compute userKey as "user" when loginName is missing', () => {
      const wrapper = shallowMount(ApprovalInfo, {
        props: { principal: {} },
        ...requiredSetup()
      });

      expect((wrapper.vm as any).userKey).toBe('user');
    });
  });

  describe('User Interactions', () => {
    it('should call routeToSettings when goToChatSettings link is clicked', async() => {
      const wrapper = shallowMount(ApprovalInfo, {
        props: { principal: { loginName: 'testuser' } },
        ...requiredSetup()
      });

      // Access the method directly from the component instance
      await (wrapper.vm as any).routeToSettings();

      expect(mockStore.state.$router.push).toHaveBeenCalledWith({
        name:   'c-cluster-settings-rancher-ai-ui',
        params: { cluster: 'local' },
        query:  { section: 'chat-settings' }
      });
    });

    it('should use cluster from route params when available', async() => {
      mockStore.state.$route.params.cluster = 'my-cluster';

      const wrapper = shallowMount(ApprovalInfo, { ...requiredSetup() });

      await (wrapper.vm as any).routeToSettings();

      expect(mockStore.state.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({ params: { cluster: 'my-cluster' } })
      );

      mockStore.state.$route.params.cluster = 'local';
    });

    it('should use default cluster "local" when route params are missing', async() => {
      const originalParams = mockStore.state.$route.params;

      mockStore.state.$route.params = { cluster: '' } as any;

      const wrapper = shallowMount(ApprovalInfo, { ...requiredSetup() });

      await (wrapper.vm as any).routeToSettings();

      expect(mockStore.state.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({ params: { cluster: 'local' } })
      );

      mockStore.state.$route.params = originalParams;
    });
  });
});
