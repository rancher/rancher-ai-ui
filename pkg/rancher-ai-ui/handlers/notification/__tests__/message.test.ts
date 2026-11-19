import MessageChannel from '../channel/message';
import Chat from '../../chat';
import { Role } from '../../../types';

jest.mock('@shell/composables/useI18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
jest.mock('../../chat', () => ({
  __esModule: true,
  default:    {
    isOpen: jest.fn(() => false),
    open:   jest.fn(),
  }
}));

const store = { commit: jest.fn() } as any;
const storage = { get: () => true };
const message = {
  role:           Role.Assistant,
  completed:      true,
  messageContent: 'Hello',
};

describe('Desktop notifications', () => {
  const originalNotification = (window as any).Notification;
  let instance: any;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    const MockNotification: any = jest.fn(function(this: any, title: string, options: any) {
      instance = Object.assign(this, {
        title,
        options,
        close: jest.fn()
      });
    });

    MockNotification.permission = 'granted';
    (window as any).Notification = MockNotification;
    jest.spyOn(document, 'hasFocus').mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    (window as any).Notification = originalNotification;
  });

  it('should keep the notification in the OS notification center until the user interacts with it', () => {
    MessageChannel.send(store, storage, message);

    expect(instance.options.body).toBe('ai.notifications.message.summary.message');

    jest.advanceTimersByTime(60000);

    expect(instance.close).not.toHaveBeenCalled();
  });

  it('should open the chat and close the notification when clicked', () => {
    jest.spyOn(window, 'focus').mockImplementation(() => {});

    MessageChannel.send(store, storage, message);
    instance.onclick();

    expect(Chat.open).toHaveBeenCalledWith(store);
    expect(instance.close).toHaveBeenCalled();
  });
});
