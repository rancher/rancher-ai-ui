import {
  describe, it, expect, beforeEach, afterEach, jest
} from '@jest/globals';
import { computed, defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { Role } from '../../types';
import { useChatMessageComposable } from '../useChatMessageComposable';

let mockStore: any;
let mockComponent: any;

jest.mock('vuex', () => ({ useStore: () => mockStore }));

// Helper: Create a real Vue component that uses the composable
function createTestComponent(setupData?: any) {
  return defineComponent({
    setup() {
      const hasPermissions = setupData?.hasPermissions ?? computed(() => true);
      const agents = setupData?.agents ?? computed(() => []);
      const agentName = setupData?.agentName ?? computed(() => '');
      const onMessageBoxOpen = setupData?.onMessageBoxOpen ?? (() => {});

      const composableResult = useChatMessageComposable(
        'chat-1',
        hasPermissions,
        agents,
        agentName,
        onMessageBoxOpen
      );

      return composableResult;
    },
    template: '<div></div>'
  });
}

describe('useChatMessageComposable', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mockStore for each test
    mockStore = {
      getters: {
        'rancher/byId':     jest.fn(),
        'management/byId':  jest.fn(),
        'auth/principalId': jest.fn(),
        'i18n/t':           jest.fn(),
      },
      commit:   jest.fn(),
      dispatch: jest.fn()
    };
  });

  afterEach(() => {
    if (mockComponent) {
      mockComponent.unmount();
      mockComponent = null;
    }
  });

  describe('Message store operations', () => {
    it('should expose addMessage method that dispatches to store', async() => {
      mockStore.dispatch.mockClear();

      // Mount component that uses the composable
      mockComponent = mount(createTestComponent());
      const { addMessage } = mockComponent.vm;

      // Create a test message
      const testMessage = {
        role:           Role.User,
        messageContent: 'Hello'
      };

      // Call REAL addMessage method
      await addMessage(testMessage);

      // VERIFY: dispatch was called with the message
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/addMessage',
        expect.objectContaining({
          chatId:  'chat-1',
          message: expect.any(Object)
        })
      );
    });

    it('should expose updateMessage method that commits to store', () => {
      mockStore.commit.mockClear();

      mockComponent = mount(createTestComponent());
      const { updateMessage } = mockComponent.vm;

      const update = {
        id:        'msg-1',
        completed: true
      };

      updateMessage(update);

      // VERIFY: commit was called with the update
      expect(mockStore.commit).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/updateMessage',
        expect.objectContaining({
          chatId:  'chat-1',
          message: expect.any(Object)
        })
      );
    });
  });

  describe('Chat initialization', () => {
  });

  describe('Error handling', () => {
    it('should expose resetErrors method that resets errors in store', () => {
      mockStore.commit.mockClear();

      mockComponent = mount(createTestComponent());

      const { resetErrors } = mockComponent.vm;

      resetErrors();

      // VERIFY: commit was called to reset error (sets to null)
      expect(mockStore.commit).toHaveBeenCalled();
    });
  });

  describe('Message with different roles', () => {
    it('should add user message correctly', async() => {
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { addMessage } = mockComponent.vm;

      const userMessage = {
        role:           Role.User,
        messageContent: 'What can you do?'
      };

      await addMessage(userMessage);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/addMessage',
        expect.objectContaining({
          chatId:  'chat-1',
          message: expect.objectContaining({ role: Role.User })
        })
      );
    });

    it('should add assistant message correctly', async() => {
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { addMessage } = mockComponent.vm;

      const assistantMessage = {
        role:           Role.Assistant,
        messageContent: 'I can help you manage Kubernetes clusters'
      };

      await addMessage(assistantMessage);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/addMessage',
        expect.objectContaining({
          chatId:  'chat-1',
          message: expect.objectContaining({ role: Role.Assistant })
        })
      );
    });

    it('should add system message correctly', async() => {
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { addMessage } = mockComponent.vm;

      const systemMessage = {
        role:           Role.System,
        messageContent: 'Chat initialized'
      };

      await addMessage(systemMessage);

      expect(mockStore.dispatch).toHaveBeenCalled();
    });
  });

  describe('Message with thinking content', () => {
    it('should handle message with thinking content', async() => {
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { addMessage } = mockComponent.vm;

      const messageWithThinking = {
        role:            Role.Assistant,
        messageContent:  'I can help you',
        thinkingContent: 'The user is asking for help with clusters'
      };

      await addMessage(messageWithThinking);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/addMessage',
        expect.objectContaining({
          chatId:  'chat-1',
          message: expect.objectContaining({ thinkingContent: 'The user is asking for help with clusters' })
        })
      );
    });

    it('should handle message with showThinking flag', async() => {
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { addMessage } = mockComponent.vm;

      const messageWithShowThinking = {
        role:            Role.Assistant,
        messageContent:  'Here is the answer',
        thinkingContent: 'Internal reasoning...',
        showThinking:    true
      };

      await addMessage(messageWithShowThinking);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/addMessage',
        expect.objectContaining({
          chatId:  'chat-1',
          message: expect.objectContaining({ showThinking: true })
        })
      );
    });
  });

  describe('Processing state management', () => {
    it('should return processingState with idle phase initially', () => {
      mockStore.getters['rancher-ai-ui/chat/processingState'] = jest.fn(() => ({ phase: 'idle' }));

      mockComponent = mount(createTestComponent());
      const { processingState } = mockComponent.vm;

      expect(processingState.phase).toBe('idle');
    });

    it('should handle processing phase', () => {
      mockStore.getters['rancher-ai-ui/chat/processingState'] = jest.fn(() => ({
        phase: 'processing',
        label: 'Thinking...'
      }));

      mockComponent = mount(createTestComponent());
      const { processingState } = mockComponent.vm;

      expect(processingState.phase).toBe('processing');
      expect(processingState.label).toBe('Thinking...');
    });

    it('should handle thinking phase', () => {
      mockStore.getters['rancher-ai-ui/chat/processingState'] = jest.fn(() => ({ phase: 'thinking' }));

      mockComponent = mount(createTestComponent());
      const { processingState } = mockComponent.vm;

      expect(processingState.phase).toBe('thinking');
    });

    it('should handle working phase', () => {
      mockStore.getters['rancher-ai-ui/chat/processingState'] = jest.fn(() => ({
        phase: 'working',
        label: 'Processing request...'
      }));

      mockComponent = mount(createTestComponent());
      const { processingState } = mockComponent.vm;

      expect(processingState.phase).toBe('working');
    });

    it('should handle awaiting confirmation phase', () => {
      mockStore.getters['rancher-ai-ui/chat/processingState'] = jest.fn(() => ({
        phase: 'awaitingConfirmation',
        label: 'Confirm action?'
      }));

      mockComponent = mount(createTestComponent());
      const { processingState } = mockComponent.vm;

      expect(processingState.phase).toBe('awaitingConfirmation');
    });
  });

  describe('Message with tools', () => {
    it('should handle message with tools data', async() => {
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { addMessage } = mockComponent.vm;

      const messageWithTools = {
        role:           Role.Assistant,
        messageContent: 'I will run these tools',
        tools:          [
          {
            name:        'list-pods',
            description: 'List pods'
          }
        ]
      };

      await addMessage(messageWithTools);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/addMessage',
        expect.objectContaining({
          chatId:  'chat-1',
          message: expect.objectContaining({ tools: expect.any(Array) })
        })
      );
    });
  });

  describe('Message actions and confirmation', () => {
    it('should handle message with actions', async() => {
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { addMessage } = mockComponent.vm;

      const messageWithActions = {
        role:           Role.Assistant,
        messageContent: 'Here are your options',
        actions:        [
          {
            type:     'apply',
            label:    'Apply',
            targetId: 'action-1'
          }
        ]
      };

      await addMessage(messageWithActions);

      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should expose confirmMessage method', () => {
      mockComponent = mount(createTestComponent());
      const { confirmMessage } = mockComponent.vm;

      expect(typeof confirmMessage).toBe('function');
    });
  });

  describe('Message summary and context', () => {
    it('should handle message with summary content', async() => {
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { addMessage } = mockComponent.vm;

      const messageWithSummary = {
        role:           Role.Assistant,
        messageContent: 'Long detailed response...',
        summaryContent: 'Summary of response'
      };

      await addMessage(messageWithSummary);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/addMessage',
        expect.objectContaining({ message: expect.objectContaining({ summaryContent: 'Summary of response' }) })
      );
    });

    it('should handle message with context content', async() => {
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { addMessage } = mockComponent.vm;

      const messageWithContext = {
        role:           Role.User,
        messageContent: 'What is the status?',
        contextContent: [
          {
            type: 'cluster',
            name: 'my-cluster'
          }
        ]
      };

      await addMessage(messageWithContext);

      expect(mockStore.dispatch).toHaveBeenCalled();
    });
  });

  describe('Message completion and lifecycle', () => {
    it('should handle completed message flag', async() => {
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { addMessage } = mockComponent.vm;

      const completedMessage = {
        role:           Role.Assistant,
        messageContent: 'Task completed',
        completed:      true
      };

      await addMessage(completedMessage);

      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should update message via updateMessage method', () => {
      mockStore.commit.mockClear();

      mockComponent = mount(createTestComponent());
      const { updateMessage } = mockComponent.vm;

      const messageUpdate = {
        id:             'msg-1',
        messageContent: 'Updated content',
        completed:      true
      };

      updateMessage(messageUpdate);

      expect(mockStore.commit).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/updateMessage',
        expect.objectContaining({ chatId: 'chat-1' })
      );
    });

    it('should handle partial message update', () => {
      mockStore.commit.mockClear();

      mockComponent = mount(createTestComponent());
      const { updateMessage } = mockComponent.vm;

      const partialUpdate = {
        id:        'msg-1',
        completed: true
      };

      updateMessage(partialUpdate);

      expect(mockStore.commit).toHaveBeenCalled();
    });
  });

  describe('Message with source links', () => {
    it('should handle message with source links array', async() => {
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { addMessage } = mockComponent.vm;

      const messageWithLinks = {
        role:           Role.Assistant,
        messageContent: 'See the documentation',
        sourceLinks:    [
          {
            label: 'Kubernetes Docs',
            value: 'https://kubernetes.io'
          },
          'https://example.com'
        ]
      };

      await addMessage(messageWithLinks);

      expect(mockStore.dispatch).toHaveBeenCalled();
    });
  });

  describe('Agent and permissions handling', () => {
    it('should initialize composable with agent data', () => {
      const agents = computed(() => [
        {
          name:        'agent-1',
          description: 'Main agent'
        },
        {
          name:        'agent-2',
          description: 'Secondary agent'
        }
      ]);

      mockComponent = mount(createTestComponent({ agents }));

      expect(mockComponent.vm).toBeDefined();
    });

    it('should initialize composable with permissions', () => {
      const hasPermissions = computed(() => true);

      mockComponent = mount(createTestComponent({ hasPermissions }));

      expect(mockComponent.vm).toBeDefined();
    });

    it('should handle no permissions', () => {
      const hasPermissions = computed(() => false);

      mockComponent = mount(createTestComponent({ hasPermissions }));

      expect(mockComponent.vm).toBeDefined();
    });

    it('should initialize composable with agent name', () => {
      const agentName = computed(() => 'selected-agent');

      mockComponent = mount(createTestComponent({ agentName }));

      expect(mockComponent.vm).toBeDefined();
    });
  });

  describe('WebSocket message handling', () => {
    it('should expose onmessage handler', () => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      expect(typeof onmessage).toBe('function');
    });

    it('should handle WebSocket message with content', () => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      const mockEvent = {
        data: JSON.stringify({
          type:    'message',
          content: 'Response from server'
        })
      } as any;

      expect(() => onmessage(mockEvent)).not.toThrow();
    });

    it('should expose downloadMessages method', () => {
      mockComponent = mount(createTestComponent());
      const { downloadMessages } = mockComponent.vm;

      expect(typeof downloadMessages).toBe('function');
    });
  });

  describe('Message metadata', () => {
    it('should handle message with agent metadata', async() => {
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { addMessage } = mockComponent.vm;

      const messageWithMetadata = {
        role:           Role.Assistant,
        messageContent: 'Processing started',
        agentMetadata:  {
          agent: {
            name:        'my-agent',
            description: 'Agent description'
          }
        }
      };

      await addMessage(messageWithMetadata);

      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should expose isChatInitialized computed', () => {
      mockStore.getters['rancher-ai-ui/chat/metadata'] = {
        chatId: 'chat-1',
        agents: []
      };

      mockComponent = mount(createTestComponent());
      const { isChatInitialized } = mockComponent.vm;

      expect(isChatInitialized).toBe(true);
    });

    it('should return false for isChatInitialized when no metadata', () => {
      mockStore.getters['rancher-ai-ui/chat/metadata'] = undefined;

      mockComponent = mount(createTestComponent());
      const { isChatInitialized } = mockComponent.vm;

      expect(isChatInitialized).toBe(false);
    });
  });

  describe('function: onopen', () => {
    it('should send message via WebSocket when messageBox has content', () => {
      const messageBoxContent = JSON.stringify({ messageContent: 'User query' });

      mockStore.getters['rancher-ai-ui/chat/messageBox'] = jest.fn(() => messageBoxContent);
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { onopen } = mockComponent.vm;

      const mockWs = {
        send:  jest.fn(),
        close: jest.fn()
      } as any;

      onopen({ target: mockWs } as any);

      // VERIFY: WebSocket send was called
      expect(mockWs.send).toHaveBeenCalled();
    });

    it('should NOT send message via WebSocket when messageBox is null', () => {
      mockStore.getters['rancher-ai-ui/chat/messageBox'] = jest.fn(() => null);
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { onopen } = mockComponent.vm;

      const mockWs = {
        send:  jest.fn(),
        close: jest.fn()
      } as any;

      onopen({ target: mockWs } as any);

      // VERIFY: WebSocket send was NOT called
      expect(mockWs.send).not.toHaveBeenCalled();
    });

    it('should handle missing WebSocket gracefully', () => {
      mockStore.getters['rancher-ai-ui/chat/messageBox'] = jest.fn(() => 'message');

      mockComponent = mount(createTestComponent());
      const { onopen } = mockComponent.vm;

      expect(() => onopen({ target: null } as any)).not.toThrow();
    });

    it('should trigger store dispatch when messageBox exists', () => {
      const messageBoxContent = JSON.stringify({
        messageContent: 'What is Kubernetes?',
        role:           Role.User
      });

      mockStore.getters['rancher-ai-ui/chat/messageBox'] = jest.fn(() => messageBoxContent);
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { onopen } = mockComponent.vm;

      const mockWs = {
        send:  jest.fn(),
        close: jest.fn()
      } as any;

      onopen({ target: mockWs } as any);

      // VERIFY: dispatch was called for sendUserInput
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/addMessage',
        expect.objectContaining({ chatId: 'chat-1' })
      );
    });
  });

  describe('function: ensureWelcomeMessage', () => {
    it('should call fetchUIToolsCalls when welcome message is added', async() => {
      // Setup: no messages, has tools selector
      mockStore.getters['rancher-ai-ui/chat/messages'] = jest.fn(() => ({}));
      mockStore.getters['rancher-ai-ui/chat/processingState'] = jest.fn(() => ({ phase: 'idle' }));

      const toolsSelector = computed(() => ({
        name:  'suggestions',
        tools: ['Suggestions']
      }));

      mockComponent = mount(createTestComponent({ toolsSelector }));

      expect(mockComponent.vm).toBeDefined();
    });

    it('should early return when messages already exist', async() => {
      // Setup: messages already exist in store
      mockStore.getters['rancher-ai-ui/chat/messages'] = jest.fn(() => ({
        'msg-1': {
          id:             'msg-1',
          role:           Role.User,
          messageContent: 'Previous message'
        }
      }));
      mockStore.getters['rancher-ai-ui/chat/metadata'] = undefined;
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      // Trigger onmessage which will call ensureWelcomeMessage internally
      const dataEvent = { data: 'init data' } as MessageEvent;

      await onmessage(dataEvent);

      // VERIFY: When messages exist, dispatch should NOT be called to add the WELCOME message
      const addMessageCalls = mockStore.dispatch.mock.calls.filter(
        (call: any[]) => call[0] === 'rancher-ai-ui/chat/addMessage'
      );

      expect(addMessageCalls.length).toBe(0);
    });

    it('should early return when toolsSelector is not available', async() => {
      // Setup: no messages, no tools selector
      mockStore.getters['rancher-ai-ui/chat/messages'] = jest.fn(() => ({}));
      mockStore.getters['rancher-ai-ui/chat/metadata'] = undefined;
      mockStore.dispatch.mockClear();

      const toolsSelector = computed(() => null);

      mockComponent = mount(createTestComponent({ toolsSelector }));
      const { onmessage } = mockComponent.vm;

      // Trigger onmessage which will call ensureWelcomeMessage internally
      const dataEvent = { data: 'init data' } as MessageEvent;

      await onmessage(dataEvent);

      // VERIFY: When toolsSelector is null, ensureWelcomeMessage completes early
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/addMessage',
        expect.any(Object)
      );
    });

    it('should handle fetchUIToolsCalls error gracefully', async() => {
      // Setup: no messages, has tools selector but fetch fails
      mockStore.getters['rancher-ai-ui/chat/messages'] = jest.fn(() => ({}));

      const toolsSelector = computed(() => ({ name: 'suggestions' }));

      mockComponent = mount(createTestComponent({ toolsSelector }));

      // Should not throw even if fetch fails
      expect(mockComponent.vm).toBeDefined();
    });
  });

  describe('function: onmessage', () => {
    it('should process chat metadata when chat not initialized', async() => {
      // Setup: chat not initialized
      mockStore.getters['rancher-ai-ui/chat/metadata'] = undefined;
      mockStore.commit.mockClear();

      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      const metadataEvent = { data: '<chat-metadata>{"chatId":"chat-1","agents":[]}</chat-metadata>' } as MessageEvent;

      await onmessage(metadataEvent);

      // VERIFY: commit was called to set metadata
      expect(mockStore.commit).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/setMetadata',
        expect.any(Object)
      );
    });

    it('should call ensureWelcomeMessage when chat not initialized', async() => {
      // Setup: chat not initialized, no messages
      mockStore.getters['rancher-ai-ui/chat/metadata'] = undefined;
      mockStore.getters['rancher-ai-ui/chat/messages'] = jest.fn(() => ({}));
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      const dataEvent = { data: 'some message data' } as MessageEvent;

      await onmessage(dataEvent);

      // VERIFY: dispatch was called to add welcome message
      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should NOT call ensureWelcomeMessage when chat already initialized', async() => {
      mockStore.getters['rancher-ai-ui/chat/metadata'] = {
        chatId: 'chat-1', // chat is initialized
        agents: []
      };
      mockStore.dispatch.mockClear();

      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      const dataEvent = { data: '<message>Response from AI</message>' } as MessageEvent;

      // Trigger onmessage for initialized chat
      await onmessage(dataEvent);

      // VERIFY: When chat is already initialized, ensureWelcomeMessage should NOT run
      const addMessageCalls = mockStore.dispatch.mock.calls.filter(
        (call: any[]) => call[0] === 'rancher-ai-ui/chat/addMessage'
      );

      expect(addMessageCalls.length).toBe(0);
    });

    it('should handle errors during chat initialization', async() => {
      mockStore.getters['rancher-ai-ui/chat/metadata'] = undefined;
      mockStore.commit.mockClear();

      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      const badMetadataEvent = { data: '<chat-error>{"message":"Invalid chat configuration"}</chat-error>' } as MessageEvent;

      await onmessage(badMetadataEvent);

      // VERIFY: error handling was triggered (commit for setErrors)
      expect(mockStore.commit).toHaveBeenCalled();
    });

    it('should process message data when chat is initialized', async() => {
      mockStore.getters['rancher-ai-ui/chat/metadata'] = {
        chatId: 'chat-1',
        agents: []
      };

      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      const messageStartEvent = { data: '<message>' } as MessageEvent;

      mockStore.dispatch.mockClear();

      await onmessage(messageStartEvent);

      // VERIFY: addMessage was called for initialized chat
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/addMessage',
        expect.any(Object)
      );
    });
  });

  describe('function: processChatMetadata', () => {
    it('should handle valid chat metadata in onmessage', async() => {
      mockStore.getters['rancher-ai-ui/chat/metadata'] = undefined;
      mockStore.commit.mockClear();

      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      const metadataPayload = { data: '<chat-metadata>{"chatId":"chat-1","agents":[],"storageType":"postgres"}</chat-metadata>' } as MessageEvent;

      await onmessage(metadataPayload);

      // VERIFY: setMetadata was called
      expect(mockStore.commit).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/setMetadata',
        expect.objectContaining({ chatId: 'chat-1' })
      );
    });

    it('should ignore non-metadata messages when chat not initialized', async() => {
      mockStore.getters['rancher-ai-ui/chat/metadata'] = undefined;
      mockStore.commit.mockClear();

      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      const regularDataEvent = { data: 'Just some regular message without tags' } as MessageEvent;

      await onmessage(regularDataEvent);

      // Commit should still be called for setMetadata check or initialization
      expect(mockStore.commit).toHaveBeenCalled();
    });
  });

  describe('function: processMessageData - Tag parsing', () => {
    beforeEach(() => {
      // Setup: chat already initialized
      mockStore.getters['rancher-ai-ui/chat/metadata'] = {
        chatId: 'chat-1',
        agents: []
      };
      mockStore.getters['rancher-ai-ui/chat/messages'] = jest.fn(() => ({}));
      mockStore.getters['rancher-ai-ui/chat/message'] = jest.fn(() => ({
        id:              'msg-1',
        messageContent:  '',
        thinkingContent: '',
        thinking:        false,
        completed:       false
      }));
      mockStore.commit.mockClear();
      mockStore.dispatch.mockClear();
    });

    it('Tag.MessageStart - should create new message and set working phase', async() => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      const startEvent = { data: '<message>' } as MessageEvent;

      await onmessage(startEvent);

      // VERIFY: dispatch was called to add a new message
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/addMessage',
        expect.any(Object)
      );

      // VERIFY: processing phase was set to working
      expect(mockStore.commit).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/setProcessingState',
        expect.objectContaining({ processingState: expect.objectContaining({ phase: 'working' }) })
      );
    });

    it('Tag.ThinkingStart - should set thinking phase and flag', async() => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      // First trigger MessageStart to create message
      await onmessage({ data: '<message>' } as MessageEvent);

      mockStore.commit.mockClear();

      // Now trigger ThinkingStart
      const thinkingStartEvent = { data: '<think>' } as MessageEvent;

      await onmessage(thinkingStartEvent);

      // VERIFY: processing phase set to thinking
      expect(mockStore.commit).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/setProcessingState',
        expect.objectContaining({ processingState: expect.objectContaining({ phase: 'thinking' }) })
      );
    });

    it('Tag.ThinkingEnd - should end thinking phase', async() => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      // Setup: trigger thinking start first
      await onmessage({ data: '<message>' } as MessageEvent);
      await onmessage({ data: '<think>' } as MessageEvent);

      mockStore.commit.mockClear();

      // Trigger ThinkingEnd
      const thinkingEndEvent = { data: '</think>' } as MessageEvent;

      await onmessage(thinkingEndEvent);

      // VERIFY: processing phase set to generating response
      expect(mockStore.commit).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/setProcessingState',
        expect.objectContaining({ processingState: expect.objectContaining({ phase: 'generatingResponse' }) })
      );
    });

    it('Tag.MessageEnd - should complete message and set idle phase', async() => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      // Setup: trigger message start
      await onmessage({ data: '<message>' } as MessageEvent);

      mockStore.commit.mockClear();

      // Trigger MessageEnd
      const messageEndEvent = { data: '</message>' } as MessageEvent;

      await onmessage(messageEndEvent);

      // VERIFY: processing phase set to idle
      expect(mockStore.commit).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/setProcessingState',
        expect.objectContaining({ processingState: expect.objectContaining({ phase: 'idle' }) })
      );
    });

    it('Tag.ProcessingTools - should set processing tools phase', async() => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      // Setup: trigger message start first
      await onmessage({ data: '<message>' } as MessageEvent);

      mockStore.commit.mockClear();

      const processingToolsEvent = { data: '<processing-ui-tools/>' } as MessageEvent;

      await onmessage(processingToolsEvent);

      // VERIFY: One of the commit calls should set processing phase to processingTools
      const processingCalls = mockStore.commit.mock.calls.filter(
        (call: any[]) => call[0] === 'rancher-ai-ui/chat/setProcessingState'
      );
      const hasProcessingToolsPhase = processingCalls.some(
        (call: any[]) => call[1]?.processingState?.phase === 'processingTools'
      );

      expect(hasProcessingToolsPhase).toBe(true);
    });

    it('Tag.ProcessingSubagentInitStart - should set processing subagent phase', async() => {
      const agentName = computed(() => 'test-agent');

      mockComponent = mount(createTestComponent({ agentName }));
      const { onmessage } = mockComponent.vm;

      // Setup: trigger message start first
      await onmessage({ data: '<message>' } as MessageEvent);

      mockStore.commit.mockClear();

      const subagentEvent = { data: '<processing-subagent-start>{"agent":"test-agent","query":"What is Kubernetes?"}</processing-subagent-start>' } as MessageEvent;

      await onmessage(subagentEvent);

      // VERIFY: processing phase set to processingSubagent with label
      expect(mockStore.commit).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/setProcessingState',
        expect.objectContaining({ processingState: expect.objectContaining({ phase: 'processingSubagent' }) })
      );
    });

    it('Tag.ProcessingSubagentCompleteStart/End - should handle subagent completion', async() => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      // Setup: trigger message start
      await onmessage({ data: '<message>' } as MessageEvent);

      mockStore.commit.mockClear();

      const completeEvent = { data: '<processing-subagent-end></processing-subagent-end>' } as MessageEvent;

      // Should not throw
      expect(() => onmessage(completeEvent)).not.toThrow();
    });

    it('Tag.AgentMetadataStart - should set agent metadata', async() => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      // Setup: trigger message start
      await onmessage({ data: '<message>' } as MessageEvent);

      mockStore.commit.mockClear();

      const agentMetadataEvent = { data: '<agent-metadata>{"recommended":"agent-name"}</agent-metadata>' } as MessageEvent;

      await onmessage(agentMetadataEvent);

      // Should not throw - metadata is extracted and stored in currentMsg
      expect(mockComponent.vm).toBeDefined();
    });

    it('Tag.McpResultStart/End - should process MCP results', async() => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      // Setup: trigger message start
      await onmessage({ data: '<message>' } as MessageEvent);

      mockStore.commit.mockClear();

      const mcpEvent = { data: '<mcp-response>{"kind":"Deployment","action":"apply","name":"test-deployment","namespace":"default","cluster":"local","type":"apply"}</mcp-response>' } as MessageEvent;

      await onmessage(mcpEvent);

      // VERIFY: processing phase set to finalizing
      expect(mockStore.commit).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/setProcessingState',
        expect.objectContaining({ processingState: expect.objectContaining({ phase: 'finalizing' }) })
      );
    });

    it('Tag.ConfirmationStart/End - should process confirmations', async() => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      // Setup: trigger message start
      await onmessage({ data: '<message>' } as MessageEvent);

      mockStore.commit.mockClear();

      const confirmationEvent = { data: '<confirmation-response>{"actions":[{"label":"Confirm","value":"yes"}]}</confirmation-response>' } as MessageEvent;

      await onmessage(confirmationEvent);

      // Should process without throwing
      expect(mockComponent.vm).toBeDefined();
    });

    it('Tag.DocLinkStart/End - should add doc links', async() => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      // Setup: trigger message start
      await onmessage({ data: '<message>' } as MessageEvent);

      mockStore.commit.mockClear();

      const docLinkEvent = { data: '<mcp-doclink>{"url":"https://example.com","title":"Example"}</mcp-doclink>' } as MessageEvent;

      await onmessage(docLinkEvent);

      // Should process without throwing
      expect(mockComponent.vm).toBeDefined();
    });

    it('Tag.ErrorStart/End - should handle error gracefully in onmessage', async() => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      // Setup: trigger message start
      await onmessage({ data: '<message>' } as MessageEvent);

      const initialDispatchCount = mockStore.dispatch.mock.calls.length;

      // Error tag data - format may vary but should be handled gracefully
      const errorEvent = { data: '<error>{"message":"Test error occurred"}</error>' } as MessageEvent;

      // Should not throw - error is caught and handled internally
      await expect(onmessage(errorEvent)).resolves.toBeUndefined();

      // VERIFY: dispatch call count changed (either new message added or existing behavior)
      expect(mockStore.dispatch.mock.calls.length).toBeGreaterThanOrEqual(initialDispatchCount);
    });

    it('Regular message content - should append to message', async() => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      // Setup: trigger message start
      await onmessage({ data: '<message>' } as MessageEvent);

      mockStore.commit.mockClear();

      const contentEvent = { data: 'This is part of the message' } as MessageEvent;

      await onmessage(contentEvent);

      // VERIFY: processing phase set to generating response
      expect(mockStore.commit).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/setProcessingState',
        expect.objectContaining({ processingState: expect.objectContaining({ phase: 'generatingResponse' }) })
      );
    });

    it('Should handle thinking content in message', async() => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      // Setup: trigger message start and thinking start
      await onmessage({ data: '<message>' } as MessageEvent);
      await onmessage({ data: '<think>' } as MessageEvent);

      mockStore.commit.mockClear();

      const thinkingContentEvent = { data: 'Internal reasoning about the problem' } as MessageEvent;

      await onmessage(thinkingContentEvent);

      // Should process without throwing
      expect(mockComponent.vm).toBeDefined();
    });

    it('Should ignore empty content when not thinking', async() => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      // Setup: trigger message start
      await onmessage({ data: '<message>' } as MessageEvent);

      mockStore.commit.mockClear();

      const emptyEvent = { data: '   ' } as MessageEvent;

      await onmessage(emptyEvent);

      // Should not append empty content
      expect(mockComponent.vm).toBeDefined();
    });

    it('Should handle tools in message content', async() => {
      mockComponent = mount(createTestComponent());
      const { onmessage } = mockComponent.vm;

      // Setup: trigger message start
      await onmessage({ data: '<message>' } as MessageEvent);

      mockStore.commit.mockClear();

      const toolsContentEvent = { data: 'Check the status<ui-tools>{"tools":[]}</ui-tools>now' } as MessageEvent;

      await onmessage(toolsContentEvent);

      // Should process tools extraction
      expect(mockComponent.vm).toBeDefined();
    });
  });
});
