import { ref } from 'vue';
import { shallowMount } from '@vue/test-utils';
import Console from '../Console.vue';

jest.mock('@shell/composables/useI18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
jest.mock('vuex', () => ({ useStore: () => ({}) }));

jest.mock('../../../composables/useInputComposable', () => ({
  useInputComposable: () => ({
    inputText:         ref(''),
    updateInput:       jest.fn(),
    cleanInput:        (value: string) => value,
    cleanInputAndTags: (value: string) => value,
    setConsoleRef:     jest.fn(),
  })
}));

jest.mock('@components/RcButton/RcButton.vue', () => ({
  default:    {
    name:     'RcButton',
    template: '<button />'
  }
}));
jest.mock('../../agent/SelectAgent.vue', () => ({
  default:    {
    name:     'SelectAgent',
    template: '<div />'
  }
}));
jest.mock('../../console/LlmModelLabel.vue', () => ({
  default:    {
    name:     'LlmModelLabel',
    template: '<div />'
  }
}));
jest.mock('../../console/VerifyResultsDisclaimer.vue', () => ({
  default:    {
    name:     'VerifyResultsDisclaimer',
    template: '<div />'
  }
}));
jest.mock('../../console/TokenUsage.vue', () => ({
  __esModule: true,
  default:    {
    name:     'TokenUsage',
    props:    ['usage', 'agents'],
    template: '<div />'
  }
}));

describe('Console.vue - token usage', () => {
  const tokenUsageRow = (wrapper: ReturnType<typeof shallowMount>) => wrapper.findComponent({ name: 'TokenUsage' }).element.parentElement!;

  it('should keep the token usage space but hide it until the chat starts', () => {
    const wrapper = shallowMount(Console, { props: { activeChatId: '' } });

    expect(wrapper.findComponent({ name: 'TokenUsage' }).exists()).toBe(true);
    expect(tokenUsageRow(wrapper).classList).toContain('token-usage-placeholder');
  });

  it('should show the token usage of the started chat', () => {
    const usage = { totalTokens: 1800 };
    const wrapper = shallowMount(Console, {
      props: {
        activeChatId: 'chat-1',
        chatUsage:    usage
      } as any
    });

    expect(tokenUsageRow(wrapper).classList).not.toContain('token-usage-placeholder');
    expect(wrapper.findComponent({ name: 'TokenUsage' }).props('usage')).toStrictEqual(usage);
  });
});
