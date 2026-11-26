import type { Suite } from "@/lib/types"

export function childSuites(
  suites: Suite[],
  projectId: string,
  parentId: string | null,
) {
  return suites
    .filter((suite) => suite.projectId === projectId && suite.parentId === parentId)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "es"))
}

export function descendantIds(suites: Suite[], rootId: string) {
  const ids = [rootId]
  const walk = (id: string) => {
    for (const child of suites.filter((suite) => suite.parentId === id)) {
      ids.push(child.id)
      walk(child.id)
    }
  }
  walk(rootId)
  return ids
}

export function flattenSuites(suites: Suite[], projectId: string) {
  const rows: { suite: Suite; depth: number }[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const suite of childSuites(suites, projectId, parentId)) {
      rows.push({ suite, depth })
      walk(suite.id, depth + 1)
    }
  }
  walk(null, 0)
  return rows
}

export function suitePath(suites: Suite[], id: string) {
  const names: string[] = []
  let current = suites.find((suite) => suite.id === id)
  let guard = 0
  while (current && guard < 20) {
    names.unshift(current.name)
    current = current.parentId
      ? suites.find((suite) => suite.id === current?.parentId)
      : undefined
    guard += 1
  }
  return names
}

export function suitePrefixFromName(name: string) {
  const prefix = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24)
  return /^[A-Z]/.test(prefix) ? prefix : `S-${prefix}`
}

export function effectiveSuitePrefix(suites: Suite[], suiteId: string) {
  let current = suites.find((suite) => suite.id === suiteId)
  let guard = 0
  while (current && guard < 20) {
    if (current.idPrefix?.trim()) return current.idPrefix.trim().toUpperCase()
    if (!current.parentId) return suitePrefixFromName(current.name)
    current = suites.find((suite) => suite.id === current?.parentId)
    guard += 1
  }
  return "CASO"
}

export function wouldCycle(
  suites: Suite[],
  suiteId: string,
  nextParentId: string | null,
) {
  if (!nextParentId) return false
  return descendantIds(suites, suiteId).includes(nextParentId)
}
