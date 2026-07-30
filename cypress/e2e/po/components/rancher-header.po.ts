import { HeaderPo } from '@rancher/cypress/e2e/po/components/header.po';

export default class RancherHeaderPo extends HeaderPo {
  static askLizButton(): Cypress.Chainable {
    return cy.get('[data-testid="extension-header-action-ai.action.openChat"]');
  }
}