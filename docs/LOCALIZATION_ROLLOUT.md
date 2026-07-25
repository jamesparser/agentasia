# AgentAsia localization rollout

The selector supports English, Chinese (Simplified, Traditional, Cantonese), Japanese, Korean, Vietnamese, Thai, Indonesian, Malay, Filipino/Tagalog, Cebuano, Burmese, Khmer, Lao, Javanese, Sundanese, Hindi, Bengali, Urdu, and existing Arabic/European locales.

## Current behavior

The UI safely falls back to English for a selected locale without a reviewed translation pack. This avoids broken keys but is **not** a completed translation. Locale status is declared in `src/i18n/agentasia-locales.ts`.

## Completion standard

A locale is complete only when all of these are translated and reviewed by a fluent human:

1. Global UI `src/i18n/locales/<locale>.ts`
2. SEO metadata `src/i18n/locales/<locale>.meta.ts`
3. Settings and feature-local i18n catalogs
4. Built-in agents, methodologies, onboarding, legal pages, and email/billing copy
5. Language QA for truncation, pluralization, CJK line wrapping, and RTL (Urdu)

Machine translation may prepare a draft, but a native-language reviewer must approve it before the locale is labelled `reviewed`.
