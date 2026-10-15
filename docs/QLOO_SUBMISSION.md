# Qloo Agentic Hackathon submission package

Event: https://qloo.devpost.com/
Deadline: October 30, 2026 11:45pm EDT
Prize pool: $25,000 (1st $15,000 / 2nd $6,000 / 3rd $4,000)

## What must exist before submit

| Item | Status | Owner |
|---|---|---|
| Qloo API key (Google Form) | BLOCKED on user | you |
| Register on qloo.devpost.com | BLOCKED on user | you |
| Live demo URL | agentasia.vercel.app + gateway Qloo enabled | build |
| Public GitHub repo + open source license | jamesparser public copy | build |
| Text description (what + why Qloo) | below | done draft |
| Demo video | NOT required | n/a |

## User actions (cannot be automated)

1. Request the Qloo API key:
   https://forms.gle/zz12orkLHTAneLGz6
   Leave project idea blank or write "AgentAsia cultural companion: locale-aware agent grounded in Qloo taste".

2. Join the hackathon:
   https://qloo.devpost.com/register?flow%5Bdata%5D%5Bchallenge_id%5D=31054&flow%5Bname%5D=register_for_challenge

3. When the key email arrives, put it on the gateway:
   `QLOO_API_KEY=<key>` in the gateway env (`server/.env` on the VPS / tunnel host),
   restart, confirm `POST /v1/culture` returns 200.

4. On Devpost: create submission, paste the description below, link
   - Demo: https://agentasia.vercel.app (or the Qloo-branded URL)
   - Repo: https://github.com/jamesparser/agentasia-qloo
   - License: MIT (file must show in the repo About section)

## Submission description (paste-ready)

**Title:** AgentAsia Culture Companion — AI that understands your culture

**Short:** AgentAsia already speaks your language. Powered by Qloo, it now understands your culture: dining, gifts, travel, music, film, and lifestyle recommendations that match what people where you are from actually like.

**Long:**

AgentAsia is a multi-locale AI assistant for Asia and the world: 30+ languages, a language wheel on first launch, and the slogan "AI that speaks your language."

Language alone is not enough. A generic LLM can translate "gift ideas for a Japanese colleague" into Japanese and still recommend the wrong gifts. AgentAsia Culture Companion closes that gap with Qloo.

When you pick a locale, AgentAsia maps it to cultural taste signals and calls Qloo's Insights API (250M+ entities across music, film, dining, fashion, travel, brands). The agent then recommends from real local taste:

- "Plan a weekend in Bangkok for my parents" -> Thai destinations, dining, and places
- "What should I cook for a Khmer family gathering?" -> Khmer cuisine and family dining taste
- "Gift ideas for a Japanese colleague" -> Japanese brands, lifestyle, and cultural fit
- "What are teens in Jakarta into right now?" -> Indonesian music, lifestyle, and audience signals

**Why this only works with Qloo**

Translation is table stakes. Cultural grounding is the product. Every recommendation path goes through `cultural_insights`, which calls Qloo `/v2/insights` after resolving locale seeds through `/search` and `/v2/tags`. Remove Qloo and the agent reverts to generic advice that could be for anyone, anywhere.

**Technical**

- Frontend: AgentAsia (devs.new fork), Vite/React, 30+ locales, language wheel
- Agent: Nemotron via managed gateway + tool loop (web_search + cultural_insights)
- Qloo: hackathon Insights API as a first-class agent tool, key held on the gateway (never in the browser)
- Culture map: locale -> dining / music / film / lifestyle / gift seeds, resolved live against Qloo
- Open source: MIT

**Judging fit**

- Technological Implementation: real Qloo Insights + tag/entity resolution, not a screenshot
- Design: one coherent product where culture is a first-class axis, same as language
- Potential Impact: SE Asia and global diaspora users get advice that fits family, food, gifts, and festivals
- Quality of the Idea: language wheel -> culture wheel is a non-obvious use of a taste graph inside a general agent

## Local verification checklist

- [ ] `node server/test/qloo.test.mjs` passes
- [ ] `node server/test/agent-loop.test.mjs` passes
- [ ] `POST /v1/culture` with `{locale:'km',intent:'dining'}` returns named entities
- [ ] In the app: set language to Thai, ask "weekend in Bangkok for parents", agent calls cultural_insights and names places
- [ ] With `QLOO_API_KEY` unset, the tool returns `qloo_not_configured` (no fake list)
- [ ] Public repo has MIT license visible in About
- [ ] Demo URL works without login (guest) or with a shared judge login

## Repo protocol

1. Build and push private: `node0datasystems-lgtm/agentasia-qloo` (or `devs` branch `qloo-culture`).
2. Redact secrets (PATs, tokens, VPS IPs, internal notes).
3. Copy to public: `jamesparser/agentasia-qloo` with MIT + this submission README.
4. Never make node0 repos public early. Never put the jamesparser PAT in files or commit messages.
