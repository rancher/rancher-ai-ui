/* eslint-disable no-unused-vars */

/**
 * Rancher AI schema types.
 */
export const RANCHER_AI = { AI_AGENT_CONFIG: 'ai.cattle.io.aiagentconfig' };

/**
 * Tags used in Rancher AI Chat messages.
 */

export const enum Tag {
  ChatMetadataStart = '<chat-metadata>',
  ChatMetadataEnd = '</chat-metadata>',
  AgentMetadataStart = '<agent-metadata>',
  AgentMetadataEnd = '</agent-metadata>',
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

/**
 * Types used in Rancher AI Chat UI.
 */
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

export const enum Role {
  User = 'user',
  Assistant = 'assistant',
  System = 'system',
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

export const enum ConfirmationResponse {
  Yes = 'yes',
  No = 'no',
}

export const enum MessageTag {
  Ephemeral = 'ephemeral',
  Welcome = 'welcome',
  Confirmation = 'confirmation',
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
  agentMetadata?: AgentMetadata;
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

export interface ChatMetadata {
  chatId: string;
}

export interface AgentMetadata {
  agent: Agent | null;
  selectionMode?: AgentSelectionMode; // user messages will not have this field
}

export const enum AgentSelectionMode {
  Auto = 'auto',
  Manual = 'manual',
}

export interface AIAgentConfigCRD {
  metadata: {
    name: string;
  };
  spec: {
    enabled: boolean;
    displayName: string;
    description?: string;
  }
}

export interface HistoryChat {
  id: string;
  name?: string;
  createdAt: Date;
}

export interface HistoryChatMessage {
  chatId: string;
  role: string | Role;
  agent: {
    name: string;
    mode: AgentSelectionMode;
  }
  message: string;
  context?: string;
  tags?: string[];
  confirmation?: boolean;
  createdAt: string;
}

export interface LLMConfig {
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

export interface Agent {
  name: string;
  displayName: string;
  description?: string;
}
