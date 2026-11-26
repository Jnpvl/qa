import type { ResultStatus, TestCase, TestRun } from "@/lib/types"

export interface RunStats {
  total: number
  passed: number
  failed: number
  blocked: number
  skipped: number
  pending: number
  done: number
  percent: number
  passRate: number | null
}

export function runStats(run: TestRun): RunStats {
  const count = (status: ResultStatus) =>
    run.results.filter((result) => result.status === status).length
  const total = run.results.length
  const passed = count("passed")
  const failed = count("failed")
  const blocked = count("blocked")
  const skipped = count("skipped")
  const pending = count("pendiente")
  const done = total - pending
  const decided = passed + failed
  return {
    total,
    passed,
    failed,
    blocked,
    skipped,
    pending,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    passRate: decided === 0 ? null : Math.round((passed / decided) * 100),
  }
}

export function executionMix(cases: TestCase[]) {
  return {
    manual: cases.filter((item) => item.executionType === "manual").length,
    automatizado: cases.filter((item) => item.executionType === "automatizado")
      .length,
    ambos: cases.filter((item) => item.executionType === "ambos").length,
    total: cases.length,
  }
}

export interface SprintSnapshot {
  assigned: number
  withResult: number
  passed: number
  failed: number
  blocked: number
  skipped: number
  passRate: number | null
}

export function coverageSnapshot(cases: TestCase[], runs: TestRun[]): SprintSnapshot {
  const ids = new Set(cases.map((item) => item.id))
  const latest = new Map<string, ResultStatus>()
  const ordered = [...runs].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const run of ordered) {
    for (const result of run.results) {
      if (!ids.has(result.caseId) || result.status === "pendiente") continue
      latest.set(result.caseId, result.status)
    }
  }
  let passed = 0
  let failed = 0
  let blocked = 0
  let skipped = 0
  for (const status of latest.values()) {
    if (status === "passed") passed += 1
    else if (status === "failed") failed += 1
    else if (status === "blocked") blocked += 1
    else if (status === "skipped") skipped += 1
  }
  const decided = passed + failed
  return {
    assigned: cases.length,
    withResult: latest.size,
    passed,
    failed,
    blocked,
    skipped,
    passRate: decided === 0 ? null : Math.round((passed / decided) * 100),
  }
}

export interface FailureRow {
  caseId: string
  failCount: number
  passCount: number
  latest: ResultStatus
}

export function failureBoard(runs: TestRun[]): FailureRow[] {
  const fails = new Map<string, number>()
  const passes = new Map<string, number>()
  const latest = new Map<string, ResultStatus>()
  const ordered = [...runs].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const run of ordered) {
    for (const result of run.results) {
      if (result.status === "failed") {
        fails.set(result.caseId, (fails.get(result.caseId) ?? 0) + 1)
      }
      if (result.status === "passed") {
        passes.set(result.caseId, (passes.get(result.caseId) ?? 0) + 1)
      }
      if (result.status !== "pendiente") latest.set(result.caseId, result.status)
    }
  }
  return [...fails.entries()]
    .map(([caseId, failCount]) => ({
      caseId,
      failCount,
      passCount: passes.get(caseId) ?? 0,
      latest: latest.get(caseId) ?? "pendiente",
    }))
    .sort((a, b) => b.failCount - a.failCount || a.caseId.localeCompare(b.caseId))
}
