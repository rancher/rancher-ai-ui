import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import RancherHeaderPo from '@/cypress/e2e/po/components/rancher-header.po';
import { WorkLoadsPodDetailsPagePo } from '@rancher/cypress/e2e/po/pages/explorer/workloads-pods.po';
import { FleetApplicationListPagePo } from '@rancher/cypress/e2e/po/pages/fleet/fleet.cattle.io.application.po';
import { SlidingBadgePo } from '@/cypress/e2e/po/hook.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { HistoryPo } from '../../po/history.po';
import { errorPod } from '@/cypress/e2e/blueprints/pod';
import { gitRepo } from '@/cypress/e2e/blueprints/fleet';

const enum Theme {
  Dark = 'ui-dark',
  Light = 'ui-light'
}

const enum Status {
  Active = 'active',
  Modified = 'modified',
  Error = 'error',
  Paused = 'paused',
  Off = 'off'
}

type StatusColors = {
  status: Status;
  colors: {
    default: string;
    sliding: string;
  };
};

const statusByTheme: Record<Theme, StatusColors[]> = {
  [Theme.Dark]: [
    {
      status:  Status.Active,
      colors:   {
        default: 'rgba(0, 143, 64, 0.1)',
        sliding: '#213231'
      },
    },
    {
      status:  Status.Modified,
      colors:  {
        default: '#FFCC00',
        sliding: '#FFCC00'
      },
    },
    {
      status:  Status.Error,
      colors:  {
        default: '#C63434',
        sliding: '#C63434'
      }
    },
    {
      status:  Status.Paused,
      colors:  {
        default: 'rgba(31, 103, 219, 0.3)',
        sliding: '#233B63'
      }
    },
    {
      status:  Status.Off,
      colors:  {
        default: '#6C6C76',
        sliding: '#6C6C76'
      }
    }
  ],
  [Theme.Light]: [
    {
      status:  Status.Active,
      colors:  {
        default: 'rgba(0, 112, 50, 0.1)',
        sliding: '#E6F1EB'
      }
    },
    {
      status:  Status.Modified,
      colors:  {
        default: '#FFE47A',
        sliding: '#FFE47A'
      }
    },
    {
      status:  Status.Error,
      colors:  {
        default: '#B13333',
        sliding: '#B13333'
      }
    },
    {
      status:  Status.Paused,
      colors:  {
        default: 'rgba(31, 103, 219, 0.1)',
        sliding: '#E9F0FB'
      }
    },
    {
      status:  Status.Off,
      colors:  {
        default: '#6C6C76',
        sliding: '#6C6C76'
      }
    }
  ]
};

function formatColor(rgb: JQuery.PlainObject<string>): string { // eslint-disable-line no-undef
  const color = rgb as unknown as string;

  // If already in hex format, return it
  if (color.startsWith('#')) {
    return color.toUpperCase();
  }

  // Try to convert RGB to hex
  const match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

  if (match) {
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');

    return `#${ r }${ g }${ b }`.toUpperCase();
  }

  // Keep current format
  return color;
}

/**
 * Ensure that the badge's style is correct at each stage of the sliding badge's lifecycle:
 *  - Before the sliding badge is shown
 *  - While the sliding badge is shown
 *  - After the sliding badge is destroyed
 *
 * @param stateColumn the column containing the badge whose colors are to be verified
 * @param badgeBgColor the default background color of the badge
 * @param factoryBgColor the background color applied to the badge when the sliding badge is shown
 */
// eslint-disable-next-line no-undef
function verifyBadgeStyle(stateColumn: Cypress.Chainable<JQuery<HTMLElement>>, badgeBgColor: string, factoryBgColor: string) {
  stateColumn.get('.badge-state').invoke('css', 'background-color').then((bgColorBeforeSlidingBadge) => {
    // Verify the original background color
    expect(formatColor(bgColorBeforeSlidingBadge)).to.eq(badgeBgColor);

    const slidingBadge = new SlidingBadgePo(stateColumn);

    slidingBadge.showSecondStage();

    stateColumn.get('.badge-state').invoke('css', 'background-color').then((bgColorAfterSlidingBadge) => {
      // Verify the background color after the sliding badge is shown
      expect(formatColor(bgColorAfterSlidingBadge)).to.eq(factoryBgColor);

      slidingBadge.dismiss();

      // Verify that the background color is restored
      stateColumn.get('.badge-state').invoke('css', 'background-color').then((bgColorDismissedSlidingBadge) => {
        expect(formatColor(bgColorDismissedSlidingBadge)).to.eq(badgeBgColor);
      });
    });
  });
}

