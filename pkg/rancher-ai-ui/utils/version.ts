import { getVersionData } from '@shell/config/version';
import packageJson from '../package.json';
import { warn } from './log';

export function getRancherVersion(): string {
  const envVersion = process.env.VUE_APP_RANCHER_VERSION; // eslint-disable-line no-undef

  // Override Rancher version for development and testing purposes
  if (envVersion) {
    return envVersion;
  }

  const rawVersion = getVersionData().Version || 'latest';

  try {
    // Remove 'v' prefix if present
    const cleanVersion = rawVersion.startsWith('v') ? rawVersion.slice(1) : rawVersion;

    // Remove any pre-release/build metadata
    // v2.15-0123456789-head => 2.15.0
    // v2.15.0-rc.1 => 2.15.0
    const match = cleanVersion.match(/^(\d+)\.(\d+)(?:\.(\d+))?/);

    if (match) {
      const major = match[1];
      const minor = match[2];
      const patch = match[3] || '0';

      return `${ major }.${ minor }.${ patch }`;
    }

    return rawVersion;
  } catch (err) {
    warn('Error parsing Rancher version:', err);

    return rawVersion;
  }
}

export const uiVersion = packageJson.version;