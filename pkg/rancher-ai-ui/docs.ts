import { docsVersion } from './utils/version';

const BASE_DOCS_URL = `https://documentation.suse.com/cloudnative/rancher-ai/${ docsVersion }/en`;

export const DOCS_LINK = {
  INTRO:       `${ BASE_DOCS_URL }/introduction.html`,
  PERMISSIONS: `${ BASE_DOCS_URL }/how-tos/how-to-admin.html#rbac`,
};