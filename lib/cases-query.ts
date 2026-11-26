import { priorityRank } from "@/lib/labels"
import { descendantIds } from "@/lib/suites"
import { caseCode, normalize } from "@/lib/text"
import type {
  CaseStatus,
  ExecutionType,
  Priority,
  Suite,
  TestCase,
} from "@/lib/types"

export interface CaseQuery {
  cases: TestCase[]
  projectKey: string
  suites: Suite[]
  suiteId: string | "todas"
  query: string
  priority: Priority | "todas"
  execution: ExecutionType | "todas"
  status: CaseStatus | "todos"
  sprintId: string | "todos"
  tag: string | "todas"
}

export function filterCases(input: CaseQuery) {
  const allowed =
    input.suiteId === "todas"
      ? null
      : new Set(descendantIds(input.suites, input.suiteId))
  const needle = normalize(input.query.trim())
  return input.cases.filter((item) => {
    if (allowed && !allowed.has(item.suiteId)) return false
    if (input.priority !== "todas" && item.priority !== input.priority) return false
    if (input.execution !== "todas" && item.executionType !== input.execution) {
      return false
    }
    if (input.status !== "todos" && item.status !== input.status) return false
    if (input.sprintId !== "todos" && !item.sprintIds.includes(input.sprintId)) {
      return false
    }
    if (
      input.tag !== "todas" &&
      !item.tags.some((tag) => normalize(tag) === normalize(input.tag))
    ) {
      return false
    }
    if (!needle) return true
    const haystack = normalize(
      [
        caseCode(input.projectKey, item.number),
        item.title,
        item.preconditions,
        ...item.tags,
      ].join(" "),
    )
    return haystack.includes(needle)
  })
}

export type CaseSortKey = "number" | "title" | "priority" | "updated"

export function sortCases(
  cases: TestCase[],
  sort: { key: CaseSortKey; dir: "asc" | "desc" },
) {
  const direction = sort.dir === "asc" ? 1 : -1
  return [...cases].sort((a, b) => {
    let diff = 0
    if (sort.key === "number") diff = a.number - b.number
    else if (sort.key === "title") diff = a.title.localeCompare(b.title, "es")
    else if (sort.key === "priority") {
      diff = priorityRank[a.priority] - priorityRank[b.priority]
    } else diff = a.updatedAt.localeCompare(b.updatedAt)
    return diff * direction
  })
}
