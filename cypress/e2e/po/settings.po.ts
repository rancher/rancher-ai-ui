import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';
import PagePo from '@rancher/cypress/e2e/po/pages/page.po';
import { ToggleGroupPo } from './components/toggle-group.po';
import TabbedPo from './components/tabbed.po';
import CheckboxInputPo from '@rancher/cypress/e2e/po/components/checkbox-input.po';
import LabeledInputPo from '@rancher/cypress/e2e/po/components/labeled-input.po';

export class SettingsPagePo extends PagePo {
  private static createPath() {
    return `/c/local/settings/rancher-ai-ui`;
  }

  constructor() {
    super(SettingsPagePo.createPath());
  }

  settings() {
    return new SettingsPo(this.self());
  }
}

export class SettingsPo extends ComponentPo {
  constructor(self: Cypress.Chainable) {
    super('[data-testid="rancher-ai-ui-settings-container"]', self);
  }

  aiAgentSettings() {
    return new AiAgentSettings(this.self());
  }

  aiAgentConfigs() {
    return new AiAgentConfigs(this.self());
  }

  uiToolsConfig() {
    return new UiToolsConfig(this.self());
  }

  saveButton() {
    return this.self().get('[data-testid="rancher-ai-ui-settings-save-button"]');
  }
}

export class AiAgentSettings extends ComponentPo {
  constructor(self: Cypress.Chainable) {
    super('[data-testid="rancher-ai-ui-settings-ai-agent-settings"]', self);
  }

  llm(llmName: string) {
    return new ToggleGroupPo().toggleOption(llmName);
  }

  apiKeyInput() {
    return this.self().get('[data-testid="rancher-ai-ui-settings-llm-api-key-input"]').find('input');
  }
}

export class AiAgentConfigs extends ComponentPo {
  constructor(self: Cypress.Chainable) {
    super('[data-testid="rancher-ai-ui-settings-ai-agent-configs"]', self);
  }

  tabs() {
    return new TabbedPo('[data-testid="tabbed-block"]');
  }

  enableAgent() {
    return CheckboxInputPo.byLabel(this.self(), 'Enable this agent');
  }

  mcpUrlInput() {
    return LabeledInputPo.byLabel(this.self(), 'Endpoint');
  }

  descriptionInput() {
    return cy.get('textarea[data-testid="rancher-ai-ui-settings-ai-agent-configs-description"]').first();
  }

  guidelinesInput() {
    return cy.get('textarea[data-testid="rancher-ai-ui-settings-ai-agent-configs-system-prompt"]').first();
  }
}

export class UiToolsConfig extends ComponentPo {
  constructor(self: Cypress.Chainable) {
    super('[data-testid="rancher-ai-ui-settings-tools"]', self);
  }

  intro() {
    return new UiToolsConfigIntro(this.self());
  }
}

class UiToolsConfigIntro extends ComponentPo {
  constructor(self: Cypress.Chainable) {
    super('[data-testid="rancher-ai-ui-tools-config-intro"]', self);
  }

  infoBanner() {
    return this.self().find('[data-testid="rancher-ai-ui-tools-config-info-banner"]');
  }

  actionButton() {
    return this.self().get('[data-testid="rancher-ai-ui-tools-config-action-button"]');
  }
}