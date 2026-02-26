export const MANUAL_DISCONNECT = [1000, '__MANUAL_DISCONNECT__'] as const;

export function isManualDisconnect(event: CloseEvent): boolean {
  return event.code === MANUAL_DISCONNECT[0] && event.reason === MANUAL_DISCONNECT[1];
}