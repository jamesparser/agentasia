# AgentAsia backend architecture

## Required services

- **Identity:** email/password and Google/GitHub OAuth through a managed identity provider.
- **Gateway:** a same-origin API gateway for model routing, provider keys, streaming, rate limiting, and usage metering.
- **Workers:** durable queue for scheduled tasks; browser timers are not reliable when a tab is closed.
- **Billing:** Stripe Checkout plus webhook-verified subscriptions and server-side entitlements.
- **Integrations:** Composio and authenticated MCP connections must keep credentials and OAuth flows server-side.

## Security rules

1. Never put Stripe, Composio, or model-provider secrets in the Vite bundle.
2. Never treat a consumer ChatGPT/Claude/Gemini/Grok subscription as API authorization.
3. Require explicit confirmation for connector writes and scheduled task tool calls.
4. Persist only encrypted credentials and connection metadata; never sync plaintext secrets through Yjs.

## First production API surface

- `POST /v1/auth/session`
- `POST /v1/billing/checkout`
- `POST /v1/billing/webhook`
- `POST /v1/models/chat`
- `POST /v1/integrations/composio/link`
- `POST /v1/integrations/mcp/discover`
- `POST /v1/schedules`
- `POST /v1/schedules/:id/run`
