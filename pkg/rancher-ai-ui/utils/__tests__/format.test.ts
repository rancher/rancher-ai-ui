import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  formatStopMessage,
  buildMessageFromHistoryMessage,
  formatPlanning,
} from '../format';
import {
  Role, HistoryChatMessage, MessageStopType, Agent,
  AgentSelectionMode, Tag, MessageLabelKey, PlanningStopType
} from '../../types';

// Mock i18n for testing
const mockT = (key: string, args?: unknown, raw?: boolean) => { // eslint-disable-line no-unused-vars
  return key;
};

describe('formatStopMessage', () => {
  it('should parse stop message with Manual stop reason', () => {
    const data = `${ Tag.StopStart }${ JSON.stringify({ reason: MessageStopType.Manual }) }${ Tag.StopEnd }`;
    const result = formatStopMessage(data);

    expect(result).toEqual({ type: MessageStopType.Manual });
  });

  it('should return null type for missing reason', () => {
    const data = `${ Tag.StopStart }${ JSON.stringify({}) }${ Tag.StopEnd }`;
    const result = formatStopMessage(data);

    expect(result).toEqual({ type: null });
  });

  it('should handle malformed JSON gracefully', () => {
    const data = `${ Tag.StopStart }invalid json${ Tag.StopEnd }`;
    const result = formatStopMessage(data);

    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = formatStopMessage('');

    expect(result).toBeNull();
  });

  it('should handle whitespace around tags', () => {
    const data = `${ Tag.StopStart }  ${ JSON.stringify({ reason: MessageStopType.Manual }) }  ${ Tag.StopEnd }`;
    const result = formatStopMessage(data);

    expect(result).toEqual({ type: MessageStopType.Manual });
  });
});

describe('formatPlanning', () => {
  it('should parse valid planning JSON with tasks and tools', () => {
    const planningData = {
      approval:  false,
      status:    'pending',
      principal: 'user',
      tasks:     [
        {
          label:  'Create namespace',
          agent:  'rancher',
          status: 'pending',
          tools:  [{
            name:        'kubectl',
            description: 'Kubernetes CLI'
          }]
        },
        {
          label:  'Deploy application',
          agent:  'fleet',
          status: 'pending',
          tools:  [{
            name:        'helm',
            description: 'Helm package manager'
          }]
        }
      ]
    };

    const data = `${ Tag.PlanningStart }${ JSON.stringify(planningData) }${ Tag.PlanningEnd }`;
    const result = formatPlanning(data);

    expect(result).toEqual(planningData);
    expect(result?.tasks).toHaveLength(2);
    expect(result?.tasks[0].tools).toHaveLength(1);
    expect(result?.tasks[1].tools).toHaveLength(1);
  });

  it('should parse planning with no tools', () => {
    const planningData = {
      approval:  false,
      status:    'pending',
      principal: 'user',
      tasks:     [
        {
          label:  'Information gathering',
          agent:  'rancher',
          status: 'pending'
        }
      ]
    };

    const data = `${ Tag.PlanningStart }${ JSON.stringify(planningData) }${ Tag.PlanningEnd }`;
    const result = formatPlanning(data);

    expect(result).toEqual(planningData);
    expect(result?.tasks[0].tools).toBeUndefined();
  });

  it('should return null for malformed planning JSON', () => {
    const data = `${ Tag.PlanningStart }invalid json not parseable${ Tag.PlanningEnd }`;
    const result = formatPlanning(data);

    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = formatPlanning('');

    expect(result).toBeNull();
  });

  it('should handle whitespace around tags', () => {
    const planningData = {
      approval: false,
      status:   'pending',
      tasks:    []
    };

    const data = `${ Tag.PlanningStart }  ${ JSON.stringify(planningData) }  ${ Tag.PlanningEnd }`;
    const result = formatPlanning(data);

    expect(result).toEqual(planningData);
  });

  it('should parse planning with executing status', () => {
    const planningData = {
      approval:  false,
      status:    'executing',
      principal: 'user',
      tasks:     [
        {
          label:  'Deploy service',
          agent:  'rancher',
          status: 'executing',
          tools:  []
        }
      ]
    };

    const data = `${ Tag.PlanningStart }${ JSON.stringify(planningData) }${ Tag.PlanningEnd }`;
    const result = formatPlanning(data);

    expect(result?.status).toBe('executing');
    expect(result?.tasks[0].status).toBe('executing');
  });
});

