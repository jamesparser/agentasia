# AgentAsia Culture Companion — Devpost paste pack

Use this to finish the Qloo Agentic Hackathon draft titled "Untitled".
Deadline: Oct 30, 2026 11:45pm EDT (31 Oct 10:45am GMT+7).

## Title

AgentAsia Culture Companion: AI that understands your culture

## Tagline / short description

AgentAsia already speaks your language. Powered by Qloo, it understands your culture: dining, gifts, travel, music, and lifestyle advice grounded in what people from that culture actually like.

## Links

- **Demo:** https://agentasia.vercel.app
- **Public repo:** https://github.com/jamesparser/agentasia-qloo
- **License:** MIT (visible in repo About)

## Full description (paste as project details)

### Problem

Generic agents are culturally blind. They can translate "gift ideas for a Japanese colleague" into Japanese and still recommend the wrong gifts. Language is solved; taste is not. For 30+ Asian and global locales, wrong food, gift, and weekend advice is the difference between "technically functional" and "actually good."

### Product

AgentAsia is a multi-locale personal AI (language wheel, 30+ UI languages, slogan "AI that speaks your language"). Culture Companion is the Qloo layer: before recommending dining, gifts, travel, music, film, or lifestyle, the agent calls Qloo's taste graph so advice matches local culture.

Demo prompts that only work with Qloo:

- "Plan a weekend in Bangkok for my parents" (Thai destinations + dining + places)
- "What should I cook for a Khmer family gathering?" (Khmer cuisine, family dining)
- "Gift ideas for a Japanese colleague" (Japanese brands + lifestyle fit)
- "What are teens in Jakarta into right now?" (Indonesian music + audience lifestyle)

Remove Qloo and these become generic lists. That is the differentiator.

### Qloo integration (workflows and why)

We use Qloo as a first-class agent tool, not a one-off API call:

1. **Locale profile** maps the user's language (km, ja, hi, th, id, fil, ko, zh-CN, ...) to cultural seeds: region, cities, dining, music, film, lifestyle, gift ideas.
2. **Tag and entity resolution** through Qloo `/v2/tags` and `/search` (same concepts as the kit `find_tags` / search workflows) so we never hardcode taste IDs.
3. **Insights** through Qloo `/v2/insights` with `signal.interests.tags`, `signal.interests.entities`, and type-specific filters (`urn:entity:place`, `destination`, `brand`, `artist`, `movie`, ...).

The agent exposes this as `cultural_insights(locale, intent, query)` and is instructed to call it before lifestyle recommendations. The Qloo key never reaches the browser: it lives on the AgentAsia gateway (`POST /v1/culture`), metered like search.

This matches the kit's rule: keep the key on the server, send no personal data to Qloo, and treat results as group affinities (never as one person's profile).

### Redacted request to result

Request (locale=km, intent=dining, query="Khmer family gathering"):

1. Resolve tags for "Khmer cuisine", "family gatherings", "Phnom Penh", "fish amok".
2. Resolve entities for those seeds.
3. `GET /v2/insights?filter.type=urn:entity:place&signal.interests.tags=...&filter.location.query=Phnom Penh`.
4. Agent answers in Khmer/English, naming real places and dishes from the Qloo result set.

Same shape for Thai weekend travel (`urn:entity:destination`), Japanese gifts (`urn:entity:brand`), Jakarta teen culture (music + lifestyle intents).

### Setup (clean environment)

1. Clone https://github.com/jamesparser/agentasia-qloo
2. `npm install` (or bun)
3. Set gateway env: `QLOO_API_KEY`, `QLOO_BASE_URL=https://hackathon.api.qloo.com`
4. `npm run dev` / deploy frontend; run `server/` gateway
5. Optional harness path: `npm i -g @qloo/qloo-harness`, `qloo setup --qloo`, then `qloo exec find_tags --input-file request.json`

### Known limitations

- Qloo results describe what groups tend to like, not what one person will do. The agent never claims personal preference.
- Hackathon keys only work against `https://hackathon.api.qloo.com`.
- Coverage varies by region; some locales have stronger dining/place coverage than media coverage.
- Without `QLOO_API_KEY` the tool fails closed (`qloo_not_configured`); it never fabricates taste data.

### Judging fit

- **Technological Implementation:** real Insights + tag/entity resolution in the agent loop
- **Design:** culture is a first-class axis, same as language (wheel -> culture)
- **Potential Impact:** SE Asia + diaspora users get family, food, gift, festival advice that fits
- **Quality of the Idea:** language alone is not Qloo; language + taste graph is a non-obvious general-agent use case

## Bonus note (Jason Calacanis $25k)

If there is a field for "why us / bonus", add one line: Culture Companion is the general-agent use case that only works because of taste data; language is the distribution, Qloo is the moat.
