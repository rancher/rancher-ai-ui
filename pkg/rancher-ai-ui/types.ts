/* eslint-disable no-unused-vars */

/**
 * Tags used in Rancher AI Chat messages.
 */

export const enum Tag {
  // Chat init tags
  ChatMetadataStart = '<chat-metadata>',
  ChatMetadataEnd = '</chat-metadata>',
  AgentMetadataStart = '<agent-metadata>',
  AgentMetadataEnd = '</agent-metadata>',
  // Message content tags
  MessageStart = '<message>',
  MessageEnd = '</message>',
  ThinkingStart = '<think>',
  ThinkingEnd = '</think>',
  ToolsStart = '<ui-tools>',
  ToolsEnd = '</ui-tools>',
  McpResultStart = '<mcp-response>',
  McpResultEnd = '</mcp-response>',
  ConfirmationStart = '<confirmation-response>',
  ConfirmationEnd = '</confirmation-response>',
  DocLinkStart = '<mcp-doclink>',
  DocLinkEnd = '</mcp-doclink>',
  ChatErrorStart = '<chat-error>',
  ChatErrorEnd = '</chat-error>',
  ErrorStart = '<error>',
  ErrorEnd = '</error>',
  // Processing tags
  ProcessingTools = '<processing-ui-tools/>',
}

/**
 * Types used in Rancher AI Chat UI.
 */
export interface ChatError {
  key?:     string;
  message?: string;
  action?:  MessageAction;
  sourceLinks?: SourceLinkItem[];
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
  ProcessingTools = 'processingTools',
  Confirming = 'confirming',
  Finalizing = 'finalizing',
}

export const enum ConnectionPhase {
  Idle = 'idle',
  Connecting = 'connecting',
  Reconnecting = 'reconnecting',
  Connected = 'connected',
  Disconnected = 'disconnected',
  ConnectionClosed = 'connectionClosed',
}

export const enum AIServiceState {
  NotFound = 'not-found',
  Active = 'active',
  InProgress = 'in-progress',
  Updating = 'updating'
}

export const enum ActionType {
  Link = 'link',
  Button = 'button',
}

export interface ActionResource {
  kind?: string;
  type?: string;
  name?: string;
  namespace?: string;
  cluster?: string;
  detailLocation?: object;
}

export interface ConfirmationOperationPayload {
  original: string;
  patch: PatchPayload[];
  patched: string;
};

export interface PatchPayload {
  op: string; // add, update, remove, etc.
  path: string;
  value?: any;
}

export const enum ConfirmationActionType {
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

export interface MessageAction {
  type: ActionType | string;
  label: string;
  tooltip?: string;
  description?: string;
  resource?: ActionResource;
  action?: () => MessageConfirmation;
}

export interface MessageConfirmation {
  actions?: MessageConfirmationAction[] | null;
  status: ConfirmationStatus;
  label?: string;
  icon?: string;
}

export interface MessageConfirmationAction {
  type: ConfirmationActionType | string;
  payload?: ConfirmationOperationPayload;
  resource: ActionResource;
}

export const enum MessageTemplateComponent {
  Welcome = 'welcome',
  NoPermission = 'no-permission',
  SystemSuggestion = 'system-suggestion',
}

export interface MessageTemplate {
  component: MessageTemplateComponent;
  content: MessageTemplateContent;
}

export interface MessageTemplateContent {
  principal?: any;
  message: string;
}

export const enum MessageLabelKey {
  Summary = 'summary',
}

export const enum MessageInternalSource {
  Welcome = 'welcome',
  MessageBox = 'messageBox',
  Error = 'error',
}

export type SourceLinkItem = { key?: string; label?: string; value: string; } | string;

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
  tools?: ToolCall[];
  actions?: MessageAction[];
  relatedResourcesActions?: MessageAction[];
  confirmation?: MessageConfirmation;
  sourceLinks?: SourceLinkItem[];
  timestamp?: Date;
  source?: MessageInternalSource;
}

export interface FormattedMessage extends Message {
  formattedThinkingContent?: string;
  formattedMessageContent?: string;
}

export interface ChatMetadata {
  chatId: string;
  agents: ChatAgentStatus[];
  storageType: StorageType;
}

export interface ChatAgentStatus {
  name: string;
  status?: 'active' | 'unknown' | 'error';
  description?: string;
}

export const enum AgentState {
  Active = 'active',
  Ready = 'ready',
  Unknown = 'unknown',
  Error = 'error',
}

export const enum StorageType {
  InMemory = 'in-memory',
  Postgres = 'postgres',
}

export interface AgentMetadata {
  agent: Agent | null;
  selectionMode?: AgentSelectionMode; // user messages will not have this field
  recommended?: string; // user messages will not have this field
}

export const enum AgentSelectionMode {
  Auto = 'auto',
  Manual = 'manual',
}

export interface AIAgentConfigCRD {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    enabled: boolean;
    displayName: string;
    description?: string;
    builtIn?: boolean;
    mcpURL?: string;
    authenticationType: string;
    authenticationSecret?: string;
    humanValidationTools?: string[];
    systemPrompt?: string;
    toolSet?: string;
  }
  status?: {
    conditions: {
      error: boolean;
      message?: string;
    }[];
  }
  state?: string;
  stateDescription?: string;
}

export interface ToolCall {
  toolName: string;
  input: Record<string, any>;
}

export interface ToolsConfig {
  name: string;
  tools?: string[];
}

export interface UIToolsConfigs {
  config: UIToolsConfig;
  tools: UITool[];
}

export interface UIToolsConfig {
  systemPrompt?: string;
  enabled: boolean;
  revision: number;
  maxTools?: number;
  defaultValues?: Record<string, any>;
}

export interface UITool {
  name: string;
  description: string;
  prompt: string;
  category: string;
  revision: number;
  enabled: boolean;
  metadata: Record<string, any>;
  schema: {
    properties: Record<string, any>;
  }
  defaultValues?: Record<string, any>;
}

export interface ToolActionEvent {
  type: ToolActionEventType;
  value: any;
}

export const enum ToolActionEventType {
  Select = 'select',
  Edit = 'edit',
  Confirm = 'confirm',
}

export const enum ToolsDefinitionActionType {
  Create = 'create',
  Update = 'update',
  None = 'none'
}

export interface ToolsDefinitionActionResult {
  action: ToolsDefinitionActionType;
  success: boolean;
  message?: string;
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
  labels?: Record<MessageLabelKey, string>;
  tags?: string[];
  confirmation?: boolean;
  tools?: ToolCall[];
  createdAt: string;
}

export interface AgentSettings {
  storageType: StorageType;
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
  status?: string;
}

export const enum LLMProvider {
  Local = 'ollama',
  OpenAI = 'openai',
  Gemini = 'gemini',
  Bedrock = 'bedrock',
}
