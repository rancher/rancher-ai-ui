import InstallChannel from '../channel/install';
import { InstallStep, InstallStepStatus, NotificationType } from '../../../types';

jest.mock('@shell/composables/useI18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
jest.mock('../../chat', () => ({
  __esModule: true,
  default:    {
    isOpen: jest.fn(() => false),
    open:   jest.fn(),
  }
}));

const store = { commit: jest.fn() } as any;

describe('Install notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([InstallStep.Agent, InstallStep.Configure])('should notify when the %s step waits for the user', (step) => {
    InstallChannel.send(store, {
      step,
      status: InstallStepStatus.Ready
    });

    expect(store.commit).toHaveBeenCalledWith('rancher-ai-ui/notification/addNotification', {
      type:        NotificationType.INSTALL,
      description: 'ai.notifications.install.summary.ready'
    });
  });

  it.each([InstallStep.Repository, InstallStep.Agent, InstallStep.Configure, InstallStep.Apply])('should notify when the %s step fails', (step) => {
    InstallChannel.send(store, {
      step,
      status: InstallStepStatus.Error
    });

    expect(store.commit).toHaveBeenCalledWith('rancher-ai-ui/notification/addNotification', {
      type:        NotificationType.INSTALL,
      description: 'ai.notifications.install.summary.error'
    });
  });

  it.each([InstallStepStatus.Pending, InstallStepStatus.InProgress, InstallStepStatus.Done])('should not notify a %s step', (status) => {
    InstallChannel.send(store, {
      step: InstallStep.Agent,
      status
    });

    expect(store.commit).not.toHaveBeenCalled();
  });

  it('should notify when the installation completes', () => {
    InstallChannel.send(store, {
      step:   InstallStep.Apply,
      status: InstallStepStatus.Done
    });

    expect(store.commit).toHaveBeenCalledWith('rancher-ai-ui/notification/addNotification', {
      type:        NotificationType.INSTALL,
      description: 'ai.notifications.install.summary.completed'
    });
  });

  it('should not notify the apply step when it does not fail', () => {
    InstallChannel.send(store, {
      step:   InstallStep.Apply,
      status: InstallStepStatus.Ready
    });

    expect(store.commit).not.toHaveBeenCalled();
  });

  it('should clear the install notifications', () => {
    InstallChannel.clear(store);

    expect(store.commit).toHaveBeenCalledWith('rancher-ai-ui/notification/clearNotifications', NotificationType.INSTALL);
  });
});
