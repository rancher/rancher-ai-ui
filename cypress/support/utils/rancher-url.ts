/**
 * Builds an absolute URL against the Rancher server root.
 *
 * The Cypress baseUrl points at the dashboard (e.g. `https://<host>/dashboard`), but the
 * Rancher/Steve APIs (`/v1`, `/v3`) and the local cluster's Kubernetes service-proxy
 * (`/api/v1/namespaces/.../services/.../proxy`) are served at the server root. A relative
 * request path would resolve to `/dashboard/...` and silently return the dashboard SPA HTML
 * (200) instead of hitting the API. Stripping a trailing `/dashboard` from baseUrl yields the
 * server root; in yarn-dev (baseUrl has no `/dashboard` suffix) it is a no-op, so this is safe
 * in both setups.
 *
 * @param path An absolute path beginning with `/` (e.g. `/v1/...`, `/api/v1/...`).
 */
export function rancherApiUrl(path: string): string {
  const base = (Cypress.config('baseUrl') || '').replace(/\/dashboard\/?$/, '');

  return `${ base }${ path }`;
}
