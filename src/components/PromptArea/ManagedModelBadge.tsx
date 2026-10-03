import { AGENTASIA } from '@/config/agentasia'
import { usePlan } from '@/lib/usage/planStore'

/**
 * Read only stand in for the model picker.
 *
 * AgentAsia's model is a plan decision made on the server, not a user choice, so
 * the chat box shows which model answers and offers nothing to change: no other
 * providers, no adding one. The picker itself stays in the code for development
 * builds that set VITE_SHOW_BYOK=1.
 */
export function modelDisplayName(modelId: string): string {
  const tail = modelId.split('/').pop() || modelId
  const words = tail
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .map((w) => (/^[a-z]/.test(w) ? w[0].toUpperCase() + w.slice(1) : w))
  const name = words.join(' ')
  return /^nvidia\b/i.test(name) ? name : `NVIDIA ${name}`
}

export function ManagedModelBadge() {
  const plan = usePlan()
  const model = AGENTASIA.plans[plan]?.model ?? AGENTASIA.plans.free.model
  return (
    <div
      className="text-default-500 flex items-center gap-1.5 px-2 text-xs"
      title={modelDisplayName(model)}
    >
      <span className="max-w-[12rem] truncate">{modelDisplayName(model)}</span>
    </div>
  )
}
