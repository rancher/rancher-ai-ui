---
# Shared fragment: Playwright + Rancher AI UI testing reference
# Import with: imports: [shared/playwright-rancher-ai.md]
---

## Playwright Quick Reference for Rancher AI UI

### Application Architecture

The Rancher AI UI is a Vue.js extension running inside the Rancher Dashboard.
It provides a **chat panel** that can be opened/closed, a **history panel**,
**multi-agent** selection, and **settings pages**.

The application is served at `https://localhost:8005` during development with
a self-signed TLS certificate.

### Authentication

Before interacting with the chat panel, you must log in to Rancher:

1. Navigate to `https://localhost:8005`
2. The login page has a password field and a "Log In" button
3. Default credentials: username `admin`, password from `CATTLE_BOOTSTRAP_PASSWORD`
4. After login you land on the Rancher Dashboard home page

### Opening the Chat Panel

The chat panel is opened via keyboard shortcut or the header button:
- Click the AI assistant button in the Rancher header, OR
- Use keyboard shortcut: `Alt+K` (Linux) or `Cmd+Shift+K` (macOS)

Wait for the element `[data-testid="rancher-ai-ui-chat-panel-ready"]` to
appear, confirming the panel has loaded.

### Known data-testid Selectors

| Selector | Element |
|----------|---------|
| `rancher-ai-ui-chat-container` | Chat panel root |
| `rancher-ai-ui-chat-panel-ready` | Panel loaded indicator |
| `rancher-ai-ui-chat-close-button` | Close chat button |
| `rancher-ai-ui-chat-history-button` | Toggle history button |
| `rancher-ai-ui-chat-console` | Console area |
| `rancher-ai-ui-chat-input-textarea` | Message input textarea |
| `rancher-ai-ui-chat-menu-button` | Header menu |
| `rancher-ai-ui-delete-chat-confirm-button` | Confirm delete in modal |
| `rancher-ai-ui-multi-agent-select` | Agent selector dropdown |

### Sending a Message

1. Ensure the chat panel is open and ready (chat-panel-ready visible)
2. Click / focus `[data-testid="rancher-ai-ui-chat-input-textarea"]`
3. Type the message text
4. Press Enter to send

### Mock LLM Responses

The LLM mock service API is available at `http://localhost:1080`.
Before sending a message, enqueue a mock response via a PUT request to
`http://localhost:1080/mockserver/expectation` with the mock response body.

### Keyboard Shortcuts

| Shortcut (Linux) | Shortcut (macOS) | Action |
|-------------------|-------------------|--------|
| Alt+K | Cmd+Shift+K | Open/Close chat panel |
| Ctrl+Shift+O | Ctrl+Shift+O | New chat |
| Ctrl+Shift+S | Ctrl+Shift+S | Toggle history panel |
| Ctrl+Shift+C | Ctrl+Shift+C | Copy last response |
| Ctrl+Shift+Backspace | Ctrl+Shift+Backspace | Delete chat |


### Video Recording (DevTools capability)

The Playwright MCP server supports video recording when started with
`--caps=devtools`. The following tools are available:

| Tool | Description |
|------|-------------|
| `browser_start_video` | Start recording (params: `filename`, `size`) |
| `browser_stop_video` | Stop recording and save the video file |
| `browser_video_chapter` | Add a chapter marker (params: `title`, `description`) |
| `browser_start_tracing` | Start a Playwright trace |
| `browser_stop_tracing` | Stop trace recording |

**Recording workflow:**
1. After login, call `browser_start_video` with filename like
   `e2e-<feature>-run.webm`
2. Before each test case, call `browser_video_chapter` with the test name
3. After all tests complete, call `browser_stop_video`

The video and session data are saved to the `--output-dir` directory.
With `--save-session`, the full session (snapshots, logs, video) is preserved.

### Tips for MCP Playwright Testing

- **Self-signed certificates**: Configure Playwright to ignore HTTPS errors
- **Headless mode**: Playwright runs Chromium headless in Docker
- **Wait for readiness**: After opening the chat, wait for
  `[data-testid="rancher-ai-ui-chat-panel-ready"]` before interacting
- **Screenshots**: Take a screenshot after each major interaction
- **Timeouts**: Use 10-30s timeouts for initial load
- **Animation delays**: Wait ~500ms after keyboard shortcuts for animations
- **Network requests**: Wait for LLM response stream to complete before asserting
- **Video recording**: Start recording after login, add chapter markers per test