describe('Hooks', () => {
  const chat = new ChatPo();
  const history = new HistoryPo();

  describe('Sliding badge hook', () => {
    before(() => {
      cy.login();
      cy.createRancherResource('v1', 'pods', JSON.stringify(errorPod), false);
    });

    describe('Easter egg', () => {
      it('It should show all sliding badges in a page', () => {
        const podDetails = new WorkLoadsPodDetailsPagePo(errorPod.metadata.name);

        podDetails.goTo();
        podDetails.waitForPage();

        /**
         * Wait for the hooks to be all bound
         *
         * - 1 in the status in the Header
         * - 1 in the Details State banner
         * - 1 in the visible containers table
         * - 2 in the related resources table (hidden by active containers tab)
         */
        SlidingBadgePo.hooks().should('have.length', 5);

        // No sliding badges should be shown initially
        SlidingBadgePo.overlays().should('have.length', 0);

        RancherHeaderPo.askLizButton().trigger('mouseenter', { force: true });

        // Wait for all the sliding badges to be shown (5 - 2 hidden)
        SlidingBadgePo.overlays().should('have.length', 3);

        RancherHeaderPo.askLizButton().trigger('mouseleave', { force: true });

        // Wait for all the sliding badges to be dismissed
        SlidingBadgePo.overlays().should('have.length', 0);
      });
    });

    describe('Badge colors', () => {
      [
        Theme.Dark,
        Theme.Light
      ].forEach((theme) => {
        describe(`Theme: ${ theme }`, () => {
          before(() => {
            cy.login();

            cy.setUserPreference({ theme: `\"${ theme }\"` });
          });

          it('It should show the sliding badge with the correct colors', () => {
            cy.login();

            HomePagePo.goTo();

            // Push a mock GitRepo for each status
            const mockGitRepos = statusByTheme[theme].map(({ status: name }) => ({
              ...gitRepo,
              metadata: {
                ...gitRepo.metadata,
                name,
                state: { name },
              },
            }));

            cy.intercept('GET', '/v1/fleet.cattle.io.gitrepos?*', (req) => {
              req.continue((res) => {
                res.body.data.push(...mockGitRepos);
                res.send(res.body);
              });
            }).as('fleetGitRepos');

            const fleetAppBundlesListPage = new FleetApplicationListPagePo();

            fleetAppBundlesListPage.navTo();
            fleetAppBundlesListPage.waitForPage();

            cy.wait('@fleetGitRepos');

            statusByTheme[theme].forEach(({ status, colors }) => {
              fleetAppBundlesListPage.list().resourceTable().sortableTable().filter(status);

              SlidingBadgePo.hooks().should('have.length', 1);

              const stateColumn = fleetAppBundlesListPage.list().resourceTable().sortableTable().row(0)
                .column(1);

              verifyBadgeStyle(stateColumn, colors.default, colors.sliding);

              fleetAppBundlesListPage.list().resourceTable().sortableTable().filterComponent()
                .clear();

              SlidingBadgePo.hooks().should('have.length', 5);
            });
          });
        });
      });

      after(() => {
        cy.login();

        cy.setUserPreference({ theme: `\"${ Theme.Light }\"` });
      });
    });

    describe('Click action', () => {
      beforeEach(() => {
        cy.login();
        cy.cleanChatHistory();
      });

      it('It should activate the sliding badge from: Sortable Table row', () => {
        const homePage = new HomePagePo();

        HomePagePo.goTo();

        chat.open();

        const welcomeMessage = chat.getMessage(1);

        welcomeMessage.isCompleted();

        const homeClusterList = homePage.list();

        // Get the status column of the first row in the cluster list (local cluster)
        const statusColumn = homeClusterList.resourceTable().sortableTable().row(0).column(0);

        const slidingBadge = new SlidingBadgePo(statusColumn);

        slidingBadge.click();

        const message = chat.getMessage(2);

        message.containsText('Please analyse the Cluster "local" and troubleshoot any problems.');
        message.containsText('See More');

        const response = chat.getMessage(3);

        response.isCompleted();

        history.open();

        const chatItem = history.chatItem(0);

        chatItem.self().contains('Please analyse the Cluster "local" and troubleshoot any problems.');

        chatItem.showTooltip();

        chatItem.tooltip().containsText('Please analyse the Cluster "local" and troubleshoot any problems.');
        chatItem.tooltip().notContainsText('Explain what the "active" state means');
        chatItem.tooltip().containsText('Started on');
      });

      it('It should activate the sliding badge from: Details State banner', () => {
        const podDetails = new WorkLoadsPodDetailsPagePo(errorPod.metadata.name);

        podDetails.goTo();
        podDetails.waitForPage();

        // Remove title from pod details page to make sure the sliding badge is visible
        podDetails.self().get('.resource-name.masthead-resource-title').invoke('remove');

        chat.open();

        const welcomeMessage = chat.getMessage(1);

        welcomeMessage.isCompleted();

        const slidingBadge = new SlidingBadgePo('.title > .badge-state.bg-info');

        slidingBadge.click();

        const message = chat.getMessage(2);

        message.scrollIntoView();
        message.containsText('Please analyse the Pod "error-pod" and troubleshoot any problems.');
        message.containsText('See More');

        const response = chat.getMessage(3);

        response.isCompleted();

        history.open();

        const chatItem = history.chatItem(0);

        chatItem.self().contains('Please analyse the Pod "error-pod" and troubleshoot any problems.');

        chatItem.showTooltip();

        chatItem.tooltip().containsText('Please analyse the Pod "error-pod" and troubleshoot any problems.');
        chatItem.tooltip().notContainsText('Explain what');
        chatItem.tooltip().containsText('Started on');
      });

      it('It should activate the sliding badge from: Status banner', () => {
        const podDetails = new WorkLoadsPodDetailsPagePo(errorPod.metadata.name);

        podDetails.goTo();
        podDetails.waitForPage();

        chat.open();

        const welcomeMessage = chat.getMessage(1);

        welcomeMessage.isCompleted();

        const slidingBadge = new SlidingBadgePo('[data-testid="banner-content"]');

        slidingBadge.click();

        const message = chat.getMessage(2);

        message.scrollIntoView();
        message.containsText('Hey Liz, please analyse the "containers with unready status: [container-0]" message and troubleshoot any problems.');
        message.containsText('See More');

        const response = chat.getMessage(3);

        response.isCompleted();

        history.open();

        const chatItem = history.chatItem(0);

        chatItem.self().contains('Hey Liz, please analyse the "containers with unready status: [container-0]" message and troubleshoot any problems.');

        chatItem.showTooltip();

        chatItem.tooltip().containsText('Hey Liz, please analyse the "containers with unready status: [container-0]" message and troubleshoot any problems.');
        chatItem.tooltip().notContainsText('Explain what');
        chatItem.tooltip().containsText('Started on');
      });

      it('It should send a message from the sliding badge when the chat is closed and ready', () => {
        const homePage = new HomePagePo();

        HomePagePo.goTo();

        const homeClusterList = homePage.list();

        // Get the status column of the first row in the cluster list (local cluster)
        const statusColumn = homeClusterList.resourceTable().sortableTable().row(0).column(0);

        const slidingBadge = new SlidingBadgePo(statusColumn);

        slidingBadge.click();

        chat.isOpen();

        const message = chat.getMessage(1);

        message.scrollIntoView();
        message.containsText('Please analyse the Cluster "local" and troubleshoot any problems.');
        message.containsText('See More');

        const response = chat.getMessage(2);

        response.isCompleted();

        history.open();

        const chatItem = history.chatItem(0);

        chatItem.self().contains('Please analyse the Cluster "local" and troubleshoot any problems.');

        chatItem.showTooltip();

        chatItem.tooltip().containsText('Please analyse the Cluster "local" and troubleshoot any problems.');
        chatItem.tooltip().notContainsText('Explain what the "active" state means');
        chatItem.tooltip().containsText('Started on');
      });

      it('It should send a message from the sliding badge when the chat is closed and not ready', () => {
        const homePage = new HomePagePo();

        HomePagePo.goTo();

        cy.installRancherAIService({ waitForAIServiceReady: false });

        const homeClusterList = homePage.list();

        const statusColumn = homeClusterList.resourceTable().sortableTable().row(0).column(0);

        const slidingBadge = new SlidingBadgePo(statusColumn);

        slidingBadge.click();

        chat.isOpen();

        chat.isNotReady();
        chat.isReady(20000);

        const message = chat.getMessage(1);

        message.scrollIntoView();
        message.containsText('Please analyse the Cluster "local" and troubleshoot any problems.');
        message.containsText('See More');

        const response = chat.getMessage(2);

        response.isCompleted();
      });

      it('It should send a message from the sliding badge when the chat is open and ready', () => {
        const homePage = new HomePagePo();
        const chat = new ChatPo();

        HomePagePo.goTo();

        chat.open();

        const welcomeMessage = chat.getMessage(1);

        welcomeMessage.isCompleted();

        const homeClusterList = homePage.list();

        // Get the status column of the first row in the cluster list (local cluster)
        const statusColumn = homeClusterList.resourceTable().sortableTable().row(0).column(0);

        const slidingBadge = new SlidingBadgePo(statusColumn);

        slidingBadge.click();

        const message = chat.getMessage(2);

        message.scrollIntoView();
        message.containsText('Please analyse the Cluster "local" and troubleshoot any problems.');
        message.containsText('See More');

        const response = chat.getMessage(3);

        response.isCompleted();
      });

      it('It should not send a message from the sliding badge when the chat is already open but not ready', () => {
        const homePage = new HomePagePo();

        HomePagePo.goTo();

        chat.open();

        const welcomeMessage = chat.getMessage(1);

        welcomeMessage.isCompleted();

        cy.installRancherAIService({ waitForAIServiceReady: false });

        const homeClusterList = homePage.list();

        const statusColumn = homeClusterList.resourceTable().sortableTable().row(0).column(0);

        const slidingBadge = new SlidingBadgePo(statusColumn);

        slidingBadge.click();

        chat.isReady(20000);

        chat.getMessage(2).checkNotExists();
      });

      afterEach(() => {
        cy.cleanChatHistory();
      });
    });

    after(() => {
      cy.deleteRancherResource('v1', 'pods', `${ errorPod.metadata.namespace }/${ errorPod.metadata.name }`, false);
    });
  });
});
