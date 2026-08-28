# DEVS - TODO

> What's done, what's next, and what's on the horizon.

_Last updated: April 2026_

## Legend

- **Done** — Shipped and stable
- **In Progress** — Actively being developed
- **Planned** — Scoped and scheduled
- **Future** — Intended but not yet scoped

---

## Core Platform

### Done
- [x] Browser-native PWA — no backend dependency
- [x] Offline support after initial load
- [x] Service Worker for background processing and caching
- [x] Docker deployment (~60 MB image)
- [x] Multi-language UI (EN, FR, DE, ES, AR, KO)
- [x] RTL language support
- [x] Global search across all entity types (Cmd/Ctrl+K)
- [x] Mobile-first responsive design
- [x] V2 unified shell with thread abstraction

### In Progress
- [ ] HeroUI v2 → v3 migration (v3 beta installed, gradual rollout)
- [ ] Accessibility audit (keyboard nav exists, screen reader gaps remain)

### Planned
- [ ] PWA install prompt improvements
- [ ] Prerendering for SEO on static pages
- [ ] Assign `devs.new` custom domain to the latest AgentAsia Vercel deployment after SSL certificate provisioning; currently domain serves older DEVS build

---

## AI & LLM

### Done
- [x] 12+ LLM providers with unified interface (BYOK)
- [x] OpenAI, Anthropic, Google, Mistral, OpenRouter, HuggingFace, Ollama, LM Studio
- [x] Streaming and non-streaming chat
- [x] Tool calling (OpenAI function-calling format)
- [x] Multimodal attachments (image, document, text)
- [x] Anthropic extended thinking support
- [x] Google Gemini thinking support
- [x] Web search grounding (Google, Anthropic)
- [x] LLM response caching
- [x] Provider-level API key validation

### In Progress
- [ ] Local in-browser inference via WebGPU (HuggingFace Transformers.js integrated)
- [ ] Provider switching mid-run during orchestration

### Planned
- [ ] Model performance benchmarking dashboard
- [ ] Automatic provider fallback on failure
- [ ] Cost-aware model routing (prefer cheaper models for simple subtasks)

---

## Agent System

### Done
- [x] AI Studio — create, edit, configure custom agents
- [x] Agent roles, instructions, temperature, tags
- [x] Agent knowledge base attachment
- [x] Agent tools assignment
- [x] Agent memory with LLM-powered extraction
- [x] Memory human review workflow (approve/reject/edit)
- [x] Memory categories (facts, preferences, behaviors, domain, procedures, corrections)
- [x] Memory confidence levels and relevance scoring
- [x] Memory context injection into conversations
- [x] Agent portraits (AI-generated)
- [x] Built-in agent library (JSON-defined)
- [x] Agent slug-based routing

### In Progress
- [ ] Agent skills system (installable capability bundles)
- [ ] AgentAsia hosted mode routing: Auto → Chat/Code/Agent capability selection
- [ ] Freemium fallback health, 429 handling, and daily aggregate email audit
- [x] First-run language chooser for anonymous/new users with synced preferred language
- [x] Add Portuguese and Polish to UI language options
- [ ] Integrate language route policy into hosted Freemium gateway: common-language lane vs `freemium-language` Qwen/translation bridge for extended languages
- [x] Create Qwen 3.8 / AgentAsia handover document with paths, modes, language policy, laptop controls, and finish checklist
- [ ] Update Google LiteLLM spreadsheet language-capability row after column confirmation
- [ ] BYOK connection testing for MeshLLM/Petals/GPU Mesh

### Planned
- [ ] Agent capability discovery (auto-detect what an agent can do)
- [ ] Agent performance analytics (success rates, cost per task)

### Future
- [ ] Hyper meta-prompting — multi-layered adaptive prompt generation
- [ ] Agent personality evolution over time

---

## Orchestration

### Done
- [x] Task analyzer with LLM-powered complexity assessment
- [x] Single-agent strategy (Tier 0)
- [x] Multi-agent team strategy (Tier 1+)
- [x] Task decomposition with dependency resolution
- [x] Parallel batch execution
- [x] Result synthesis across subtasks
- [x] Background queue with priority scheduling
- [x] Leader-elected scheduler (one tab owns the queue)
- [x] Orchestration event system (start, streaming, tool-call, complete)
- [x] Deduplication prevention (prompt hashing)
- [x] Orphaned workflow detection and recovery
- [x] Methodology templates (8D, A3, Agile, AOSTC, DMAIC, PDCA, Scrum, YOLO)

### In Progress
- [ ] Approval gates for human-in-the-loop checkpoints
- [ ] Requirement validation engine integration

### Planned
- [ ] Dynamic team formation — auto-recruit purpose-built agents per task
- [ ] Cross-task learning — orchestrator improves strategy selection over time
- [ ] Orchestration replay — re-run a workflow with different parameters

