import { HeaderPo as DefaultHeaderPo } from '@rancher/cypress/e2e/po/components/header.po';

export default class HeaderPo extends DefaultHeaderPo {
  askLizButton(): Cypress.Chainable {
    return cy.get('[data-testid="extension-header-action-ai.action.openChat"]');
  }
}