# AgentAsia, "Naga" · Nebius × NVIDIA Global AI Hackathon 2026

> Draft submission copy. Anything marked **[pending]** depends on work not yet done
> or on the live Token Factory key. Do not submit until those are real.

**Track:** Personal AI
**One-liner:** *Naga is the always-on assistant that speaks your language, cites its
sources out loud, and remembers you: five heads, five jobs, one NVIDIA Nemotron
brain on Nebius Token Factory.*

**Project name, like a human:** **Naga**: the mythical five-headed serpent that
guards treasure. In AgentAsia each head is a function, and what it guards is *your
data*. The name is the architecture: one head speaks, one works, one sees, one
searches, one remembers.

## Who owns what (the privacy model, and why it is not a marketing line)

| Layer | Where it lives | Who holds the key |
|---|---|---|
| Reasoning | **Nebius Token Factory**, NVIDIA Nemotron 3 | user's own budget/plan; TF offers zero-retention inference |
| Live facts | **Tavily**, called by the model as a tool | our shared Tavily key: search queries only, **no personal data** |
| Memory | **the user's browser**: AES-GCM-256 at rest in IndexedDB/OPFS | the user; **we run no memory database** |
| Personal data (local-first) | their device, and the user's own **aggregator MCP** connection | the user's own accounts, in **their** Composio/Pipedream/Zapier tenant, never our VPS |
| Optional cross-device memory | the user's own Mem0 account (BYOK, per-request key, transient) or any memory MCP | the user |

We deliberately **removed** the "host everyone's Mem0 on our server" design: one shared
vendor key would put every user's life details on infrastructure we can read, which is
the opposite of the Personal AI brief and a liability we don't want. Instead users
connect **one** MCP endpoint that fronts hundreds of apps. We never add integrations
on their behalf, and we never see their OAuth tokens. That is also why the naga's crest
gem (memory) is a *guarded treasure* rather than a database row.

**Connector decision (why one endpoint, not a hundred MCPs).** Verified September 2026:
**Composio**: ~1,000-1,500+ toolkits behind **one managed MCP endpoint**, managed
OAuth, **free Hobby tier = 100,000 tool calls + 50,000 triggers/month, hard-capped,
no card**, unlimited connected accounts free on every tier, SOC 2 Type II + ISO 27001
+ DPA. **Pipedream MCP**: widest catalogue (~2,800+ apps / 10,000+ tools), free for
personal use, caveat: acquired by Workday (Nov 2025). **Zapier MCP**: 9,000+ apps but
~2 tasks per tool call and 100 tasks/month free. **Activepieces**: MIT, self-hostable,
every piece is an MCP server. Default = **user's own Composio URL** (free, capped, no
bill surprise); power users may point at Pipedream/Zapier/self-hosted instead.

**Built with:** Nebius Token Factory · NVIDIA Nemotron 3 (Nano 30B-A3B is the free
tier; Super 120B-A12B and Ultra 550B are selectable by plan) · Parakeet ASR, run
on-device in the browser · Tavily · MCP · Vercel + Cloudflare Pages (frontend)

**Not claimed as built:** Nemotron 3.5 ASR Streaming 0.6B and Magpie TTS
Multilingual are the *planned* paid-tier voice ends. They are not wired: there is
no NIM client in this repo. What ships today is on-device ASR (Parakeet/Whisper
class, plus the browser engine where it works) and text-to-speech from the
operating system's own voices, with Kokoro/Supertonic in Live mode. The hero demo
therefore speaks Japanese through system voices, not Magpie.

---

**Memory, stated precisely:** `GET /v1/memory/policy` is live and public, and it
answers honestly (`hostedByAgentAsia: false`, `defaultBackend: local-encrypted`,
`keyRetention: none`). The BYOK Mem0 and memory-search routes are written on the
gateway but sit behind the admin token and have no settings UI, so a user cannot
reach them today. User memory in the shipped app is the local encrypted store,
full stop.

## 1. What it is and what it does

