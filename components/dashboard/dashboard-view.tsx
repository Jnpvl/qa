"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { EnumSelect } from "@/components/enum-select"
import { MissingProject } from "@/components/missing-project"
import { ResultBadge } from "@/components/status-pills"
import { PageHeader, StackedBar } from "@/components/bits"
import { coverageSnapshot, executionMix, failureBoard, runStats } from "@/lib/metrics"
import { planCaseIds } from "@/lib/plan-cases"
import { caseCode } from "@/lib/text"
import { useWorkspace } from "@/components/use-workspace"

const parts = {
  passed: "bg-emerald-500",
  failed: "bg-red-500",
  blocked: "bg-amber-500",
  skipped: "bg-stone-400",
  pending: "bg-stone-200",
}

export function DashboardView() {
  const { data, project } = useWorkspace()
  const sprints = useMemo(
    () =>
      data && project
        ? data.sprints
            .filter((item) => item.projectId === project.id)
            .sort((a, b) => a.startDate.localeCompare(b.startDate))
        : [],
    [data, project],
  )
  const initial = sprints.find((item) => item.status === "activo")?.id ?? sprints[0]?.id ?? "todos"
  const [sprintId, setSprintId] = useState(initial)
  const [planId, setPlanId] = useState("todos")
  const [assigneeId, setAssigneeId] = useState("todos")

  if (!data || !project) return <MissingProject />

  const plans = data.plans.filter((item) => item.projectId === project.id)
  const members = data.members.filter((item) => item.projectId === project.id)
  const selectedPlan = plans.find((item) => item.id === planId)
  const planIds = selectedPlan ? new Set(planCaseIds(selectedPlan, data.cases, data.suites)) : null
  const runs = data.runs
    .filter((item) => item.projectId === project.id)
    .filter((item) => sprintId === "todos" || item.sprintId === sprintId)
    .filter((item) => planId === "todos" || item.planId === planId)
    .filter(
      (item) =>
        assigneeId === "todos" ||
        item.assigneeId === assigneeId ||
        item.results.some((result) => result.assigneeId === assigneeId),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const cases = data.cases.filter((item) => {
    if (item.projectId !== project.id) return false
    if (planIds && !planIds.has(item.id)) return false
    if (sprintId === "todos") return true
    return item.sprintIds.includes(sprintId)
  })
  const snapshot = coverageSnapshot(cases, runs)
  const mix = executionMix(cases)
  const failures = failureBoard(runs)
    .map((row) => ({ ...row, testCase: data.cases.find((item) => item.id === row.caseId) }))
    .filter((row) => row.testCase)

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-5 p-4 md:p-6">
      <PageHeader
        title="Tablero"
        description="Avance del sprint, tasa de aprobación y fallo, cobertura por tipo de ejecución y los casos que más fallan."
        actions={
          <div className="grid w-full min-w-0 gap-2 sm:w-auto sm:grid-cols-3">
            <EnumSelect
              ariaLabel="Sprint del tablero"
              value={sprintId}
              onChange={setSprintId}
              options={[
                { value: "todos", label: "Todo el proyecto" },
                ...sprints.map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
            <EnumSelect
              ariaLabel="Plan del tablero"
              value={planId}
              onChange={setPlanId}
              options={[
                { value: "todos", label: "Todos los planes" },
                ...plans.map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
            <EnumSelect
              ariaLabel="Responsable del tablero"
              value={assigneeId}
              onChange={setAssigneeId}
              options={[
                { value: "todos", label: "Todo el equipo" },
                ...members.map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Casos" value={String(snapshot.assigned)} hint={sprintId === "todos" ? "En el proyecto" : "Ligados al sprint"} />
        <Stat
          label="Avance"
          value={
            snapshot.assigned === 0
              ? "—"
              : `${Math.round((snapshot.withResult / snapshot.assigned) * 100)}%`
          }
          hint={`${snapshot.withResult} de ${snapshot.assigned} con resultado`}
        />
        <Stat
          label="Aprobación"
          value={snapshot.passRate === null ? "—" : `${snapshot.passRate}%`}
          hint="Sobre casos ejecutados, sin bloqueados ni omitidos"
        />
        <Stat label="Corridas" value={String(runs.length)} hint="Del recorte actual" />
      </div>

      <section className="grid gap-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-medium">Cobertura por ejecución</h2>
        <StackedBar
          parts={[
            { value: mix.manual, className: "bg-stone-400", label: "Manual" },
            { value: mix.automatizado, className: "bg-teal-600", label: "Automatizado" },
            { value: mix.ambos, className: "bg-amber-500", label: "Ambos" },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          {mix.manual} manual · {mix.automatizado} automatizado · {mix.ambos} ambos
          {mix.total === 0 ? " · No hay casos en este recorte." : ""}
        </p>
      </section>

      <section className="grid gap-4 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-medium">Corridas</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay corridas aquí.{" "}
            <Link href={`/proyectos/${project.id}/corridas`} className="text-primary underline-offset-2 hover:underline">
              Crear una corrida
            </Link>
          </p>
        ) : (
          <ul className="grid gap-3">
            {runs.map((run) => {
              const stats = runStats(run)
              return (
                <li key={run.id} className="grid gap-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <Link href={`/proyectos/${project.id}/corridas/${run.id}`} className="font-medium hover:underline">
                      {run.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {stats.passed} pasó · {stats.failed} falló · {stats.blocked} bloqueado · {stats.skipped} omitido · {stats.pending} pendiente
                    </span>
                  </div>
                  <StackedBar
                    parts={[
                      { value: stats.passed, className: parts.passed, label: "Pasó" },
                      { value: stats.failed, className: parts.failed, label: "Falló" },
                      { value: stats.blocked, className: parts.blocked, label: "Bloqueado" },
                      { value: stats.skipped, className: parts.skipped, label: "Omitido" },
                      { value: stats.pending, className: parts.pending, label: "Pendiente" },
                    ]}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="grid min-w-0 gap-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-medium">Casos con más fallos</h2>
        {failures.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ningún caso ha fallado en estas corridas.</p>
        ) : (
          <>
          <ul className="grid gap-3 md:hidden">
            {failures.map((row) =>
              row.testCase ? (
                <li key={row.caseId} className="grid min-w-0 gap-1 border-t pt-3 first:border-0 first:pt-0">
                  <Link href={`/proyectos/${project.id}/casos/${row.testCase.id}`} className="break-words hover:underline">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      {caseCode(project.key, row.testCase.number)}
                    </span>
                    {row.testCase.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {row.failCount} {row.failCount === 1 ? "fallo" : "fallos"} · {row.passCount > 0 ? "También pasó en otra corrida" : "Sin una ejecución exitosa posterior"}
                  </p>
                  <ResultBadge status={row.latest} />
                </li>
              ) : null,
            )}
          </ul>
          <div className="hidden min-w-0 overflow-x-auto md:block">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Caso</th>
                  <th className="py-2 font-medium">Fallos</th>
                  <th className="py-2 font-medium">Último</th>
                  <th className="py-2 font-medium">Nota</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((row) =>
                  row.testCase ? (
                    <tr key={row.caseId} className="border-t">
                      <td className="py-2 pr-3">
                        <Link href={`/proyectos/${project.id}/casos/${row.testCase.id}`} className="hover:underline">
                          <span className="mr-2 font-mono text-xs text-muted-foreground">
                            {caseCode(project.key, row.testCase.number)}
                          </span>
                          {row.testCase.title}
                        </Link>
                      </td>
                      <td className="py-2 tabular-nums">{row.failCount}</td>
                      <td className="py-2">
                        <ResultBadge status={row.latest} />
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {row.passCount > 0 ? "También pasó en otra corrida" : "Sin una ejecución exitosa posterior"}
                      </td>
                    </tr>
                  ) : null,
                )}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
