# AgentAsia — "Naga" · Nebius × NVIDIA Global AI Hackathon 2026

> Draft submission copy. Anything marked **[pending]** depends on work not yet done
> or on the live Token Factory key — do not submit until those are real.

**Track:** Personal AI
**One-liner:** *Naga is the always-on assistant that speaks your language, cites its
sources out loud, and remembers you — five heads, five jobs, one NVIDIA Nemotron
brain on Nebius Token Factory.*

**Project name, like a human:** **Naga** — the mythical five-headed serpent that
guards treasure. In AgentAsia each head is a function, and what it guards is *your
data*. The name is the architecture: one head speaks, one works, one sees, one
searches, one remembers.

**Built with:** Nebius Token Factory · NVIDIA Nemotron 3 (Nano 30B-A3B, Nano Omni
30B-A3B, Super 120B-A12B, Ultra 550B) · NVIDIA Nemotron 3.5 ASR Streaming 0.6B ·
NVIDIA Magpie TTS Multilingual · Parakeet ASR · Tavily · Mem0 · MCP · Nebius AI
Cloud Serverless [pending: endpoint/job] · Vercel + Cloudflare Pages (frontend)

---

## 1. What it is and what it does

Naga is a browser app — no install — that turns any device with a browser into an
always-on private assistant, in two faces of one core:

- **Chat mode** — ambient voice. Hold-to-talk, an animated five-headed naga on
  screen, answers spoken back in your language (demo hero language: **Japanese**),
  with a citation card for anything time-sensitive.
- **Work mode** — the devs.new workspace: model select, MCP tools and skills,
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
   state alone — every lane also has a distinct *shape* change.

**Fallback as a feature:** AgentAsia historically balanced cost by routing to
free/cheap third-party lanes (OpenRouter `:free`, CUDOS/ASI1, Venice, DeepSeek).
Those lanes are shared and rate-limited: in a 38,372-call window on one of our
production routers, **34% of requests failed** (1,528 × `429`, 328 × `503`) and a
free OpenRouter account caps near **50 requests/day**. So the router now puts
**Nebius Token Factory first** and treats the free lanes as fallbacks — Nebius is
the guarantee, not the option. This is real engineering proven by our own outage
data, and it is what makes the assistant dependable enough to talk to your family.

## 2. Why it fits Personal AI

| Track asks | Naga |
|---|---|
| Always-on | browser app + server-side **scheduled tasks** worker (pre-existing) running overnight queues |
| Private, data under your control | free tier can run inference in the browser; server-side memory is exportable and erasable; Token Factory offers zero-retention inference |
| Persistent memory | Mem0 per `uid`, shown as the naga's guarded crest gem |
| Reusable skills + tool access | skills + MCP (`ToolTransport = 'builtin' \| 'mcp'`) + connectors |
| NVIDIA open source model | Nemotron 3 chat lane **+** Nemotron 3.5 ASR **+** Magpie TTS **+** Parakeet ASR = four, not one |
| Nebius | every text turn is a Token Factory runtime call; Serverless [pending] |

## 3. Testing instructions **[pending]**

- URL: **[deploy URL]** (keep live and free until **15 Dec 2026**)
- Judge login: **[create unmetered judge accounts — never rate-limit a judge]**
- Guest mode: works without login, token-clamped, text + voice only, **stateless**
  (memory and scheduled tasks require an account — that is the architecture, not a
  paywall)
- Public repo: **[URL]**, MIT licence with the upstream CODENAME SAS notice preserved
- How to verify Nebius usage yourself: response headers `x-agentasia-provider: nebius`
  and `x-agentasia-model: nvidia/nemotron-3-…`, plus a Token Factory usage screenshot
  in the video.

## 4. Demo video script (target 2:45) — required tools spoken out loud

