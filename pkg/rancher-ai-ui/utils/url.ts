import { warn } from '../utils/log';

export function validateUrl(value = ''): boolean {
  if (!value || typeof value !== 'string') {
    warn('URL must be a non-empty string');

    return false;
  }

  try {
    const url = new URL(value);

    // Only allow HTTPS
    if (url.protocol !== 'https:') {
      warn('URL must use HTTPS protocol');

      return false;
    }

    // Ensure hostname exists and is valid
    if (!url.hostname || url.hostname.length === 0) {
      warn('URL must have a valid hostname');

      return false;
    }

    return true;
  } catch (err) {
    warn('Invalid URL format:', err);
  }

  return false;
}
