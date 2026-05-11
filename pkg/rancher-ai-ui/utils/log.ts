export function warn(msg: string, ...args: any[]) {
  console.warn(`[AI Assistant] ${ msg }`, ...args); // eslint-disable-line no-console
}

export function error(msg: string, ...args: any[]) {
  console.error(`[AI Assistant] ${ msg }`, ...args); // eslint-disable-line no-console
}