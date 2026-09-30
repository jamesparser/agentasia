<div align="center">

<img src="./public/icon-192.png" width="88" alt="AgentAsia mark" />

# AgentAsia

**AI that speaks your language.**

A personal AI agent workspace built for Southeast Asia: 22 regional languages in
the UI, a naga-themed interface, and inference that runs on
**NVIDIA Nemotron on Nebius Token Factory**.

<br />

</div>

## What it does

- **Worker mode** - give it a task, it plans and runs sub-tasks across agents.
- **22 languages** - full UI localisation across Southeast and South Asian
  scripts, including Thai, Lao, Khmer, Burmese, Sinhala-adjacent Indic scripts,
  Arabic, CJK and the Indonesian archipelago languages.
- **Voice** - speech-to-text across the region; text-to-speech where an engine
  exists, and an honest text-only badge where it does not (see below).
- **Skills** - discover and install agent skills from skills.sh, SkillsMP and
  ClawHub, each scanned by a built-in skill checker before it can run.
- **Agents and knowledge** - create agents, attach files, search the web through
  the managed gateway with citations.
- **Local-first** - conversation data is encrypted at rest in the browser.

## The hackathon requirement

Everything runs on **Nebius Token Factory**. The default model is
`nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`, served through a gateway we operate so
that no inference key is ever shipped to the browser.

## Architecture

    browser  ->  agentasia-gateway.realcryptocap.com  ->  Nebius Token Factory
               (OpenAI-compatible, spend breaker, Tavily search loop)

The gateway holds the Token Factory key. A visitor can only reach
`/v1/chat/completions`; the model list is public and the operator routes require
a token. No client secret exists in the bundle.

## Honest limits

We would rather list these than have you find them.

| Area | State |
|---|---|
| UI translations | ~69% of strings per locale; the rest fall back to English |
| Text-to-speech | 6 of 22 languages on the free tier (ja, ko, vi, id, hi, ar) |
| Speech-to-text | all 22 languages, via a Nemotron / Qwen / Whisper ladder |
| Thai, Lao, Khmer, Burmese TTS | no in-browser engine exists; shown as text with a badge |
| Cross-device sync | off by default; needs your own signaling server |

## Running it

```bash
bun install
bun run dev      # http://localhost:3000
bun run build    # production bundle in dist/
bun run test:run
```

Point it at your own inference by setting the gateway URL:

```bash
VITE_AGENTASIA_GATEWAY_URL=https://your-gateway/v1 bun run dev
```

## Attribution

This project is a derivative of the open-source `devs` application and is
distributed under its original licence. The AgentAsia work - branding,
localisation, voice routing, the skill registries, the managed gateway and the
worker mode - is ours; the upstream base remains theirs.

<p align="center">
  <a href="https://x.com/JasonParserSec">@JasonParserSec</a>
</p>