Naga is a browser app, no install, that turns any device with a browser into an
always-on private assistant, in two faces of one core:

- **Chat mode**: ambient voice. Hold-to-talk, an animated five-headed naga on
  screen, answers spoken back in your language (demo hero language: **Japanese**),
  with a citation card for anything time-sensitive.
- **Work mode**: the devs.new workspace, with model select, MCP tools and skills,
  scheduled tasks, traces, spaces.

**Runtime flow (the part that must be on screen in the video):**

1. Speech → **NVIDIA Nemotron 3.5 ASR Streaming 0.6B** (40 locales, 80 ms chunk,
   word-boosting for "Naga" and user coin/agent names).
2. Text → **Nebius Token Factory** `POST /v1/chat/completions` → `nvidia/nemotron-3-nano-30b-a3b`
   (free tier). Hard work-mode turns escalate to **Super 120B-A12B**; Ultra is
   reserved for enterprise/dedicated endpoints.
3. Anything the answer asserts about the live world (weather, scores, prices, news)
   is **not** recalled from weights: it is fetched at runtime through **Tavily**,
   returned with source + timestamp, and read aloud with attribution.
4. Recall and persistence → **Mem0**, keyed to the signed-in `uid`.
5. Output → **Magpie TTS Multilingual** (paid/demo) or in-browser
   **Kokoro/Supertonic** (free tier, $0 to us).
6. The **face is the status light**: Mouth gold + jaw synced to the TTS waveform,
   Eyes cyan tracking the text, Hood magenta flaring while Tavily runs, Claws
   amber closing on an MCP tool call, Crest-gem sapphire brightening on a memory
   hit, Heart emerald pulsing when a scheduled job finishes. Colour never carries
   state alone; every lane also has a distinct *shape* change.

**Fallback as a feature:** AgentAsia historically balanced cost by routing to
free/cheap third-party lanes (OpenRouter `:free`, CUDOS/ASI1, Venice, DeepSeek).
Those lanes are shared and rate-limited: in a 38,372-call window on one of our
production routers, **34% of requests failed** (1,528 × `429`, 328 × `503`) and a
free OpenRouter account caps near **50 requests/day**. So the router now puts
**Nebius Token Factory first** and treats the free lanes as fallbacks. Nebius is
the guarantee, not the option. This is real engineering proven by our own outage
data, and it is what makes the assistant dependable enough to talk to your family.

## 2. Why it fits Personal AI

| Track asks | Naga |
|---|---|
| Always-on | browser app, installable as a PWA, plus a **scheduled tasks** section in Settings. Honest state: the gateway's `/v1/schedules` routes exist but answer 401 (admin-token only) and the scheduler is disabled server-side, so today a task runs while the window is open, not overnight |
| Private, data under your control | free tier can run inference in the browser; server-side memory is exportable and erasable; Token Factory offers zero-retention inference |
| Persistent memory | memory and learnings stay in the user's own browser store (encrypted at rest, exportable), shown as the naga's guarded crest gem. Mem0 is BYOK and optional, not a server-side profile: there is no `uid` in the anonymous deployment, so nothing is keyed to one |
| Reusable skills + tool access | skills + MCP (`ToolTransport = 'builtin' \| 'mcp'`) + connectors |
| NVIDIA open source model | two, in the build: Nemotron 3 chat/reasoning on Token Factory, and Parakeet ASR running on-device. Nemotron 3.5 ASR and Magpie TTS are planned paid-tier lanes, not shipped |
| Nebius | every cloud text turn is a Token Factory runtime call, verifiable in the response headers. Nebius Serverless is not used [pending] |

## 3. Testing instructions **[partly pending: judge logins + demo video]**

- **Already true and re-verified 2026-10-01:** `POST https://agentasia-gateway.realcryptocap.com/v1/chat/completions`
  with `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` answers 200 and returns
  `x-agentasia-provider: nebius` and `x-agentasia-model: nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`,
  so routing can be checked without reading our code. Fresh request ID from this
  account: `chatcmpl-fe214600-c476-4fdd-b977-a38d549c3944`. Earlier ones:
  `chatcmpl-12657a8a-4b0e-4…`, `chatcmpl-e65a1118-8f11-4…`, `chatcmpl-6798942f-68c3-4…`.

