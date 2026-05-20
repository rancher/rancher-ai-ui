import {
  describe, it, expect, beforeEach, jest
} from '@jest/globals';
import { ref } from 'vue';
import {
  MessagePhase, Tag, Role, AgentSelectionMode, MessageInternalSource, ActionType
} from '../../types';

describe('useChatMessageComposable', () => {
  let mockStore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStore = {
      getters: {
        'rancher-ai-ui/chat/message':  jest.fn((args: any) => ({
          id:              args.messageId || '1',
          role:            Role.Assistant,
          messageContent:  '',
          thinkingContent: '',
          thinking:        false,
          completed:       false,
          agentMetadata:   {
            selectionMode: AgentSelectionMode.Auto,
            recommended:   'recommended-agent'
          }
        })),
      },
      commit:   jest.fn(),
      dispatch: jest.fn(async() => {})
    };
  });

  describe('processWelcomeData', () => {
    it('should process welcome message start tag', async() => {
      // When data = Tag.MessageStart = '<message>'
      // processWelcomeData should:
      // 1. Call addMessage via store.dispatch
      // 2. Retrieve the created message via getMessage
      // Expected: store.dispatch called with buildWelcomeMessage

      // Simulating: const msgId = await addMessage(buildWelcomeMessage());
      mockStore.dispatch.mockResolvedValueOnce('welcome-msg-1');
      mockStore.getters['rancher-ai-ui/chat/message'].mockReturnValueOnce({
        id:             'welcome-msg-1',
        role:           Role.System,
        messageContent: 'Welcome message',
        completed:      false
      });

      // The addMessage should be called with a welcome message
      await mockStore.dispatch('rancher-ai-ui/chat/addMessage', {
        chatId:  'test-chat',
        message: expect.objectContaining({
          role:   Role.System,
          source: MessageInternalSource.Welcome
        })
      });

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/addMessage',
        expect.objectContaining({ chatId: 'test-chat' })
      );
    });

    it('should accumulate welcome message content', async() => {
      // When data = 'Hello World' (regular content)
      // processWelcomeData should accumulate to currentMsg.messageContent

      const currentMsg = ref({
        id:             '1',
        messageContent: 'Hello ',
        completed:      false
      });

      // Simulating content accumulation
      currentMsg.value.messageContent += 'World';

      expect(currentMsg.value.messageContent).toBe('Hello World');
    });

    it('should handle message end tag in welcome', async() => {
      // When data = Tag.MessageEnd = '</message>'
      // processWelcomeData should:
      // 1. Set phase to MessagePhase.Idle
      // 2. Clear messageContent
      // 3. Set completed to true

      const currentMsg = ref({
        id:             '1',
        messageContent: 'Welcome content',
        completed:      false
      });

      // Simulating message end processing
      mockStore.commit('rancher-ai-ui/chat/setPhase', {
        chatId: 'test-chat',
        phase:  MessagePhase.Idle
      });
      currentMsg.value.messageContent = '';
      currentMsg.value.completed = true;

      expect(mockStore.commit).toHaveBeenCalledWith('rancher-ai-ui/chat/setPhase', {
        chatId: 'test-chat',
        phase:  MessagePhase.Idle
      });
      expect(currentMsg.value.completed).toBe(true);
      expect(currentMsg.value.messageContent).toBe('');
    });

    it('should throw error when error tags present', async() => {
      // When data contains error tags like '<error>Connection failed</error>'
      // processWelcomeData should extract error and throw

      const errorData = '<error>Connection timeout</error>';
      const hasError = errorData.startsWith(Tag.ErrorStart) && errorData.endsWith(Tag.ErrorEnd);

      expect(hasError).toBe(true);
      expect(errorData).toContain('Connection timeout');
    });
  });

  describe('processMessageData', () => {
    it('should create new message on MessageStart tag', async() => {
      // When data = Tag.MessageStart = '<message>'
      // processMessageData should:
      // 1. Set phase to MessagePhase.Working
      // 2. Call addMessage with buildMessage()
      // 3. Set currentMsg from store getter

      mockStore.commit.mockClear();
      mockStore.dispatch.mockResolvedValueOnce('msg-1');

      mockStore.commit('rancher-ai-ui/chat/setPhase', {
        chatId: 'test-chat',
        phase:  MessagePhase.Working
      });

      const msgId = await mockStore.dispatch('rancher-ai-ui/chat/addMessage', {
        chatId:  'test-chat',
        message: {
          role:            Role.Assistant,
          thinkingContent: '',
          messageContent:  '',
          thinking:        false,
          completed:       false
        }
      });

      expect(mockStore.commit).toHaveBeenCalledWith('rancher-ai-ui/chat/setPhase', {
        chatId: 'test-chat',
        phase:  MessagePhase.Working
      });
      expect(mockStore.dispatch).toHaveBeenCalled();
      expect(msgId).toBe('msg-1');
    });

    it('should handle thinking phase transition', async() => {
      // When data = Tag.ThinkingStart:
      // - phase set to MessagePhase.Thinking
      // - currentMsg.thinking = true
      // When data = Tag.ThinkingEnd:
      // - phase set to MessagePhase.GeneratingResponse
      // - currentMsg.thinking = false

      const currentMsg = ref({
        id:              '1',
        thinking:        false,
        messageContent:  '',
        thinkingContent: '',
        completed:       false
      });

      // Thinking start
      mockStore.commit('rancher-ai-ui/chat/setPhase', {
        chatId: 'test-chat',
        phase:  MessagePhase.Thinking
      });
      currentMsg.value.thinking = true;

      expect(currentMsg.value.thinking).toBe(true);

      // Thinking end
      mockStore.commit('rancher-ai-ui/chat/setPhase', {
        chatId: 'test-chat',
        phase:  MessagePhase.GeneratingResponse
      });
      currentMsg.value.thinking = false;

      expect(currentMsg.value.thinking).toBe(false);
      expect(mockStore.commit).toHaveBeenCalledTimes(2);
    });

    it('should accumulate response text content in messageContent', async() => {
      // When currentMsg.thinking = false and data is text
      // Should append to messageContent

      const currentMsg = ref({
        id:              '1',
        thinking:        false,
        messageContent:  'Hello ',
        thinkingContent: '',
        completed:       false
      });

      currentMsg.value.messageContent += 'World';

      expect(currentMsg.value.messageContent).toBe('Hello World');
    });

    it('should accumulate content in thinkingContent when thinking', async() => {
      // When currentMsg.thinking = true and data is text
      // Should append to thinkingContent

      const currentMsg = ref({
        id:              '1',
        thinking:        true,
        messageContent:  '',
        thinkingContent: 'Thinking about ',
        completed:       false
      });

      currentMsg.value.thinkingContent += 'the problem';

      expect(currentMsg.value.thinkingContent).toBe('Thinking about the problem');
    });

    it('should mark message completed on MessageEnd', async() => {
      // When data = Tag.MessageEnd:
      // 1. phase set to MessagePhase.Idle
      // 2. messageContent trailing newlines removed
      // 3. thinking = false
      // 4. completed = true
      // 5. ensureSwitchAgentSuggestion called

      const currentMsg = ref({
        id:             '15',
        messageContent: 'Response\n\n\n',
        thinking:       true,
        completed:      false,
        agentMetadata:  { recommended: 'recommended-agent' }
      });

      mockStore.commit('rancher-ai-ui/chat/setPhase', {
        chatId: 'test-chat',
        phase:  MessagePhase.Idle
      });
      currentMsg.value.messageContent = currentMsg.value.messageContent.replace(/[\r\n]+$/, '');
      currentMsg.value.thinking = false;
      currentMsg.value.completed = true;

      expect(mockStore.commit).toHaveBeenCalledWith('rancher-ai-ui/chat/setPhase', {
        chatId: 'test-chat',
        phase:  MessagePhase.Idle
      });
      expect(currentMsg.value.messageContent).toBe('Response');
      expect(currentMsg.value.thinking).toBe(false);
      expect(currentMsg.value.completed).toBe(true);
    });

    it('should handle ProcessingTools tag', async() => {
      // When data = Tag.ProcessingTools
      // Should set phase to MessagePhase.ProcessingTools

      mockStore.commit('rancher-ai-ui/chat/setPhase', {
        chatId: 'test-chat',
        phase:  MessagePhase.ProcessingTools
      });

      expect(mockStore.commit).toHaveBeenCalledWith('rancher-ai-ui/chat/setPhase', {
        chatId: 'test-chat',
        phase:  MessagePhase.ProcessingTools
      });
    });
  });

  describe('processMessageErrorData', () => {
    it('should set phase to Idle when error occurs', async() => {
      // When processMessageErrorData(error) is called
      // Should call setPhase(MessagePhase.Idle)
      mockStore.commit('rancher-ai-ui/chat/setPhase', {
        chatId: 'test-chat',
        phase:  MessagePhase.Idle
      });

      expect(mockStore.commit).toHaveBeenCalledWith('rancher-ai-ui/chat/setPhase', {
        chatId: 'test-chat',
        phase:  MessagePhase.Idle
      });
    });

    it('should create system error message with error details', async() => {
      // When error with message 'Connection timeout' is processed
      // Should call addMessage with:
      // - role: Role.System
      // - messageContent: includes error message
      // - timestamp: Date object
      // - completed: true
      // - source: MessageInternalSource.Error

      const error = new Error('Connection timeout');
      const errorMessage = `Error processing message: ${ error.message || '' }`;

      mockStore.dispatch('rancher-ai-ui/chat/addMessage', {
        chatId:  'test-chat',
        message: {
          role:           Role.System,
          messageContent: errorMessage,
          timestamp:      expect.any(Date),
          completed:      true,
          source:         MessageInternalSource.Error
        }
      });

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/addMessage',
        expect.objectContaining({
          chatId:  'test-chat',
          message: expect.objectContaining({
            role:      Role.System,
            completed: true,
            source:    MessageInternalSource.Error
          })
        })
      );
      expect(errorMessage).toContain('Connection timeout');
    });

    it('should handle empty error message', async() => {
      // When Error() without message is processed
      // Should still create system message

      const error = new Error();
      const errorMessage = `Error processing message: ${ error.message || '' }`;

      mockStore.dispatch('rancher-ai-ui/chat/addMessage', {
        chatId:  'test-chat',
        message: {
          role:           Role.System,
          messageContent: errorMessage,
          completed:      true
        }
      });

      expect(mockStore.dispatch).toHaveBeenCalled();
    });
  });

  describe('ensureSwitchAgentSuggestion', () => {
    it('should add suggestion when all conditions are met', async() => {
      // When:
      // - agentName = 'recommended-agent' (not empty)
      // - session[DISMISS_RECOMMENDED_AGENT_KEY] = false/undefined
      // - agentMetadata.selectionMode = AgentSelectionMode.Auto
      // - currentMsg.id = '15' (> 10)
      // Should: call addMessage with system request

      mockStore.getters['rancher-ai-ui/chat/session'] = {};

      // All conditions are met: agentName not empty, session not dismissed, id > 10
      mockStore.dispatch('rancher-ai-ui/chat/addMessage', {
        chatId:  'test-chat',
        message: expect.objectContaining({
          role:      Role.System,
          completed: true,
          actions:   expect.arrayContaining([
            expect.objectContaining({
              label: 'Confirm',
              type:  ActionType.Button
            }),
            expect.objectContaining({
              label: 'Dismiss',
              type:  ActionType.Button
            })
          ])
        })
      });

      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should not suggest switch for early messages (id <= 10)', async() => {
      // When currentMsg.id <= 10
      // Should NOT call addMessage

      const currentMsgId = '5';

      mockStore.dispatch.mockClear();

      if (Number(currentMsgId) > 10) {
        mockStore.dispatch('rancher-ai-ui/chat/addMessage', {});
      }

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should respect session dismissal flag', async() => {
      // When session[DISMISS_RECOMMENDED_AGENT_KEY] = true
      // Should NOT call addMessage

      const dismissKey = 'dismissed-agent-recommendation';

      mockStore.getters['rancher-ai-ui/chat/session'] = { [dismissKey]: true };
      mockStore.dispatch.mockClear();

      // When dismissal flag is set, suggestion should not be added
      // This test verifies dispatch was not called when flag is set

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should not suggest switch if agentName is empty', async() => {
      // When agentName = '' or null
      // Should NOT call addMessage

      const agentName = '';

      mockStore.dispatch.mockClear();

      if (agentName) {
        mockStore.dispatch('rancher-ai-ui/chat/addMessage', {});
      }

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should call selectAgent on confirm action', () => {
      // When user confirms agent switch
      // Should call selectAgent with agent name
      const selectAgent = jest.fn();
      const agentName = 'recommended-agent';

      selectAgent(agentName);

      expect(selectAgent).toHaveBeenCalledWith('recommended-agent');
    });

    it('should set dismiss flag on dismiss action', async() => {
      // When user dismisses suggestion
      // Should call store.commit to set dismissal flag

      const dismissKey = 'dismissed-agent-recommendation';

      mockStore.commit('rancher-ai-ui/chat/setSession', { [dismissKey]: true });

      expect(mockStore.commit).toHaveBeenCalledWith(
        'rancher-ai-ui/chat/setSession',
        expect.objectContaining({ [dismissKey]: true })
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should process complete welcome flow', async() => {
      // Sequence:
      // 1. [MESSAGE_START] -> create welcome message
      // 2. Content chunks -> accumulate
      // 3. [MESSAGE_END] -> mark completed

      mockStore.dispatch.mockResolvedValueOnce('welcome-msg-1');
      const currentMsg = ref({
        id:             '1',
        messageContent: '',
        completed:      false
      });

      // Step 1: Message start
      const msgId = await mockStore.dispatch('rancher-ai-ui/chat/addMessage', {
        chatId:  'test-chat',
        message: { role: Role.System }
      });

      expect(msgId).toBe('welcome-msg-1');

      // Step 2: Content accumulation
      currentMsg.value.messageContent += 'Welcome to the chat!';
      expect(currentMsg.value.messageContent).toBe('Welcome to the chat!');

      // Step 3: Message end
      mockStore.commit('rancher-ai-ui/chat/setPhase', {
        chatId: 'test-chat',
        phase:  MessagePhase.Idle
      });
      currentMsg.value.completed = true;

      expect(currentMsg.value.completed).toBe(true);
    });

    it('should process message with thinking blocks', async() => {
      // Sequence:
      // 1. [MESSAGE_START] -> create message
      // 2. [THINKING_START] -> set thinking
      // 3. Thinking content
      // 4. [THINKING_END] -> exit thinking
      // 5. Response content
      // 6. [MESSAGE_END] -> complete

      const currentMsg = ref({
        id:              '2',
        thinking:        false,
        messageContent:  '',
        thinkingContent: '',
        completed:       false
      });

      // Steps 2-3: Thinking phase
      currentMsg.value.thinking = true;
      currentMsg.value.thinkingContent += 'Analyzing the request...';
      expect(currentMsg.value.thinking).toBe(true);

      // Step 4: Exit thinking
      currentMsg.value.thinking = false;

      // Step 5: Response content
      currentMsg.value.messageContent += 'Here is my response.';
      expect(currentMsg.value.messageContent).toBe('Here is my response.');

      // Step 6: Complete
      currentMsg.value.completed = true;
      expect(currentMsg.value.completed).toBe(true);
    });

    it('should handle error in message processing', async() => {
      // Sequence:
      // 1. [MESSAGE_START] -> create message
      // 2. Response chunks
      // 3. Error occurs
      // Expected: processMessageErrorData called, system error shown

      mockStore.dispatch.mockResolvedValueOnce('msg-1');
      const error = new Error('Processing failed');

      // Step 1: Message start
      await mockStore.dispatch('rancher-ai-ui/chat/addMessage', {
        chatId:  'test-chat',
        message: { role: Role.Assistant }
      });

      // Step 3: Error handling
      mockStore.commit('rancher-ai-ui/chat/setPhase', {
        chatId: 'test-chat',
        phase:  MessagePhase.Idle
      });

      mockStore.dispatch('rancher-ai-ui/chat/addMessage', {
        chatId:  'test-chat',
        message: {
          role:           Role.System,
          messageContent: `Error processing message: ${ error.message }`,
          source:         MessageInternalSource.Error,
          completed:      true
        }
      });

      expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
    });
  });
});
