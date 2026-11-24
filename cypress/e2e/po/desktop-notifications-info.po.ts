import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export default class DesktopNotificationsInfoPo extends ComponentPo {
  constructor() {
    super('[data-testid="rancher-ai-ui-desktop-notifications-action-message"]');
  }

  allow() {
    return this.self().find('[data-testid="rancher-ai-ui-desktop-notifications-allow"]').click();
  }

  turnOff() {
    return this.self().find('[data-testid="rancher-ai-ui-desktop-notifications-turn-off"]').click();
  }

  settingsHint() {
    return this.self().find('[data-testid="rancher-ai-ui-desktop-notifications-settings-hint"]');
  }
}