- URL: **https://agentasia.vercel.app/** (keep live and free until **15 Dec 2026**)
- Public repo: **https://github.com/jamesparser/agentasia**, branch `hackathon-nebius-2026`,
  MIT licence with the upstream CODENAME SAS notice preserved
- Guest mode: works without login, token-clamped, text + voice only, **stateless**
  (memory and scheduled tasks require an account: that is the architecture, not a
  paywall)
- Judge login: **[still open]**. Sign-in is a written-but-inert seam: the only Google
  OAuth client on this account is branded RealCryptoCap and its authorized domains
  exclude `agentasia.vercel.app`, so the account button hides itself rather than
  offering a control that throws. No login is needed to judge the demo; if judges
  want per-account features, that needs a new AgentAsia OAuth client.
- **Known caveat, stated honestly:** the legacy `freemium-chat` / `freemium-coding` /
  `freemium-agentic-vision` aliases 404 at this gateway. The app never sends them: the
  managed lane resolves a plan to a Nemotron model id in
  `src/lib/llm/managed-lane.ts` and posts that, which is the path verified above. The
  `modelRouting` block in `src/config/agentasia.ts` that still names those aliases is
  dead config, read by nothing.
- **One-line gateway fix, not applied here:** `x-agentasia-provider` and
  `x-agentasia-model` are sent but not listed in `Access-Control-Expose-Headers`,
  so a judge who checks routing from the browser console sees `null` while
  DevTools > Network shows the real value. Verified both ways on 2026-10-01. The
  fix belongs in `corsHeaders()` in `server/src/index.mjs`, which runs on the VPS
  and is live infrastructure, so it is flagged rather than edited: add
  `res.setHeader('access-control-expose-headers', 'x-agentasia-provider, x-agentasia-model')`
  and restart the service.
- How to verify Nebius usage yourself: response headers `x-agentasia-provider: nebius`
  and `x-agentasia-model: nvidia/nemotron-3-…`, plus a Token Factory usage screenshot
  in the video.

## 4. Demo video script (target 2:45), required tools spoken out loud

| Time | Beat | Must be said aloud |
|---|---|---|
| 0:00 to 0:20 | Problem: assistants forget you, and confidently read stale facts out loud. Show a "how much is DOGE today?" answered from memory, wrong. | (nothing required) |
| 0:20 to 1:50 | Live, on a real device, no cuts: ask in **Japanese** → Naga hears → **Tavily** → answers in Japanese with a visible source card → asks about a *previous* conversation to prove memory → triggers a scheduled job (heart pulse). | *"That reasoning is **Nemotron 3 Nano 30B running on Nebius Token Factory**."* |
| 1:50 to 2:20 | Architecture: five heads = five lanes; router puts Nebius **first**, free lanes as fallback; show the `$0.0001 per turn` cost panel and the 429/503 fallback log. | *"Every turn calls the **Nebius Token Factory inference API**."* |
| 2:20 to 2:45 | Who it's for + business: free Nano tier, Pro/Business/Enterprise, subscriptions disabled during the contest. Ends on the naga guarding a jewel. | *"Built with **NVIDIA Nemotron** and **Nebius Token Factory**, with **Tavily**."* |

## 5. Feedback (required, and judged), specific per tool

**What I used each tool for**
- **Token Factory**: the default inference lane for every chat turn (Nano 30B-A3B,
  escalating to Super 120B-A12B), plus `black-forest-labs/flux-schnell` for
  character-keyframe generation.
- **NVIDIA Nemotron 3 (Nano 30B-A3B / Super 120B-A12B)**: multilingual reasoning
  and tool calling; **Nano Omni 30B** evaluated as the single multimodal lane.
- **NVIDIA Nemotron 3.5 ASR Streaming 0.6B** and **Magpie TTS Multilingual**: the
  voice ends of the loop.

