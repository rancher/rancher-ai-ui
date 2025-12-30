/* eslint-disable no-unused-vars */

export interface ChatError {
  key?:     string;
  message?: string;
  action?:  MessageAction;
}

export interface ConnectionError extends ChatError {
  code?: number;
}

export interface MessageError extends ChatError {
  code?: number;
}

export interface ConnectionParams {
  url: string;
  onopen?: (ev: Event) => any;
  onmessage?: (ev: MessageEvent) => any;
  onclose?: (ev: CloseEvent) => any;
  onerror?: (ev: Event) => any;
}

export const enum PanelState {
  Idle = 'idle',
  Loading = 'loading',
  Error = 'error',
  Ready = 'ready',
}

export const enum Tag {
  MessageStart = '<message>',
  MessageEnd = '</message>',
  ThinkingStart = '<think>',
  ThinkingEnd = '</think>',
  McpResultStart = '<mcp-response>',
  McpResultEnd = '</mcp-response>',
  ConfirmationStart = '<confirmation-response>',
  ConfirmationEnd = '</confirmation-response>',
  SuggestionsStart = '<suggestion>',
  SuggestionsEnd = '</suggestion>',
  DocLinkStart = '<mcp-doclink>',
  DocLinkEnd = '</mcp-doclink>',
  ErrorStart = '<error>',
  ErrorEnd = '</error>',
}

export const enum Role {
  User = 'user',
  Assistant = 'assistant',
  System = 'system',
}

export const enum ActionType {
  Link = 'link',
  Button = 'button',
  // Add more action types as needed
}

export interface ActionResource {
  kind?: string;
  type?: string;
  name?: string;
  namespace?: string;
  cluster?: string;
  detailLocation?: object;
}

export interface OperationPayload {
  op: string; // add, update, remove, etc.
  path: string;
  value?: any;
};

export const enum ConfirmationType {
  Patch = 'patch',
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
}

export const enum ConfirmationStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Canceled = 'canceled',
}

export interface MessageConfirmationAction {
  type: ConfirmationType | string;
  payload?: OperationPayload[];
  resource: ActionResource;
}

export interface MessageAction {
  type: ActionType | string;
  label: string;
  tooltip?: string;
  description?: string;
  resource: ActionResource;
}

export type MessageActionSuggestion = string;

export interface MessageConfirmation {
  action: MessageConfirmationAction | null;
  status: ConfirmationStatus;
}

export const enum MessageTemplateComponent {
  Welcome = 'welcome',
}

export interface MessageTemplate {
  component: MessageTemplateComponent;
  content: {
    principal: any;
    message: string;
  };
}

export interface Message {
  id?: number | string;
  role: Role;
  thinkingContent?: string;
  messageContent?: string;
  summaryContent?: string;
  contextContent?: Context[];
  templateContent?: MessageTemplate;
  thinking?: boolean;
  completed?: boolean;
  showThinking?: boolean;
  showCompleteMessage?: boolean;
  actions?: MessageAction[];
  relatedResourcesActions?: MessageAction[];
  suggestionActions?: string[];
  confirmation?: MessageConfirmation;
  sourceLinks?: string[];
  timestamp?: Date;
}

export interface FormattedMessage extends Message {
  formattedThinkingContent?: string;
  formattedMessageContent?: string;
  isError?: boolean;
}

export interface HistoryChat {
  id: string;
  chatId?: string;
  name?: string;
  active: boolean;
  createdAt: Date;
}

export interface HistoryChatMessage {
  chatId: string;
  context?: string;
  createdAt: string;
  message: string;
  requestId: string;
  role: Role;
}

export interface Agent {
  id?: string;
  name: string;
  model: string; // model + version
}

export interface Context {
  tag: string;
  value: string | object | null;
  valueLabel?: string;
  hookId?: string;
  description?: string;
  icon?: string;
}

export const enum ContextTag {
  CLUSTER   = 'cluster',
  NAMESPACE = 'namespace',
}

export const enum HookContextTag {
  SortableTableRow = '__sortable-table-row',
  DetailsState = '__details-state',
  StatusBanner = '__details-state-banner',
}

export const enum MessagePhase {
  Idle = 'idle',
  Initializing = 'initializing',
  Thinking = 'thinking',
  Working = 'working',
  Processing = 'processing',
  AwaitingConfirmation = 'awaitingConfirmation',
  GeneratingResponse = 'generatingResponse',
  Confirming = 'confirming',
  Finalizing = 'finalizing',
}

export const enum ConnectionPhase {
  Idle = 'idle',
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnected = 'disconnected'
}
