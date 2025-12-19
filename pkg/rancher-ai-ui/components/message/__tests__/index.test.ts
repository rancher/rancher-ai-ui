import { mount } from '@vue/test-utils';
import MessageComponent from '../index.vue';
import { Role } from '../../../types';

jest.mock('@components/RcButton/RcButton.vue', () => ({ default: {} }));
jest.mock('vuex', () => ({ useStore: () => ({ getters: { 'i18n/t': (key: string) => key } }) }));

const requiredSetup = () => {
  return {
    global: {
      stubs:      {
        RcButton:   true,
        UserAvatar: true
      },
      directives: {
        'clean-tooltip': jest.fn(),
        'clean-html':    jest.fn(),
      },
    }
  };
};

describe('message/index.vue', () => {
  it('should show user message', () => {
    const cleanHtmlSpy = jest.fn();

    const wrapper = mount(MessageComponent, {
      ...requiredSetup(),
      directives: {
        'clean-tooltip': jest.fn(),
        'clean-html':    cleanHtmlSpy,
      },
      props: {
        message: {
          id:                      'msg-1',
          role:                    Role.User,
          formattedMessageContent: 'Hello, world!',
          createdAt:               new Date().toISOString(),
        },
        disabled: false,
      },
    });

    const formattedMessageContent = wrapper.find('[data-testid="message-formatted-content"]');

    expect(formattedMessageContent.exists()).toBe(true);
    expect(cleanHtmlSpy).toHaveBeenCalled();

    const callArgs = cleanHtmlSpy.mock.calls[0][1];

    expect(callArgs.value).toBe('Hello, world!');
  });
});