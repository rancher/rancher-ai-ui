import { shallowMount } from '@vue/test-utils';
import TokenUsage from '../TokenUsage.vue';
import { Agent, ChatUsage } from '../../../types';

jest.mock('@shell/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, args?: Record<string, unknown>) => {
      if (key === 'ai.console.tokenUsage.inTotal') {
        return `${ args?.total } in total`;
      }
      if (key === 'aiConfig.form.section.usage.sources.planner') {
        return 'Planner';
      }

      return key;
    },
  }),
}));

jest.mock('vuex', () => ({ useStore: () => ({ getters: { 'i18n/exists': (key: string) => key === 'aiConfig.form.section.usage.sources.planner' } }) }));

jest.mock('../../popover/TextLabel.vue', () => ({
  __esModule: true,
  default:    {
    name:     'TextLabelPopover',
    props:    ['label', 'disabled'],
    template: '<div><slot /></div>',
  }
}));

const totals = (totalTokens: number) => ({
  inputTokens:  totalTokens,
  outputTokens: 0,
  totalTokens,
});

const createUsage = (overrides: Partial<ChatUsage> = {}): ChatUsage => ({
  inputTokens:  1000,
  outputTokens: 234,
  totalTokens:  1234,
  byAgent:      {
    'agent-small': totals(200),
    'agent-big':   totals(1034),
  },
  bySource: {
    'ui-tools': totals(500),
    planner:    totals(734),
  },
  ...overrides,
} as ChatUsage);

const agents = [{
  name:        'agent-big',
  displayName: 'Big Agent'
}] as Agent[];

const mountComponent = (props: Record<string, unknown> = {}) => shallowMount(TokenUsage, {
  props: {
    usage: createUsage(),
    agents,
    ...props,
  },
  global: { renderStubDefaultSlot: true },
});

const rowTexts = (wrapper: ReturnType<typeof mountComponent>, section: string) => wrapper
  .findAll(`[data-testid="rancher-ai-ui-chat-console-token-usage-${ section }"] .token-usage-row`)
  .map((row) => [row.find('.token-usage-row-label').text(), row.find('.token-usage-row-value').text()]);

describe('TokenUsage', () => {
  describe('label', () => {
    it('should render the prefix and the compact total', () => {
      const wrapper = mountComponent({ usage: createUsage({ totalTokens: 1234567 }) });

      expect(wrapper.find('.token-usage-label').text()).toBe('ai.console.tokenUsage.label');
      expect(wrapper.findComponent({ name: 'TextLabelPopover' }).props('label')).toBe('1.2M in total');
    });

    it('should show 0 when there is no usage', () => {
      const wrapper = mountComponent({ usage: null });

      expect(wrapper.findComponent({ name: 'TextLabelPopover' }).props('label')).toBe('0 in total');
    });
  });

  describe('disabled', () => {
    it('should be enabled when there are tokens', () => {
      const wrapper = mountComponent();

      expect(wrapper.findComponent({ name: 'TextLabelPopover' }).props('disabled')).toBe(false);
    });

    it.each([
      ['the disabled prop is set', { disabled: true }],
      ['there is no usage', { usage: null }],
      ['no tokens have been used', { usage: createUsage({ totalTokens: 0 }) }],
    ])('should be disabled when %s', (_, props) => {
      const wrapper = mountComponent(props);

      expect(wrapper.findComponent({ name: 'TextLabelPopover' }).props('disabled')).toBe(true);
    });
  });

  describe('popover content', () => {
    it('should render the overall usage as input, output and total', () => {
      const wrapper = mountComponent();

      expect(rowTexts(wrapper, 'overall')).toStrictEqual([
        ['ai.console.tokenUsage.input', (1000).toLocaleString()],
        ['ai.console.tokenUsage.output', (234).toLocaleString()],
        ['ai.console.tokenUsage.total', (1234).toLocaleString()],
      ]);
    });

    it('should list the agents by usage, using their display name when available', () => {
      const wrapper = mountComponent();

      expect(rowTexts(wrapper, 'byAgent')).toStrictEqual([
        ['Big Agent', (1034).toLocaleString()],
        ['agent-small', (200).toLocaleString()],
      ]);
    });

    it('should list the sources by usage, translating the known ones', () => {
      const wrapper = mountComponent();

      expect(rowTexts(wrapper, 'bySource')).toStrictEqual([
        ['Planner', (734).toLocaleString()],
        ['ui-tools', (500).toLocaleString()],
      ]);
    });

    it('should hide the agent and source sections when they are empty', () => {
      const wrapper = mountComponent({
        usage: createUsage({
          byAgent:  {},
          bySource: undefined
        })
      });

      expect(wrapper.find('[data-testid="rancher-ai-ui-chat-console-token-usage-overall"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="rancher-ai-ui-chat-console-token-usage-byAgent"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="rancher-ai-ui-chat-console-token-usage-bySource"]').exists()).toBe(false);
    });
  });
});