describe('buildMessageFromHistoryMessage', () => {
  let mockAgents: Agent[];

  beforeEach(() => {
    mockAgents = [
      {
        name:        'test-agent',
        displayName: 'Test Agent',
        description: 'A test agent',
        status:      'active'
      }
    ];
  });

  it('should build a basic user message', () => {
    const historyMsg = {
      role:      'user',
      message:   'Hello, how are you?',
      createdAt: '2026-10-29T10:00:00Z'
    } as HistoryChatMessage;

    const result = buildMessageFromHistoryMessage(mockT, historyMsg, mockAgents);

    expect(result.role).toBe(Role.User);
    expect(result.messageContent).toBe('Hello, how are you?');
    expect(result.completed).toBe(true);
    expect(result.thinkingContent).toBe('');
  });

  it('should build an assistant message with thinking content (closed tags)', () => {
    const historyMsg = {
      role:      'agent',
      message:   `${ Tag.ThinkingStart }Let me think about this.${ Tag.ThinkingEnd }Here is my response.`,
      createdAt: '2026-10-29T10:00:00Z'
    } as HistoryChatMessage;

    const result = buildMessageFromHistoryMessage(mockT, historyMsg, mockAgents);

    expect(result.role).toBe(Role.Assistant);
    expect(result.thinkingContent).toBe('Let me think about this.');
    expect(result.messageContent).toBe('Here is my response.');
  });

  it('should handle unclosed thinking tag (stopped message)', () => {
    const historyMsg = {
      role:      'agent',
      message:   `${ Tag.ThinkingStart }I was thinking about this when...`,
      stopped:   MessageStopType.Manual,
      createdAt: '2026-10-29T10:00:00Z'
    } as HistoryChatMessage;

    const result = buildMessageFromHistoryMessage(mockT, historyMsg, mockAgents);

    expect(result.thinkingContent).toBe('I was thinking about this when...');
    expect(result.messageContent).toBe('ai.message.system.message-manual-stop.info');
    expect(result.stopType).toBe(MessageStopType.Manual);
  });

  it('should set role to System when message is manually stopped', () => {
    const historyMsg = {
      role:      'agent',
      message:   `${ Tag.ThinkingStart }Thinking${ Tag.ThinkingEnd }Response text`,
      stopped:   MessageStopType.Manual,
      createdAt: '2026-10-29T10:00:00Z'
    } as HistoryChatMessage;

    const result = buildMessageFromHistoryMessage(mockT, historyMsg, mockAgents);

    expect(result.role).toBe(Role.System);
    expect(result.messageContent).toBe('ai.message.system.message-manual-stop.info');
    expect(result.stopType).toBe(MessageStopType.Manual);
  });

  it('should extract thinking content and preserve message content after it', () => {
    const historyMsg = {
      role:    'agent',
      message: `${ Tag.ThinkingStart }Analyzing the request${ Tag.ThinkingEnd }Here's what I found:

1. First point
2. Second point`,
      createdAt: '2026-10-29T10:00:00Z'
    } as HistoryChatMessage;

    const result = buildMessageFromHistoryMessage(mockT, historyMsg, mockAgents);

    expect(result.thinkingContent).toBe('Analyzing the request');
    expect(result.messageContent).toContain('Here\'s what I found:');
    expect(result.messageContent).toContain('First point');
  });

  it('should handle multiple thinking tags (only first is extracted)', () => {
    const historyMsg = {
      role:      'agent',
      message:   `${ Tag.ThinkingStart }First thought${ Tag.ThinkingEnd }Response ${ Tag.ThinkingStart }should not be included${ Tag.ThinkingEnd }`,
      createdAt: '2026-10-29T10:00:00Z'
    } as HistoryChatMessage;

    const result = buildMessageFromHistoryMessage(mockT, historyMsg, mockAgents);

    expect(result.thinkingContent).toBe('First thought');
    expect(result.messageContent).toBe(`Response ${ Tag.ThinkingStart }should not be included${ Tag.ThinkingEnd }`);
  });

  it('should preserve agent metadata when agent is specified', () => {
    const historyMsg = {
      role:      'agent',
      message:   'Test response',
      agent:     'test-agent',
      createdAt: '2026-10-29T10:00:00Z'
    } as HistoryChatMessage;

    const result = buildMessageFromHistoryMessage(mockT, historyMsg, mockAgents);

    expect(result.agentMetadata?.agent?.name).toBe('test-agent');
    expect(result.agentMetadata?.selectionMode).toBe(AgentSelectionMode.Manual);
  });

  it('should set auto selection mode when no agent specified', () => {
    const historyMsg = {
      role:      'agent',
      message:   'Test response',
      createdAt: '2026-10-29T10:00:00Z'
    } as HistoryChatMessage;

    const result = buildMessageFromHistoryMessage(mockT, historyMsg, mockAgents);

    expect(result.agentMetadata?.agent).toBeNull();
    expect(result.agentMetadata?.selectionMode).toBe(AgentSelectionMode.Auto);
  });

  it('should include summary content from labels', () => {
    const historyMsg = {
      role:      'agent',
      message:   'Full response text',
      labels:    { [MessageLabelKey.Summary]: 'Summary of the response' },
      createdAt: '2026-10-29T10:00:00Z'
    } as HistoryChatMessage;

    const result = buildMessageFromHistoryMessage(mockT, historyMsg, mockAgents);

    expect(result.summaryContent).toBe('Summary of the response');
  });

  it('should parse context from message', () => {
    const historyMsg = {
      role:    'agent',
      message: 'Response',
      context: {
        namespace: 'default',
        resource:  'pods'
      },
      createdAt: '2026-10-29T10:00:00Z'
    } as unknown as HistoryChatMessage;

    const result = buildMessageFromHistoryMessage(mockT, historyMsg, mockAgents);

    expect(result.contextContent).toHaveLength(2);
    expect(result.contextContent).toEqual(expect.arrayContaining([
      expect.objectContaining({
        tag:   'namespace',
        value: 'default'
      }),
      expect.objectContaining({
        tag:   'resource',
        value: 'pods'
      })
    ]));
  });

  it('should handle stop during thinking (unclosed think tag)', () => {
    const historyMsg = {
      role:      'agent',
      message:   `${ Tag.ThinkingStart }Thinking about how to help...`,
      stopped:   MessageStopType.Manual,
      createdAt: '2026-10-29T10:00:00Z'
    } as HistoryChatMessage;

    const result = buildMessageFromHistoryMessage(mockT, historyMsg, mockAgents);

    expect(result.thinkingContent).toBe('Thinking about how to help...');
    expect(result.messageContent).toBe('ai.message.system.message-manual-stop.info');
    expect(result.role).toBe(Role.System);
    expect(result.stopType).toBe(MessageStopType.Manual);
  });

  it('should convert timestamp to Date object', () => {
    const createdAt = '2026-10-29T14:30:45Z';
    const historyMsg = {
      role:    'agent',
      message: 'Response',
      createdAt
    } as HistoryChatMessage;

    const result = buildMessageFromHistoryMessage(mockT, historyMsg, mockAgents);

    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.timestamp?.toISOString()).toBe('2026-10-29T14:30:45.000Z');
  });

  it('should handle thinking content with thinking tag that spans entire message', () => {
    const historyMsg = {
      role:      'agent',
      message:   `${ Tag.ThinkingStart }All thinking no response${ Tag.ThinkingEnd }`,
      createdAt: '2026-10-29T10:00:00Z'
    } as HistoryChatMessage;

    const result = buildMessageFromHistoryMessage(mockT, historyMsg, mockAgents);

    expect(result.thinkingContent).toBe('All thinking no response');
    expect(result.messageContent).toBe('');
  });

  it('should set role to System and message content for planning stop (manual)', () => {
    const historyMsg = {
      role:      'agent',
      message:   'Response text',
      stopped:   PlanningStopType.Manual,
      createdAt: '2026-10-29T10:00:00Z'
    } as HistoryChatMessage;

    const result = buildMessageFromHistoryMessage(mockT, historyMsg, mockAgents);

    expect(result.role).toBe(Role.System);
    expect(result.messageContent).toBe('ai.message.system.planning-manual-stop.info');
    expect(result.stopType).toBe(PlanningStopType.Manual);
  });

  it('should handle planning stop during planning with thinking content', () => {
    const historyMsg = {
      role:      'agent',
      message:   `${ Tag.ThinkingStart }Planning the deployment strategy...`,
      stopped:   PlanningStopType.Manual,
      createdAt: '2026-10-29T10:00:00Z'
    } as HistoryChatMessage;

    const result = buildMessageFromHistoryMessage(mockT, historyMsg, mockAgents);

    expect(result.thinkingContent).toBe('Planning the deployment strategy...');
    expect(result.messageContent).toBe('ai.message.system.planning-manual-stop.info');
    expect(result.role).toBe(Role.System);
    expect(result.stopType).toBe(PlanningStopType.Manual);
  });
});
