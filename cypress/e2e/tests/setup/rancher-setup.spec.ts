import { RancherSetupLoginPagePo } from '@rancher/cypress/e2e/po/pages/rancher-setup-login.po';
import { RancherSetupConfigurePage } from '@rancher/cypress/e2e/po/pages/rancher-setup-configure.po';
import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

describe('Rancher setup', () => {
  const rancherSetupLoginPage = new RancherSetupLoginPagePo();
  const rancherSetupConfigurePage = new RancherSetupConfigurePage();
  const homePage = new HomePagePo();

  it('First login & Configure', () => {
    cy.intercept('POST', '/v1-public/login').as('bootstrapReq');

    rancherSetupLoginPage.goTo();
    rancherSetupLoginPage.waitForPage();
    rancherSetupLoginPage.bootstrapLogin();

    cy.wait('@bootstrapReq').then((login) => {
      expect(login.response?.statusCode).to.equal(200);
      rancherSetupConfigurePage.waitForPage();
    });

    cy.intercept('PUT', '/v1/userpreferences/*').as('firstLoginReq');

    rancherSetupConfigurePage.waitForPage();
    rancherSetupConfigurePage.canSubmit().should('eq', false);

    rancherSetupConfigurePage.termsAgreement().set();
    rancherSetupConfigurePage.canSubmit().should('eq', true);
    rancherSetupConfigurePage.submit();

    cy.location('pathname', { timeout: 15000 }).should('include', '/home');

    cy.wait('@firstLoginReq').then((login) => {
      expect(login.response?.statusCode).to.equal(200);
      homePage.waitForPage();
    });
  });
});
