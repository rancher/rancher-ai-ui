import Settings from '../pages/settings/Settings.vue';
import Staging from '../pages/Staging.vue';
import { PRODUCT_NAME } from '../product';

const routes = [
  {
    path:      `/c/:cluster/settings/${ PRODUCT_NAME }`,
    component: Settings,
    name:      `c-cluster-settings-${ PRODUCT_NAME }`
  },
  {
    path:      `/c/:cluster/:product/staging`,
    component: Staging,
    name:      `c-cluster-${ PRODUCT_NAME }-staging`
  },
];

export default routes;
