// Executes one scheduled task on behalf of its owner. Everything it needs is
// injected, so the rules below are testable without a model or a network:
//   - the owner's plan decides the model and the token ceiling,
//   - the owner's daily allowance is spent (and respected) exactly like a chat turn,
//   - the gateway-wide spend breaker is checked before any provider is contacted.
// The task has no access to anything in the owner's browser: no memory, no skills,
// no connectors. It sees its prompt and, when Tavily is configured, live web search.
export const TASK_SYSTEM_PROMPT =
  'You are running as a scheduled task for a user who is not present. You cannot see their ' +
  'files, memory, skills or connected apps, so work only from the prompt and, when needed, ' +
  'live web search. Answer in the language of the prompt. Be concise and cite sources by name and date.'

export async function executeScheduledTask(task, deps, env = process.env) {
  const owner = task.ownerUid
  const ent = await deps.resolvePlan(owner, env)
  try {
    await deps.assertWithinAllowance(owner, ent, env)
  } catch (error) {
    if (error.allowance) return { status: 'skipped', error: 'daily_allowance_reached' }
    throw error
  }
  try {
    await deps.assertWithinBudget()
  } catch (error) {
    if (error.budget) return { status: 'skipped', error: 'gateway_budget_reached' }
    throw error
  }
  try {
    const turn = await deps.runTurn({
      model: ent.model,
      maxTokens: ent.maxTokens,
      messages: [
        { role: 'system', content: TASK_SYSTEM_PROMPT },
        { role: 'user', content: task.prompt },
      ],
    })
    const usage = turn.usage || {}
    await deps.recordSpend(ent.model, usage)
    await deps.recordUsage(owner, usage, env)
    return {
      status: 'completed',
      text: String(turn.message?.content || '').slice(0, 6000),
      citations: (turn.citations || []).slice(0, 8),
      model: ent.model,
      tokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
    }
  } catch (error) {
    return { status: 'failed', error: String(error.message || error).slice(0, 300) }
  }
}
