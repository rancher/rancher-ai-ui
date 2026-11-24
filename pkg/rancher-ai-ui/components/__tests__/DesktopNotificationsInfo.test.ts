import { flushPromises, shallowMount } from '@vue/test-utils';
import { reactive } from 'vue';
import Notifications from '../../handlers/notification';
import DesktopNotificationsInfo from '../DesktopNotificationsInfo.vue';

const mockStorage: Record<string, any> = {};
const mockSession = reactive<Record<string, any>>({});

jest.mock('vuex', () => ({
  useStore: () => ({
    getters: {
      get 'rancher-ai-ui/chat/session'() {
        return mockSession;
      }
    },
    commit: (_: string, data: Record<string, any>) => Object.assign(mockSession, data)
  })
}));
jest.mock('@shell/composables/useI18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
jest.mock('../../composables/useLocalStorageComposable', () => ({
  useLocalStorageComposable: () => ({
    get: (key: string) => mockStorage[key],
    set: (key: string, value: any) => {
      mockStorage[key] = value;
    }
  })
}));
jest.mock('../../handlers/notification', () => ({
  __esModule: true,
  default:    {
    isPermissionPending: jest.fn(),
    requestPermission:   jest.fn(),
  }
}));

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;

const RichTranslation = {
  name:     'RichTranslation',
  template: '<div><slot name="allow" content="Allow" /><slot name="turnOff" content="Turn off" /></div>'
};

function mountComponent() {
  return shallowMount(DesktopNotificationsInfo, {
    global: {
      directives: {
        'clean-html': (el: HTMLElement, binding: any) => {
          el.innerHTML = binding.value;
        }
      },
      stubs: {
        RichTranslation,
        Transition: false
      }
    }
  });
}

describe('DesktopNotificationsInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockSession).forEach((key) => delete mockSession[key]);
    mockStorage.enable_desktop_notifications = true;
    mockNotifications.isPermissionPending.mockReturnValue(true);
  });

  it('should inform the user before the browser asks for the permission', () => {
    const wrapper = mountComponent();

    expect(wrapper.find('[data-testid="rancher-ai-ui-desktop-notifications-action-message"]').exists()).toBe(true);
  });

  it.each([
    ['the permission was already answered', false, true],
    ['the notifications are turned off', true, false],
  ])('should not show when %s', (_, pending, enabled) => {
    mockNotifications.isPermissionPending.mockReturnValue(pending);
    mockStorage.enable_desktop_notifications = enabled;

    const wrapper = mountComponent();

    expect(wrapper.find('[data-testid="rancher-ai-ui-desktop-notifications-action-message"]').exists()).toBe(false);
  });

  it('should request the permission and hide, even if the browser prompt is dismissed', async() => {
    const wrapper = mountComponent();

    await wrapper.find('[data-testid="rancher-ai-ui-desktop-notifications-allow"]').trigger('click');
    await flushPromises();

    expect(mockNotifications.requestPermission).toHaveBeenCalled();
    expect(wrapper.find('[data-testid="rancher-ai-ui-desktop-notifications-action-message"]').exists()).toBe(false);
  });

  it('should turn the notifications off', async() => {
    const wrapper = mountComponent();

    await wrapper.find('[data-testid="rancher-ai-ui-desktop-notifications-turn-off"]').trigger('click');

    expect(mockStorage.enable_desktop_notifications).toBe(false);
  });

  it('should stay hidden after turning off and on again in the same session', async() => {
    const wrapper = mountComponent();

    await wrapper.find('[data-testid="rancher-ai-ui-desktop-notifications-turn-off"]').trigger('click');
    mockStorage.enable_desktop_notifications = true;

    const remounted = mountComponent();

    expect(remounted.find('[data-testid="rancher-ai-ui-desktop-notifications-action-message"]').exists()).toBe(false);
  });

  it('should not show when the permission was already requested from the menu', () => {
    mockSession['dismissed-desktop-notifications-info'] = true;

    const wrapper = mountComponent();

    expect(wrapper.find('[data-testid="rancher-ai-ui-desktop-notifications-action-message"]').exists()).toBe(false);
  });

  it.each([
    ['Firefox', 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0', false],
    ['Edge', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', true],
    ['Safari', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', true],
  ])('should show the browser settings hint on %s: %s', (_, userAgent, expected) => {
    jest.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);

    const wrapper = mountComponent();

    expect(wrapper.find('[data-testid="rancher-ai-ui-desktop-notifications-settings-hint"]').exists()).toBe(expected);
  });

  it('should show the browser settings hint text', () => {
    jest.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0');

    const wrapper = mountComponent();

    expect(wrapper.find('[data-testid="rancher-ai-ui-desktop-notifications-settings-hint"]').text()).toBe('ai.message.system.desktopNotifications.settingsHint');
  });

  it('should show on Chrome, without the browser settings hint', () => {
    jest.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36');

    const wrapper = mountComponent();

    expect(wrapper.find('[data-testid="rancher-ai-ui-desktop-notifications-action-message"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="rancher-ai-ui-desktop-notifications-settings-hint"]').exists()).toBe(false);
  });
});
