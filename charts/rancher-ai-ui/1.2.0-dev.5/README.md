# SUSE AI Assistant

**Provides context-aware guidance and automated troubleshooting for complex cluster workloads.**

### Overview
The SUSE AI Assistant is your dedicated AI Site Reliability Engineer. Unlike generic chatbots, Liz is built with deep "platform-context," meaning she has real-time access to your cluster state, logs, and events, allowing her to provide tailored advice that generic AI simply cannot.

Documentation for SUSE AI Assistant can be found [**here**](https://documentation.suse.com/cloudnative/rancher-ai/latest/en/introduction.html).

### Core Architecture
Liz utilizes a **Multi-Agent AI** architecture. When you ask a question, different "specialist" agents (one for Security, one for Networking, one for Diagnostics) collaborate to provide a verified answer. It supports the Model Context Protocol (MCP) to pull in data from your specific Rancher environment securely.

### Key Technical Features
* **Context-Aware Troubleshooting**: Ask "Why is the checkout-service failing?" and Liz will analyze pod logs, events, and resource limits to provide a specific diagnosis.
* **"Ask Liz" UI Integration**: Find Liz icons embedded throughout the Rancher UI (e.g., next to error messages) for instant, one-click troubleshooting of specific resources.
* **Privacy-First Operations**: Supports integration with local, air-gapped Large Language Models (via Ollama) to ensure that your cluster data never leaves your infrastructure.
* **YAML & CLI Generation**: Ask Liz to "Create a network policy to block traffic from namespace A to B," and receive a ready-to-apply manifest formatted to best practices.

### Target Use Cases
* **On-Call Assistance**: Rapidly diagnosing production issues during high-pressure incidents by summarizing complex log data.
* **Skill Leveling**: Helping junior engineers navigate the complexities of Kubernetes without leaving the Rancher Dashboard.

### Deployment Path
* **Prerequisites**:
  - Rancher Prime subscription; API key for an LLM provider (OpenAI, Gemini, or a local Ollama instance).
  - The AI Assistant chart must be installed. GitHub repository: [https://github.com/rancher/ai-assistant](https://github.com/rancher/rancher-ai-agent).
* **First Step**: After installation, configure the AI Assistant with your API key and preferred model in the **AI Assistant** settings page (Global Settings -> AI Assistant).
* **Next Step**: Click the **SUSE AI Assistant** icon in the sidebar to start a conversation.