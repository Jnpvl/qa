"use client"

import Link from "next/link"
import { PageHeader } from "@/components/bits"
import { MissingProject } from "@/components/missing-project"
import { ResultBadge } from "@/components/status-pills"
import { Button } from "@/components/ui/button"
import { runStats } from "@/lib/metrics"
import { downloadText, toCsv } from "@/lib/csv"
import { caseCode, formatDateTime } from "@/lib/text"
import { resultLabel } from "@/lib/labels"
import { useRouteParam, useWorkspace } from "@/components/use-workspace"

export function RunReport() {
  const runId = useRouteParam("runId") ?? ""
  const { data, project } = useWorkspace()
  if (!data || !project) return <MissingProject />
  const run = data.runs.find((item) => item.id === runId && item.projectId === project.id)
  if (!run) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader title="No encontramos esta corrida" />
      </div>
    )
  }
  const stats = runStats(run)
  const failures = run.results.filter((item) => item.status === "failed" || item.status === "blocked")
  const assignee = data.members.find((item) => item.id === run.assigneeId)

  function exportCsv() {
    const rows = [
      ["Entorno", run!.environment || "Sin entorno"],
      ["Versión", run!.build || "Sin versión"],
      ["Aprobado", stats.passRate === null ? "Sin aprobación" : `${stats.passRate}%`],
      ["Avance", `${stats.percent}%`],
      [],
      ["Caso", "Título", "Resultado", "Responsable", "Minutos", "Comentario", "Defectos"],
      ...run!.results.map((result) => {
        const testCase = data!.cases.find((item) => item.id === result.caseId)
        const snapshot = result.caseSnapshot
        const who = data!.members.find((item) => item.id === result.assigneeId)
        const defects = data!.defects
          .filter((item) => item.caseId === result.caseId && item.runId === run!.id)
          .map((item) => item.title)
          .join("; ")
        return [
          testCase ? caseCode(project!.key, testCase.number) : result.caseId,
          snapshot?.title ?? testCase?.title ?? "",
          resultLabel[result.status],
          who?.name ?? "",
          result.minutes === null ? "" : String(result.minutes),
          result.comment,
          defects,
        ]
      }),
    ]
    downloadText(`${run!.name}.csv`, toCsv(rows), "text/csv;charset=utf-8")
  }

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-screen-2xl gap-5 p-4 md:p-6 print:max-w-none print:p-0">
      <PageHeader
        title={run.name}
        description="Resumen de la corrida para compartir o archivar."
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              Imprimir o PDF
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              Exportar CSV
            </Button>
            <Button asChild variant="outline">
              <Link href={`/proyectos/${project.id}/corridas/${run.id}`}>Volver</Link>
            </Button>
          </div>
        }
      />
      <section className="grid gap-2 rounded-xl border bg-card p-4">
        <p className="text-sm">
          {formatDateTime(run.createdAt)}
          {run.closedAt ? ` · Cerrada ${formatDateTime(run.closedAt)}` : " · En progreso"}
        </p>
        <p className="text-sm text-muted-foreground">
          {assignee ? assignee.name : "Sin responsable"}
          {run.environment ? ` · ${run.environment}` : ""}
          {run.build ? ` · ${run.build}` : ""}
        </p>
        <p className="text-2xl font-semibold tabular-nums">
          {stats.passRate === null ? "Sin aprobación todavía" : `${stats.passRate}% aprobado`}
        </p>
        <p className="text-xs text-muted-foreground">
          Sobre casos ejecutados, sin bloqueados ni omitidos.
        </p>
        <p className="text-sm">
          {stats.percent}% de avance · {stats.done} de {stats.total} con resultado
        </p>
        <p className="text-sm text-muted-foreground">
          {stats.passed} pasó · {stats.failed} falló · {stats.blocked} bloqueado · {stats.skipped} omitido · {stats.pending} pendiente
        </p>
      </section>
      <section className="grid gap-3">
        <h2 className="text-sm font-medium">Fallos y bloqueos</h2>
        {failures.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay casos fallidos ni bloqueados.</p>
        ) : (
          <ul className="grid gap-3">
            {failures.map((result) => {
              const testCase = data.cases.find((item) => item.id === result.caseId)
              const snapshot = result.caseSnapshot
              const defects = data.defects.filter((item) => item.caseId === result.caseId && item.runId === run.id)
              return (
                <li key={result.caseId} className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {testCase ? caseCode(project.key, testCase.number) : result.caseId}
                    </span>
                    <span className="font-medium">{snapshot?.title ?? testCase?.title}</span>
                    <ResultBadge status={result.status} />
                  </div>
                  {snapshot?.steps?.length ? <ol className="mt-2 list-decimal pl-5 text-sm">{snapshot.steps.map((step) => <li key={step.id}>{step.action} → {step.expected}</li>)}</ol> : null}
                  {result.comment ? <p className="mt-2 text-sm">{result.comment}</p> : null}
                  {defects.length > 0 ? (
                    <ul className="mt-2 grid gap-1 text-sm">
                      {defects.map((defect) => (
                        <li key={defect.id}>
                          Defecto: {defect.title}
                          {defect.externalUrl ? ` · ${defect.externalUrl}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Sin defecto ligado.</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
