# Plan allowances: how they were sized

Checked 3 Oct 2026. Re-run the arithmetic whenever Token Factory or Tavily change prices.

## Unit costs

Model prices per million tokens (Token Factory, as held in `server/src/spend-guard.mjs`):

| Model | Input | Output |
|---|---|---|
| Nemotron 3 Nano 30B (Free) | $0.06 | $0.24 |
| Nemotron 3 Super 120B (Pro, Small Business) | $0.30 | $0.90 |
| Nemotron 3 Ultra 550B (Enterprise) | $1.00 | $3.00 |

Tavily: $0.008 per credit pay as you go, about $0.003 per credit on the $12 Project plan (4,000 credits). A basic search is one credit.

## Assumed request

2,000 input tokens (system prompt, history, search results) and 600 output tokens, so 2,600 tokens. 30 percent of requests use a web search. These are assumptions, not measurements. Replace them with the real averages from `usage.json` once there is traffic.

| Model | Model cost per request | With search (pay as you go) |
|---|---|---|
| Nano | $0.00026 | $0.0026 |
| Super | $0.00114 | $0.0035 |
| Ultra | $0.0038 | $0.0062 |

## Budget rule

Spend at most 45 percent of the price on model and search cost, which leaves room for Stripe fees, AssemblyAI, the VPS and a margin.

| Plan | Price | Cost budget | Requests per month at worst case | Chosen |
|---|---|---|---|---|
| Pro | $20 | $9 | about 2,600 (4,500 with the Tavily Project plan) | 5,000 |
| Small Business | $100 | $45 | about 12,800 (22,000) | 20,000 |
| Enterprise | $200 | $90 | about 14,500 (19,000) | 35,000 |

The chosen numbers sit above the worst case on purpose: almost nobody uses every request, and the spend guard caps total daily spend regardless. 100,000 requests a month on Ultra would cost about $380 to $620 against $200 of revenue, so it is not offered.

Caps are enforced per day in `server/src/entitlements.mjs` (monthly divided by 30), with separate caps for searches, voice calls and tokens.
