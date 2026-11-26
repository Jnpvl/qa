import { descendantIds } from "@/lib/suites"
import type { Plan, Suite, TestCase } from "@/lib/types"

export function planCaseIds(plan: Plan, cases: TestCase[], suites: Suite[]) {
  const ids = new Set(plan.caseIds)
  const projectSuites = suites.filter((item) => item.projectId === plan.projectId)
  for (const suiteId of plan.suiteIds) {
    const allowed = new Set(descendantIds(projectSuites, suiteId))
    for (const item of cases) {
      if (item.projectId === plan.projectId && allowed.has(item.suiteId)) ids.add(item.id)
    }
  }
  return [...ids]
}