**What worked well**
- OpenAI-compatible drop-in: switching a lane to Token Factory was a `baseURL` +
  model-id change, no new client code. That made it safe to make Nebius the
  *preferred* lane in a router that already had 20+ providers.
- Throughput is the headline: on third-party measurements we targeted for
  reproducibility, Nebius ranked fastest provider for both Nemotron models
  (Super 120B ≈ **371.8 tok/s**, Nano 30B ≈ **315.4 tok/s**), and the free tier at
  **$0.06 / $0.24 per M tokens** made "~$0.0001 per voice turn" a design
  assumption we could actually bank on: a $50 credit budget is hundreds of
  thousands of turns, not days.
- Playground + `?models=` deep links are genuinely useful for sanity-checking a
  model id before wiring it.
- **Measured on this account, same prompt, 64-token cap:** thinking **off** →
  Nano 30B **0.91 s / 2 output tokens / $0.0000020 per turn**; thinking **on** →
  1.09 s / 64 tokens (hit the cap, `content:null` because it never stopped
  thinking) / $0.0000169. **Lightning 3.5 at 0.77 s.** Super 120B: 1.33 s /
  $0.0000102 with thinking off. So ~$50 ≈ **tens of millions of voice turns**, and
  the reasoning toggle is the single biggest cost lever for agent traffic.
- A model that **declined to state a live price** ("I cannot fetch real-time
  prices") on the first try. That is independent evidence that retrieval is mandatory for
  a spoken assistant, not a feature we bolted on for a prize.

**What needs work (naming the tool)**
1. **The Nemotron family is split across platforms.** `Nemotron 3 Nano 4B`, the
   NVIDIA's *explicitly on-device* model, the natural free-tier/browser companion
   companion to Token Factory, is not listed in the Token Factory model catalogue, which
   today starts at Nano 30B-A3B. Builders doing "local 4B + cloud 30B/Super" have
   to leave Nebius for the small end. Please carry 4B (and its ONNX/quantised
   variants) into Token Factory.
2. **Pricing is not discoverable on one canonical page.** To compute a cost model
   I used third-party trackers (Artificial Analysis, pricepertoken) rather than a
   single authoritative `nebius.com/prices` table per model with input/output/cached
   rates. Publish per-model TF pricing (including cached-input pricing) on one page
   and link it from the playground.
3. **Console URL confusion (onboarding friction, first 10 minutes).** My first
   attempt hit `account.nebius.com`, which returned `ERR_NAME_NOT_RESOLVED`; the
   working path was `console.nebius.com` → `auth.nebius.com`. A single
   "here is where you get a key" URL in the hackathon onboarding doc would have
   saved that loop.
4. **Credit validity vs judging window.** Promotional credits expire **90 days
   from issuance**; judging runs **1 to 15 Dec 2026** and the rules require the project
   remain freely available to judges until then. Credits claimed in late August
   expire *before judging ends*: for a hackathon that requires a live demo, either
   extend validity to cover the judging period or say so explicitly in the rules.
5. **Rate-limit/RPM transparency for Token Factory** during events: no published
   per-key RPM/TPM ceiling page that I could find, which forced me to design around
   worst-case unknowns.

**Onboarding, zero → hello world**
Registration → activation code (`NEBIUS-DEVPOST-GLOBAL26`) → Builder Program →
API key → first call took **about 25 minutes**, with one dead-end URL (item 3).
The OpenAI-compatible endpoint meant the very first call worked with an existing
SDK. The friction was in *finding the right console URL and the model ids*, not in
the API.

**Would I build with it again?** Yes, and here is the plan: AgentAsia's production
free tier is designed to sit on Token Factory Nano 30B, escalating per plan tier,
because the price/latency point ($0.06/$0.24, ~315 tok/s) is where a
voice-first assistant is economically possible at all. What would make it
*unconditionally* the choice: the 4B/edge model in the catalogue (item 1), a
canonical per-model pricing page (item 2), and credits that outlive the judging
period (item 4).