### Future
- [ ] Bonsai Ternary 27B + DSpark v7 integration; benchmark/package after AgentAsia core is tested  
- [ ] Do not start Lillypad until AgentAsia is verified 100%
- [ ] Lillypad integration for future n0-token compute phase
- [x] Fix Casey desktop LLM Off control remotely: disable relaunch tasks, stop Llama/Qwen/Bonsai processes, and verify GPU-release state
- [x] Test LLM On→Off when the gaming laptop is not being used for a game; verify Bonsai Ternary vision/DSpark and Llama/Qwen launch/stop while LiteLLM remains on
- [ ] Repeat On test during a safe maintenance window with a real chat/vision/DSpark request
- [ ] Maintain desktop connect-to-gaming-laptop instructions outside the browser-only devs.new app
- [ ] Windows LLM on/off control and desktop connect-to-gaming-laptop actions
- [ ] Heartbeat and scheduled task workers
- [ ] Daily aggregate provider audit email to redacted@users.noreply.github.com (test email sent; production scheduler/mail delivery pending)
- [ ] Finish Bonsai Ternary 27B + DSpark integration (v7 available); benchmark and add vision when ready
- [ ] User accounts, Stripe subscriptions, and NOWPayments
- [ ] Make/Zapier MCP catalog connection and ClawHub skill import with sandbox/permission review
- [ ] Mobile-responsive polish and cross-device testing
- [ ] Distributed orchestration across P2P-connected devices
- [ ] Custom methodology builder

---

## Tools

### Done
- [x] Tool plugin architecture (metadata + schema + handler)
- [x] Self-registering lazy-loaded plugins
- [x] Knowledge tools (search, read, list, summarize)
- [x] Math tools (sandboxed QuickJS calculator)
- [x] Code execution (sandboxed QuickJS)
- [x] Research tools (Wikipedia, arXiv, Wikidata)
- [x] OCR tool
- [x] Connector-specific tools (Drive, Gmail, Calendar, Slack, Notion)
- [x] Artifact generation tools
- [x] PowerPoint generation tools
- [x] Presentation tools

### Planned
- [ ] Web browsing tool (sandboxed iframe)
- [ ] Shell execution tool (for local Ollama setups)
- [ ] Custom tool builder UI

### Future
- [ ] MCP (Model Context Protocol) tool integration
- [ ] Community tool marketplace

---

## Knowledge Base

### Done
- [x] File upload with drag & drop
- [x] Folder watching via File System Access API
- [x] Automatic file type detection and classification
- [x] SHA-256 content deduplication
- [x] Background sync every 30 seconds
- [x] Document processing (PDF, DOCX, XLSX, PPTX, CSV)
- [x] Content extraction and indexing

### Planned
- [ ] Full-text search within knowledge items
- [ ] Automatic summarization of uploaded documents
- [ ] Knowledge graph visualization

---

## Connectors

### Done
- [x] OAuth 2.0 PKCE flow for browser-based auth
- [x] Google Drive — file import with delta sync
- [x] Gmail — email import with label filtering
- [x] Google Calendar — event import as markdown
- [x] Google Tasks, Meet, Chat connectors
- [x] Notion — page/database import with block-to-markdown
- [x] Slack — channel/message import
- [x] Figma — design file access
- [x] Dropbox, OneDrive, Outlook, Qonto
- [x] Encrypted token storage
- [x] Delta sync with cursor-based change tracking

### Planned
- [ ] GitHub connector (issues, PRs, repos)
- [ ] Jira / Linear connector
- [ ] Custom REST/GraphQL API connector builder

### Future
- [ ] MCP server connector
- [ ] Webhook-triggered sync

---

## Collaboration

### Done
- [x] P2P sync via WebRTC (y-webrtc)
- [x] P2P sync via WebSocket relay (y-websocket)
- [x] Password-protected sync rooms
- [x] CRDT-based automatic conflict resolution
- [x] QR code sharing for room join
- [x] Cross-device data replication

### Planned
- [ ] Selective sync (choose which spaces/data to share)
- [ ] Sync status dashboard

### Future
- [ ] Real-time collaborative editing within conversations
- [ ] Shared agent libraries across team

---

## Observability

### Done
- [x] LLM trace capture (request/response, tokens, latency)
- [x] Cost tracking per model and provider
- [x] Performance metrics (P50, P95, P99 latency)
- [x] Traces dashboard with filtering and analytics
- [x] Langfuse integration (opt-in)
- [x] Processing step visibility in message UI

### Planned
- [ ] Cost budgets and alerts
- [ ] Export traces to CSV/JSON

---

## Marketplace & Extensions

### Done
- [x] Extension types: apps, agents, connectors, tools
- [x] YAML-based extension schemas
- [x] Sandboxed iframe execution
- [x] Extension bridge API (DEVS.llm, DEVS.ui, DEVS.t)
- [x] Extension install/uninstall flow
- [x] Marketplace discovery with search and categories

### Planned
- [ ] Extension ratings and reviews
- [ ] Extension auto-update
- [ ] Revenue sharing for extension authors

---

## Local Backup

### Done
- [x] Bidirectional file system sync
- [x] Human-readable Markdown + YAML frontmatter format
- [x] Full database JSON export
- [x] Automatic backup on data change (2s debounce)
- [x] Entity support: agents, conversations, memories, knowledge, tasks

### Planned
- [ ] Git integration (auto-commit on backup)
- [ ] Selective entity backup

---

## Meeting Bot

### In Progress
- [ ] Google Meet integration — join as participant
- [ ] Live transcription
- [ ] Meeting summarization

### Future
- [ ] Zoom and Teams support
- [ ] Real-time agent assistance during calls

---

## Infrastructure

### Done
- [x] Vite MPA build with per-language pages
- [x] Feature-based code splitting
- [x] Docker multi-stage build
- [x] Static web server deployment
- [x] OAuth proxy (bridge.devs.new)

### Planned
- [ ] CI/CD pipeline documentation
- [ ] Automated lighthouse scoring
- [ ] Bundle size budget enforcement

---

**Related:** [VISION.md](./VISION.md), [ARCHITECTURE.md](./ARCHITECTURE.md)