| Time | Beat | Must be said aloud |
|---|---|---|
| 0:00–0:20 | Problem: assistants forget you, and confidently read stale facts out loud. Show a "how much is DOGE today?" answered from memory, wrong. | — |
| 0:20–1:50 | Live, on a real device, no cuts: ask in **Japanese** → Naga hears → **Tavily** → answers in Japanese with a visible source card → asks about a *previous* conversation to prove memory → triggers a scheduled job (heart pulse). | *"That reasoning is **Nemotron 3 Nano 30B running on Nebius Token Factory**."* |
| 1:50–2:20 | Architecture: five heads = five lanes; router puts Nebius **first**, free lanes as fallback; show the `$0.0001 per turn` cost panel and the 429/503 fallback log. | *"Every turn calls the **Nebius Token Factory inference API**."* |
| 2:20–2:45 | Who it's for + business: free Nano tier, Pro/Business/Enterprise, subscriptions disabled during the contest. Ends on the naga guarding a jewel. | *"Built with **NVIDIA Nemotron** and **Nebius Token Factory**, with **Tavily**."* |

## 5. Feedback (required, and judged) — specific per tool

**What I used each tool for**
- **Token Factory** — the default inference lane for every chat turn (Nano 30B-A3B,
  escalating to Super 120B-A12B), plus `black-forest-labs/flux-schnell` for
  character-keyframe generation.
- **NVIDIA Nemotron 3 (Nano 30B-A3B / Super 120B-A12B)** — multilingual reasoning
  and tool calling; **Nano Omni 30B** evaluated as the single multimodal lane.
- **NVIDIA Nemotron 3.5 ASR Streaming 0.6B** and **Magpie TTS Multilingual** — the
  voice ends of the loop.

**What worked well**
- OpenAI-compatible drop-in: switching a lane to Token Factory was a `baseURL` +
  model-id change, no new client code. That made it safe to make Nebius the
  *preferred* lane in a router that already had 20+ providers.
- Throughput is the headline: on third-party measurements we targeted for
  reproducibility, Nebius ranked fastest provider for both Nemotron models
  (Super 120B ≈ **371.8 tok/s**, Nano 30B ≈ **315.4 tok/s**), and the free tier at
  **$0.06 / $0.24 per M tokens** made "~$0.0001 per voice turn" a design
  assumption we could actually bank on — a $50 credit budget is hundreds of
  thousands of turns, not days.
- Playground + `?models=` deep links are genuinely useful for sanity-checking a
  model id before wiring it.

**What needs work (naming the tool)**
1. **The Nemotron family is split across platforms.** `Nemotron 3 Nano 4B` —
   NVIDIA's *explicitly on-device* model, the natural free-tier/browser companion
   to Token Factory — is not listed in the Token Factory model catalogue, which
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
   from issuance**; judging runs **1–15 Dec 2026** and the rules require the project
   remain freely available to judges until then. Credits claimed in late August
   expire *before judging ends* — for a hackathon that requires a live demo, either
   extend validity to cover the judging period or say so explicitly in the rules.
5. **Rate-limit/RPM transparency for Token Factory** during events: no published
   per-key RPM/TPM ceiling page that I could find, which forced me to design around
   worst-case unknowns.

**Onboarding, zero → hello world**
Registration → activation code (`NEBIUS-DEVPOST-GLOBAL26`) → Builder Program →
API key → first call took **about 25 minutes**, with one dead-end URL (item 3).
The OpenAI-compatible endpoint meant the very first call worked with an existing
SDK — the friction was in *finding the right console URL and the model ids*, not in
the API.

**Would I build with it again?** Yes, and here is the plan: AgentAsia's production
free tier is designed to sit on Token Factory Nano 30B, escalating per plan tier,
because the price/latency point ($0.06/$0.24, ~315 tok/s) is where a
voice-first assistant is economically possible at all. What would make it
*unconditionally* the choice: the 4B/edge model in the catalogue (item 1), a
canonical per-model pricing page (item 2), and credits that outlive the judging
period (item 4).
