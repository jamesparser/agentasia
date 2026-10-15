# Qloo culture layer for AgentAsia

AgentAsia already speaks the user's language. This layer is what lets the agent
understand their culture.

## Why Qloo

Qloo's taste graph covers 250M+ entities across music, film, dining, fashion,
travel and more. When a user picks Khmer, Japanese, Hindi, Tagalog, or any other
AgentAsia locale, the agent does not just translate. It looks up what people in
that culture actually like and recommends from that set.

Without Qloo, "Plan a weekend in Bangkok" is generic travel copy.
With Qloo, it is destinations, dining, and places that fit Thai taste.

## How it works

1. User picks a language on the AgentAsia language wheel (or the agent reads the
   conversation locale).
2. `cultural_insights` maps that locale to a culture profile (region, dining,
   music, film, lifestyle, gift ideas).
3. The gateway resolves those seeds through Qloo `/search` and `/v2/tags`.
4. It calls Qloo `/v2/insights` for the right entity type (place, destination,
   brand, artist, movie, ...).
5. The agent answers in the user's language, grounded in those taste signals.

The Qloo API key never reaches the browser. It lives on the AgentAsia gateway,
metered like web search.

## Tool

`cultural_insights(locale, intent, query?, entity_type?, limit?)`

Intents: dining, food, restaurants, travel, trip, weekend, places, gifts,
shopping, brands, fashion, music, film, movies, tv, shows, books, podcasts,
games, people, general.

## Demo moments

| Prompt | Locale | Intent | Why it shows Qloo |
|---|---|---|---|
| Plan a weekend in Bangkok for my parents | th | weekend / travel | destinations + dining + places |
| What should I cook for a Khmer family gathering? | km | dining | Khmer cuisine taste, not generic Asian food |
| Gift ideas for a Japanese colleague | ja | gifts | brands, lifestyle, film/anime adjacency |
| What are teens in Jakarta into right now? | id | general / music | audience + music + lifestyle signals |
| Where should we eat in Taipei tonight? | zh-TW | dining | Taiwanese places, night-market taste |
| K-pop and beauty gifts for my sister in Manila | fil | gifts / music | K-wave + local shopping taste |

Each demo must produce named entities from Qloo. If the answer works the same
with Qloo turned off, the demo is wrong.

## Configuration

```
QLOO_API_KEY=...           # from the hackathon key form
QLOO_BASE_URL=https://hackathon.api.qloo.com   # default
```

Get a key: https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide#getting-your-api-key

Hackathon keys only work against `https://hackathon.api.qloo.com`. Production
and staging hosts reject them.

## Endpoints

| Path | Who | What |
|---|---|---|
| `POST /v1/culture` | gateway (public, metered) | locale + intent -> Qloo Insights |
| `cultural_insights` tool | agent loop / chat | same, as a model tool |

## Rules this must keep

- Fail closed when `QLOO_API_KEY` is missing (`qloo_not_configured`). Never ship
  a local fake list as if it were Qloo.
- Cite entity names the way web search cites sources.
- Answer in the user's language; use Qloo for taste, not for translation.
- Locale profiles are query seeds. Qloo is the source of truth for what is hot.
