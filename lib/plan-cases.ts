import { descendantIds } from "@/lib/suites"
import type { Plan, Suite, TestCase } from "@/lib/types"

export function planCaseIds(plan: Plan, cases: TestCase[], suites: Suite[]) {
  if (plan.caseIds.length || plan.suiteIds.length) {
    // Plans resolve their selected suites at run creation; the resulting run freezes the exact case list.
  }
  const active = cases.filter((item) => item.projectId === plan.projectId && item.status !== "obsoleto")
  const allowedIds = new Set(active.map((item) => item.id))
  const ids = new Set(plan.caseIds.filter((id) => allowedIds.has(id)))
  const projectSuites = suites.filter((item) => item.projectId === plan.projectId)
  for (const suiteId of plan.suiteIds) {
    const allowed = new Set(descendantIds(projectSuites, suiteId))
    for (const item of active) {
      if (allowed.has(item.suiteId)) ids.add(item.id)
    }
  }
  return [...ids]
}
