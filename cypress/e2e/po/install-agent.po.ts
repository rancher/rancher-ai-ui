import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';
import CodeMirrorPo from '@rancher/cypress/e2e/po/components/code-mirror.po';

type InstallAgentStep = 'repository' | 'agent' | 'configure' | 'apply';

type InstallAgentStepStatus = 'pending' | 'ready' | 'inProgress' | 'done' | 'error';

export class InstallAgentStepPo extends ComponentPo {
  constructor(step: InstallAgentStep) {
    super(`[data-testid="rancher-ai-ui-install-agent-step-${ step }"]`);
  }

  private withStatus(status: InstallAgentStepStatus, timeout = 10000) {
    return cy.get(`${ this.selector }.status-${ status }`, { timeout });
  }

  isPending() {
    return this.withStatus('pending').should('exist');
  }

  /**
   * A step reached and waiting for the user to start it.
   */
  isReady() {
    return this.withStatus('ready').find('.icon-chevron-right').should('be.visible');
  }

  isInProgress() {
    return this.withStatus('inProgress').find('.icon-spinner.icon-spin').should('be.visible');
  }

  isDone(timeout = 10000) {
    return this.withStatus('done', timeout).find('.icon-checkmark').should('be.visible');
  }

  isError() {
    return this.withStatus('error').find('.icon-error').should('be.visible');
  }

  /**
   * A step that can't start until the previous ones complete, showing the gray waiting icon.
   */
  isBlocked() {
    return this.self().should('have.class', 'disabled').find('.icon-spinner').should('be.visible');
  }

  isEnabled() {
    return this.self().should('not.have.class', 'disabled');
  }

  error() {
    return this.self().find('.install-agent-step-error');
  }

  link() {
    return this.self().find('a');
  }
}

// Rendered in a modal, outside of the chat panel
export class AgentValuesModalPo extends ComponentPo {
  constructor() {
    super('[data-testid="rancher-ai-ui-install-agent-values"]');
  }

  editor() {
    return CodeMirrorPo.bySelector(this.self(), '[data-testid="rancher-ai-ui-install-agent-values-editor"]');
  }

  errorBanner() {
    return this.self().find('.banner.error');
  }

  restoreButton() {
    return this.self().find('[data-testid="rancher-ai-ui-install-agent-values-restore"]');
  }

  cancelButton() {
    return this.self().find('[data-testid="rancher-ai-ui-install-agent-values-cancel"]');
  }

  installButton() {
    return this.self().find('[data-testid="rancher-ai-ui-install-agent-values-install"]');
  }
}

export default class InstallAgentPo extends ComponentPo {
  constructor() {
    super('[data-testid="rancher-ai-ui-install-agent"]');
  }

  step(step: InstallAgentStep) {
    return new InstallAgentStepPo(step);
  }

  startButton() {
    return this.self().find('[data-testid="rancher-ai-ui-install-agent-start"]');
  }

  retryButton() {
    return this.self().find('[data-testid="rancher-ai-ui-install-agent-retry"]');
  }

  editValuesButton() {
    return this.self().find('[data-testid="rancher-ai-ui-install-agent-edit-values"]');
  }

  installChartButton() {
    return this.self().find('[data-testid="rancher-ai-ui-install-agent-install-chart"]');
  }

  valuesModal() {
    return new AgentValuesModalPo();
  }

  configureButton() {
    return this.self().find('[data-testid="rancher-ai-ui-install-agent-configure"]');
  }

  reloadButton() {
    return this.self().find('[data-testid="rancher-ai-ui-install-agent-reload"]');
  }
}
