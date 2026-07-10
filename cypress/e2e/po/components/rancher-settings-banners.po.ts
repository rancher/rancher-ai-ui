import { BannersPagePo } from '@rancher/cypress/e2e/po/pages/global-settings/banners.po';

export default class RancherSettingsBannersPo extends BannersPagePo {
  setHeaderBanner(content = '') {
    this.headerBannerCheckbox().set();

    this.headerInput().set(content);
  }

  setFooterBanner(content = '') {
    this.footerBannerCheckbox().set();

    this.footerInput().set(content);
  }

  addBanners(args = {
    header: 'First line\nSecond line\nThird line',
    footer: 'First line\nSecond line\nThird line',
  }) {
    if (args.header) {
      this.setHeaderBanner(args.header);
    }

    if (args.footer) {
      this.setFooterBanner(args.footer);
    }

    this.applyAndWait('**/ui-banners', 200);
  }

  removeBanners() {
    this.headerBannerCheckbox().set();
    this.footerBannerCheckbox().set();

    this.applyAndWait('**/ui-banners', 200);
  }
}