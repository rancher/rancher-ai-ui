import { NORMAN, MANAGEMENT } from '@shell/config/types';

/**
 * Convert Norman API type to Management API type to ensure they are correctly fetched
 * @param type - The Norman type (e.g., 'project', 'globalRole')
 * @returns The Management API type (e.g., 'management.cattle.io.project')
 */
export function convertTypeToManagement(type: string): string {
  const managementTypeMap: Record<string, string> = {
    [NORMAN.AUTH_CONFIG]:                   MANAGEMENT.AUTH_CONFIG,
    [NORMAN.CLUSTER]:                       MANAGEMENT.CLUSTER,
    [NORMAN.CLUSTER_ROLE_TEMPLATE_BINDING]: MANAGEMENT.CLUSTER_ROLE_TEMPLATE_BINDING,
    [NORMAN.CLOUD_CREDENTIAL]:              'management.cattle.io.cloudcredential',
    [NORMAN.GLOBAL_ROLE]:                   MANAGEMENT.GLOBAL_ROLE,
    [NORMAN.GLOBAL_ROLE_BINDING]:           MANAGEMENT.GLOBAL_ROLE_BINDING,
    [NORMAN.KONTAINER_DRIVER]:              MANAGEMENT.KONTAINER_DRIVER,
    [NORMAN.NODE]:                          MANAGEMENT.NODE,
    [NORMAN.NODE_DRIVER]:                   MANAGEMENT.NODE_DRIVER,
    [NORMAN.NODE_POOL]:                     MANAGEMENT.NODE_POOL,
    [NORMAN.PROJECT]:                       MANAGEMENT.PROJECT,
    [NORMAN.PROJECT_ROLE_TEMPLATE_BINDING]: MANAGEMENT.PROJECT_ROLE_TEMPLATE_BINDING,
    [NORMAN.ROLE_TEMPLATE]:                 MANAGEMENT.ROLE_TEMPLATE,
    [NORMAN.SETTING]:                       MANAGEMENT.SETTING,
    [NORMAN.TOKEN]:                         MANAGEMENT.TOKEN,
    [NORMAN.USER]:                          MANAGEMENT.USER,
  };

  return managementTypeMap[type] || type;
}