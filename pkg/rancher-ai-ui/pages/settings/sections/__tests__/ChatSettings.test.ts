
import { shallowMount } from '@vue/test-utils';
import ChatSettings from '../ChatSettings.vue';
import { Settings, SettingsFormData } from '../../types';

// Mock Checkbox component
jest.mock('@components/Form/Checkbox/Checkbox.vue', () => ({
  default: {
    name:     'Checkbox',
    props:    {
      value:      Boolean,
      labelKey:   String,
      label:      String,
      tooltip:    String,
      disabled:   Boolean
    },
    emits:    ['update:value'],
    template: '<div class="checkbox-mock"><input type="checkbox" class="checkbox-input" /></div>'
  }
}));

// Mock Vuex
jest.mock('vuex', () => {
  const actual = jest.requireActual('vuex');

  return {
    ...actual,
    useStore: () => ({ getters: { 'i18n/t': (key: string) => key } }),
  };
});

describe('ChatSettings.vue', () => {
  describe('Component Initialization', () => {
    it('should render the component', () => {
      const wrapper = shallowMount(ChatSettings, { props: { value: {} as SettingsFormData } });

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('.chat-settings').exists()).toBe(true);
    });

    it('should render multi-step planning section', () => {
      const wrapper = shallowMount(ChatSettings, { props: { value: {} as SettingsFormData } });

      expect(wrapper.text()).toContain('aiConfig.form.section.chat.multiStepPlanning.title');
    });

    it('should render multi-step planning enabled checkbox', () => {
      const wrapper = shallowMount(ChatSettings, { props: { value: {} as SettingsFormData } });

      const checkboxes = wrapper.findAllComponents({ name: 'Checkbox' });

      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  describe('Checkbox State Management', () => {
    it('should render multi-step checkbox unchecked when value is not set', () => {
      const wrapper = shallowMount(ChatSettings, { props: { value: {} as SettingsFormData } });

      const checkbox = wrapper.findComponent({ name: 'Checkbox' });

      expect(checkbox.vm.$attrs.value).toBe(false);
    });

    it('should render multi-step checkbox checked when value is true', () => {
      const wrapper = shallowMount(ChatSettings, { props: { value: { [Settings.PLAN_ENABLED]: 'true' } as SettingsFormData } });

      const checkbox = wrapper.findComponent({ name: 'Checkbox' });

      expect(checkbox.vm.$attrs.value).toBe(true);
    });

    it('should render multi-step checkbox unchecked when value is false', () => {
      const wrapper = shallowMount(ChatSettings, { props: { value: { [Settings.PLAN_ENABLED]: 'false' } as SettingsFormData } });

      const checkbox = wrapper.findComponent({ name: 'Checkbox' });

      expect(checkbox.vm.$attrs.value).toBe(false);
    });
  });

  describe('Conditional Rendering', () => {
    it('should not render approval checkbox when multi-step is disabled', () => {
      const wrapper = shallowMount(ChatSettings, { props: { value: { [Settings.PLAN_ENABLED]: 'false' } as SettingsFormData } });

      const checkboxes = wrapper.findAllComponents({ name: 'Checkbox' });

      expect(checkboxes.length).toBe(1); // Only multi-step, not approval
    });

    it('should render approval checkbox when multi-step is enabled', () => {
      const wrapper = shallowMount(ChatSettings, { props: { value: { [Settings.PLAN_ENABLED]: 'true' } as SettingsFormData } });

      const checkboxes = wrapper.findAllComponents({ name: 'Checkbox' });

      expect(checkboxes.length).toBe(2); // Multi-step and approval
    });

    it('should not render approval checkbox with nested class when hidden', () => {
      const wrapper = shallowMount(ChatSettings, { props: { value: { [Settings.PLAN_ENABLED]: 'false' } as SettingsFormData } });

      const row = wrapper.find('div[v-if]');

      expect(row.exists()).toBe(false);
    });
  });

  describe('Event Emission', () => {
    it('should emit update:value when multi-step checkbox is toggled', async() => {
      const wrapper = shallowMount(ChatSettings, { props: { value: {} as SettingsFormData } });

      const checkbox = wrapper.findComponent({ name: 'Checkbox' });

      await checkbox.vm.$emit('update:value', true);

      expect(wrapper.emitted('update:value')).toBeTruthy();
      const emittedValue = wrapper.emitted('update:value')?.[0]?.[0] as any;

      expect(emittedValue[Settings.PLAN_ENABLED]).toBe('true');
    });

    it('should emit update:value with false string when toggling off', async() => {
      const wrapper = shallowMount(ChatSettings, { props: { value: { [Settings.PLAN_ENABLED]: 'true' } as SettingsFormData } });

      const checkbox = wrapper.findComponent({ name: 'Checkbox' });

      await checkbox.vm.$emit('update:value', false);

      expect(wrapper.emitted('update:value')).toBeTruthy();
      const emittedValue = wrapper.emitted('update:value')?.[0]?.[0] as any;

      expect(emittedValue[Settings.PLAN_ENABLED]).toBe('false');
    });

    it('should emit update:value when approval checkbox is toggled', async() => {
      const wrapper = shallowMount(ChatSettings, { props: { value: { [Settings.PLAN_ENABLED]: 'true' } as SettingsFormData } });

      const checkboxes = wrapper.findAllComponents({ name: 'Checkbox' });
      const approvalCheckbox = checkboxes[1];

      await approvalCheckbox.vm.$emit('update:value', true);

      expect(wrapper.emitted('update:value')).toBeTruthy();
      const emittedValue = wrapper.emitted('update:value')?.[0]?.[0] as any;

      expect(emittedValue[Settings.PLAN_APPROVAL_ENABLED]).toBe('true');
    });
  });

  describe('ReadOnly Mode', () => {
    it('should disable checkboxes when readOnly is true', () => {
      const wrapper = shallowMount(ChatSettings, {
        props: {
          value:    {} as SettingsFormData,
          readOnly: true,
        },
      });

      const checkboxes = wrapper.findAllComponents({ name: 'Checkbox' });

      checkboxes.forEach((checkbox) => {
        expect(checkbox.vm.$attrs.disabled).toBe(true);
      });
    });

    it('should enable checkboxes when readOnly is false', () => {
      const wrapper = shallowMount(ChatSettings, {
        props: {
          value:    {} as SettingsFormData,
          readOnly: false,
        },
      });

      const checkboxes = wrapper.findAllComponents({ name: 'Checkbox' });

      checkboxes.forEach((checkbox) => {
        expect(checkbox.vm.$attrs.disabled).toBe(false);
      });
    });
  });
});
