/**
 * Check if an icon exists in the current font by testing its computed CSS style
 * @param iconName - Icon class name that exists in the extension's icon shell
 * @param fallbackIcon - Fallback icon that exists in both extension and Rancher shell
 * @returns Icon class string
 */
export function getIconWithFallback(iconName: string, fallbackIcon: string): string {
  if (typeof document === 'undefined') {
    return fallbackIcon;
  }

  const testEl = document.createElement('i');

  testEl.className = `icon ${ iconName }`;
  testEl.style.display = 'none';
  document.body.appendChild(testEl);

  const computed = window.getComputedStyle(testEl, ':before');
  const content = computed.content;

  document.body.removeChild(testEl);

  // If content is empty, "none", or "normal", icon doesn't exist
  const iconExists = content && content !== 'none' && content !== 'normal' && content !== '""';

  return iconExists ? iconName : fallbackIcon;
}
