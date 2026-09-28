// Alert fan-out for the gateway. Deliberately never throws: a failed email must
// not turn a working request into a 500, and must not block the spend breaker.
// Primary channel is Resend (free tier: 3,000/mo, 100/day). SMTP and a generic
// webhook are fallbacks so this works wherever it is deployed.
const DEDUPE_WINDOW_MS = Number(process.env.ALERT_DEDUPE_MINUTES || 60) * 60_000
const recent = new Map() // key -> timestamp

export function shouldSend(key, now = Date.now()) {
  const last = recent.get(key)
  if (last && now - last < DEDUPE_WINDOW_MS) return false
  recent.set(key, now)
  if (recent.size > 200) for (const [k, t] of recent) { if (now - t > DEDUPE_WINDOW_MS) recent.delete(k) }
  return true
}

async function viaResend({ to, subject, text }) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.ALERT_FROM_EMAIL
  if (!key || !from) return { sent: false, reason: 'resend_not_configured' }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to: [to], subject, text }),
  })
  return res.ok ? { sent: true, channel: 'resend' }
                : { sent: false, channel: 'resend', reason: `http_${res.status}`, detail: (await res.text()).slice(0, 160) }
}

async function viaWebhook({ subject, text }) {
  const url = process.env.ALERT_WEBHOOK_URL
  if (!url) return { sent: false, reason: 'webhook_not_configured' }
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: `**${subject}**\n${text}` }) })
    return res.ok ? { sent: true, channel: 'webhook' } : { sent: false, channel: 'webhook', reason: `http_${res.status}` }
  } catch (e) { return { sent: false, channel: 'webhook', reason: String(e && e.message) } }
}

/**
 * @returns {Promise<{skipped?:string, results:object[]}>}
 */
export async function sendAlert({ key, subject, text }) {
  if (!process.env.ALERT_EMAIL) {
    console.warn(`[alerts] no ALERT_EMAIL; alert suppressed: ${subject}`)
    return { skipped: 'no_recipient', results: [] }
  }
  if (key && !shouldSend(key)) return { skipped: 'deduped', results: [] }
  const payload = { to: process.env.ALERT_EMAIL, subject, text }
  const results = []
  results.push(await viaResend(payload).catch((e) => ({ sent: false, reason: String(e && e.message) })))
  // If Resend did not deliver, try the webhook so a budget alert is never lost.
  if (!results[0].sent) results.push(await viaWebhook(payload))
  if (!results.some((r) => r.sent)) console.error(`[alerts] could not deliver: ${subject}`, JSON.stringify(results))
  return { results }
}
