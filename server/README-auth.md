# Gateway accounts, plans and usage

This is the owner's checklist. Nothing here has been deployed. The gateway on the
VPS is live code, so every step below is yours to run.

## What the gateway now does

1. Verifies the caller's Firebase ID token (RS256 against Google's published
   certificates, no new dependency).
2. Resolves the caller's plan on the server from the verified uid. The model and
   the max_tokens ceiling in the request body are overwritten from that plan, so a
   browser cannot ask for a bigger model by editing its own state.
3. Enforces a per-uid daily allowance (requests and tokens) before the provider is
   contacted. An exhausted allowance answers 429 with `error.type = "allowance"`.
4. Serves `GET /v1/usage` for the caller (public route, token authenticated, answers
   for the caller who asks and nobody else).
5. Keeps paid tiers inert. While `PAID_TIERS_ENABLED` is not `true`, every caller
   resolves to the free plan regardless of what the plan store holds.

Anonymous requests behave exactly as before unless `AUTH_REQUIRED=true`.

## Environment variables

| Variable | Meaning |
|---|---|
| `AUTH_REQUIRED` | `true` refuses anonymous chat with 401 `sign_in_required`. Turn on once the web app ships sign-in. |
| `FIREBASE_PROJECT_ID` | Project id of the AgentAsia Firebase project. Tokens for any other project are rejected. |
| `BETA_ENDS_AT` | Default `2026-12-25T00:00:00+07:00`. Reported by `/v1/usage` so the app can say it. |
| `PAID_TIERS_ENABLED` | Leave unset during the beta and the contest. |
| `PLANS_FILE`, `USAGE_FILE` | Default to `server/data/plans.json` and `usage.json`. Point at the mounted `/data` volume in production. |
| `GATEWAY_DEV_AUTH_SECRET` | Test only. Enables `POST /v1/dev/session`. Do not set it on the production gateway. |

Allowances live in `PLAN_ALLOWANCE` in `server/src/entitlements.mjs`. The free
defaults are 25 requests and 40,000 tokens per UTC day, replies capped at 1,500
tokens. Change them there.

## Firebase project (needs your Google account)

The existing OAuth client is branded RealCryptoCap and must not be reused.

1. In the Firebase console create a new project named AgentAsia.
2. Authentication, Sign-in method: enable Google and Email/Password.
3. Authentication, Settings, Authorized domains: add `agentasia.vercel.app` and any
   custom domain.
4. Project settings, add a Web app. Copy the config values.
5. Set these in the Vercel project (Production and Preview):
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
   `VITE_FIREBASE_APP_ID`, and `VITE_REQUIRE_LOGIN=1`.
6. On the gateway set `FIREBASE_PROJECT_ID` to the same project id, then
   `AUTH_REQUIRED=true`.
7. The Google consent screen shows "not verified" until the OAuth app is verified.
   Email and password keeps working in the meantime.

## Deploy order

1. Deploy the gateway first with `AUTH_REQUIRED` unset. Run
   `curl -s https://<gateway>/v1/usage`. It should answer 200 with `signedIn: false`.
2. Deploy the web app with the Firebase variables.
3. Sign in once in the browser, confirm the Usage screen shows server numbers.
4. Set `AUTH_REQUIRED=true` and restart the gateway.

## Local test without Google

Run the gateway with `GATEWAY_DEV_AUTH_SECRET=anything MODEL_GATEWAY_ENABLED=true`
and build the web app with `VITE_DEV_AUTH=1 VITE_REQUIRE_LOGIN=1`. The sign-in
dialog then mints a signed local principal from the gateway. Tests:
`node --test server/test/entitlements.test.mjs`.

## Not built yet

Stripe and NOWPayments checkout and webhooks. They must call `setPlan()` only after
verifying the provider's signature, and stay behind `PAID_TIERS_ENABLED`.
