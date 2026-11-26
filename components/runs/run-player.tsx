"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PageHeader, reportError } from "@/components/bits"
import { EnumSelect } from "@/components/enum-select"
import { MissingProject } from "@/components/missing-project"
import { ResultBadge } from "@/components/status-pills"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatBytes, readAttachment } from "@/lib/attachments"
import { FilePicker } from "@/components/file-picker"
import { defectStatusLabel, priorities, priorityLabel, resultLabel, severities, severityLabel } from "@/lib/labels"
import { runStats } from "@/lib/metrics"
import { product } from "@/lib/product"
import { caseCode } from "@/lib/text"
import { useRouteParam, useWorkspace } from "@/components/use-workspace"
import { cn } from "@/lib/utils"
import type { AutomationReport, Priority, ResultStatus, Severity, StepResultStatus, TestCase } from "@/lib/types"

const choices: {
  status: Exclude<ResultStatus, "pendiente">
  label: string
  active: string
}[] = [
  { status: "passed", label: "Pasó", active: "border-emerald-600 bg-emerald-50 text-emerald-900" },
  { status: "failed", label: "Falló", active: "border-red-600 bg-red-50 text-red-900" },
  { status: "blocked", label: "Bloqueado", active: "border-amber-600 bg-amber-50 text-amber-950" },
  { status: "skipped", label: "Omitido", active: "border-stone-400 bg-stone-100 text-stone-800" },
]

function shortcutKey(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  if (key === "arrowdown" || key === "arrowup" || key.length === 1) return key
  if (event.code === "ArrowDown") return "arrowdown"
  if (event.code === "ArrowUp") return "arrowup"
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3).toLowerCase()
  return key
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      Boolean(target.closest("input, textarea, select, [contenteditable='true']")))
  )
}

function hasOpenDialog() {
  return Boolean(
    document.querySelector("[role='dialog'][data-state='open'], [role='alertdialog'][data-state='open']"),
  )
}

function pendingCloseCopy(pending: number) {
  if (pending === 1) return "Queda 1 caso sin resultado. Puedes reabrirla después."
  return `Quedan ${pending} casos sin resultado. Puedes reabrirla después.`
}

function statusFromSteps(stepIds: string[], results: { stepId: string; status: string }[]) {
  if (stepIds.length === 0) return null
  const byId = new Map(results.map((item) => [item.stepId, item.status]))
  const statuses = stepIds.map((id) => byId.get(id) ?? "pendiente")
  if (statuses.some((status) => status === "failed")) return "failed" as const
  if (statuses.some((status) => status === "blocked")) return "blocked" as const
  if (statuses.every((status) => status === "passed")) return "passed" as const
  return null
}

function nextPendingId(
  ordered: TestCase[],
  results: { caseId: string; status: ResultStatus }[],
  currentId: string,
  justMarked: ResultStatus,
) {
  const index = ordered.findIndex((item) => item.id === currentId)
  if (index < 0) return null
  for (let step = 1; step < ordered.length; step += 1) {
    const item = ordered[(index + step) % ordered.length]
    const status = item.id === currentId ? justMarked : results.find((result) => result.caseId === item.id)?.status
    if (status === "pendiente") return item.id
  }
  return null
}

export function RunPlayer() {
  const router = useRouter()
  const runId = useRouteParam("runId") ?? ""
  const { store, data, project } = useWorkspace()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showList, setShowList] = useState(false)
  const [comment, setComment] = useState("")
  const [commentFor, setCommentFor] = useState<string | null>(null)
  const [closeOpen, setCloseOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ResultStatus | "todos">("todos")
  const [assigneeFilter, setAssigneeFilter] = useState("todos")
  const [priorityFilter, setPriorityFilter] = useState<Priority | "todas">("todas")
  const [defectOpen, setDefectOpen] = useState(false)
  const [confirmDefect, setConfirmDefect] = useState(false)
  const [rerunOpen, setRerunOpen] = useState(false)
  const [rerunEnv, setRerunEnv] = useState("")
  const [rerunBuild, setRerunBuild] = useState("")
  const run = data?.runs.find((item) => item.id === runId && item.projectId === project?.id)
  const allOrdered = run && data
    ? run.results.map((result) => {
        const source = data.cases.find((item) => item.id === result.caseId)
        const frozen = result.caseSnapshot
        return source && frozen ? { ...source, ...frozen, steps: frozen.steps } : source
      }).filter((item): item is TestCase => Boolean(item))
    : []
  const ordered = allOrdered.filter((item) => {
    const result = run?.results.find((entry) => entry.caseId === item.id)
    if (statusFilter !== "todos" && result?.status !== statusFilter) return false
    if (assigneeFilter === "ninguno" && result?.assigneeId) return false
    if (assigneeFilter !== "todos" && assigneeFilter !== "ninguno" && result?.assigneeId !== assigneeFilter) {
      return false
    }
    if (priorityFilter !== "todas" && item.priority !== priorityFilter) return false
    return true
  })
  const fallbackId =
    ordered.find(
      (item) =>
        run?.results.find((result) => result.caseId === item.id)?.status === "pendiente",
    )?.id ??
    ordered[0]?.id ??
    null
  const resolvedId =
    activeId && ordered.some((item) => item.id === activeId) ? activeId : fallbackId
  if (resolvedId !== activeId) setActiveId(resolvedId)
  const active = ordered.find((item) => item.id === resolvedId)
  const activeResult = run?.results.find((item) => item.caseId === active?.id)
  if ((active?.id ?? null) !== commentFor) {
    setCommentFor(active?.id ?? null)
    setComment(activeResult?.comment ?? "")
  }

  useEffect(() => {
    if (!project || !run) return
    document.title = `${run.name} · ${product.name}`
  }, [project, run])

  useEffect(() => {
    if (!active) return
    document.getElementById(`run-case-${active.id}`)?.scrollIntoView({ block: "nearest" })
  }, [active])

  const keyboard = useRef({
    ordered,
    active,
    run,
    closed: false,
    comment: "",
    autoAdvance: true,
  })

  useEffect(() => {
    keyboard.current = {
      ordered,
      active,
      run,
      closed: run?.status === "cerrada",
      comment,
      autoAdvance: data?.autoAdvance !== false,
    }
  })

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const current = keyboard.current
      if (!current.run || !current.active) return
      if (event.isComposing || isTypingTarget(event.target)) return
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
      if (hasOpenDialog()) return
      const key = shortcutKey(event)
      const index = current.ordered.findIndex((item) => item.id === current.active?.id)
      if (key === "j" || key === "arrowdown") {
        event.preventDefault()
        const next = current.ordered[Math.min(current.ordered.length - 1, index + 1)]
        if (next) moveTo(next.id)
      } else if (key === "k" || key === "arrowup") {
        event.preventDefault()
        const next = current.ordered[Math.max(0, index - 1)]
        if (next) moveTo(next.id)
      } else if (current.closed) {
        return
      } else if (key === "p") {
        event.preventDefault()
        apply("passed")
      } else if (key === "f") {
        event.preventDefault()
        apply("failed")
      } else if (key === "b") {
        event.preventDefault()
        apply("blocked")
      } else if (key === "o") {
        event.preventDefault()
        apply("skipped")
      }
    }
    function moveTo(nextId: string) {
      const current = keyboard.current
      if (!current.run || !current.active) return
      const result = current.run.results.find((item) => item.caseId === current.active?.id)
      if (result && result.comment !== current.comment) {
        store.setRunResult(current.run.id, current.active.id, { comment: current.comment })
      }
      setActiveId(nextId)
      setShowList(false)
    }
    function apply(status: Exclude<ResultStatus, "pendiente">) {
      const current = keyboard.current
      if (!current.run || !current.active) return
      const ok = store.setRunResult(current.run.id, current.active.id, {
        status,
        comment: current.comment,
      })
      setShowList(false)
      if (!ok || !current.autoAdvance || !current.active) return
      const next = nextPendingId(current.ordered, current.run.results, current.active.id, status)
      if (next) setActiveId(next)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [store])

  if (!data || !project) return <MissingProject />
  if (!run) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader title="No encontramos esta corrida" />
        <Button asChild className="mt-4">
          <Link href={`/proyectos/${project.id}/corridas`}>Volver a corridas</Link>
        </Button>
      </div>
    )
  }

  const stats = runStats(run)
  const closed = run.status === "cerrada"
  const sprint = data.sprints.find((item) => item.id === run.sprintId)

  function selectCase(nextId: string) {
    if (active && activeResult && comment !== activeResult.comment && !closed) {
      store.setRunResult(run!.id, active.id, { comment })
    }
    setActiveId(nextId)
  }

  function importAutomationResults(file: File) {
    if (!run || !project || closed) return
    file.text().then((content) => {
      const report = JSON.parse(content) as AutomationReport
      const summary = store.importAutomationReport(run.id, report)
      toast.success(`${summary.updated} resultados importados · ${summary.covered} casos vinculados a Playwright`)
    }).catch(reportError)
  }

  function mark(status: Exclude<ResultStatus, "pendiente">) {
    if (!run || !active || closed) return
    try {
      store.setRunResult(run.id, active.id, { status, comment })
      if (data?.autoAdvance !== false) {
        const next = nextPendingId(ordered, run.results, active.id, status)
        if (next) setActiveId(next)
      }
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-screen-2xl gap-4 p-4 md:p-6">
      <PageHeader
        title={run.name}
        description={
          sprint
            ? `${sprint.name} · ${closed ? "Cerrada" : "En progreso"}`
            : closed
              ? "Cerrada"
              : "En progreso"
        }
        actions={
          <>
            <Button variant="outline" onClick={() => router.push(`/proyectos/${project.id}/corridas`)}>
              Volver
            </Button>
            <Button asChild variant="outline">
              <Link href={`/proyectos/${project.id}/corridas/${run.id}/reporte`}>Reporte</Link>
            </Button>
            {!closed ? <FilePicker label="Importar resultados Playwright" accept="application/json,.json" onFile={importAutomationResults} /> : null}
            {run.results.some((item) => item.status === "failed" || item.status === "blocked") ? (
              <Button
                variant="outline"
                onClick={() => {
                  setRerunEnv(run.environment)
                  setRerunBuild(run.build)
                  setRerunOpen(true)
                }}
              >
                Reejecutar fallidos
              </Button>
            ) : null}
            {closed ? (
              <Button
                variant="outline"
                onClick={() => {
                  store.reopenRun(run.id)
                  toast.success("Corrida reabierta")
                }}
              >
                Reabrir
              </Button>
            ) : (
              <Button onClick={() => setCloseOpen(true)}>Cerrar corrida</Button>
            )}
          </>
        }
      />
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            {stats.done} de {stats.total} con resultado
          </span>
          <span className="min-w-0 text-muted-foreground">
            {stats.passed} pasó · {stats.failed} falló · {stats.blocked} bloqueado · {stats.skipped} omitido · {stats.pending} pendiente
          </span>
        </div>
        <Progress className="mt-3 h-2" value={stats.percent} aria-label="Avance de la corrida" />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <FormLike label="Responsable">
            <EnumSelect
              ariaLabel="Responsable de la corrida"
              value={run.assigneeId ?? "ninguno"}
              onChange={(value) => store.updateRunMeta(run.id, { assigneeId: value === "ninguno" ? null : value })}
              options={memberOptions(data.members.filter((item) => item.projectId === project.id))}
            />
          </FormLike>
          <FormLike label="Entorno">
            <Input
              value={run.environment}
              aria-label="Entorno"
              placeholder="Staging"
              onChange={(event) => store.updateRunMeta(run.id, { environment: event.target.value })}
            />
          </FormLike>
          <FormLike label="Build o versión">
            <Input
              value={run.build}
              aria-label="Build o versión"
              placeholder="2026.11.24"
              onChange={(event) => store.updateRunMeta(run.id, { build: event.target.value })}
            />
          </FormLike>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="w-full min-w-0 sm:w-40">
            <EnumSelect
              size="sm"
              ariaLabel="Filtrar por resultado"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "todos", label: "Resultado" },
                ...(["pendiente", "passed", "failed", "blocked", "skipped"] as ResultStatus[]).map((item) => ({
                  value: item,
                  label: resultLabel[item],
                })),
              ]}
            />
          </div>
          <div className="w-full min-w-0 sm:w-44">
            <EnumSelect
              size="sm"
              ariaLabel="Filtrar por responsable"
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              options={memberOptions(data.members.filter((item) => item.projectId === project.id), "Responsable")}
            />
          </div>
          <div className="w-full min-w-0 sm:w-36">
            <EnumSelect
              size="sm"
              ariaLabel="Filtrar por prioridad"
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={[
                { value: "todas", label: "Prioridad" },
                ...priorities.map((item) => ({ value: item, label: priorityLabel[item] })),
              ]}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={data.autoAdvance}
              onCheckedChange={(value) => store.setAutoAdvance(value === true)}
            />
            Avanzar automáticamente
          </label>
        </div>
        {!closed && stats.pending === 0 && stats.total > 0 ? (
          <p className="mt-2 text-sm text-emerald-800">Todos los casos tienen resultado. Ya puedes cerrar la corrida.</p>
        ) : null}
      </div>
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className={cn("rounded-xl border bg-card", !showList && "max-lg:hidden")}>
          <ul className="max-h-[70dvh] overflow-y-auto">
            {ordered.map((item) => {
              const result = run.results.find((entry) => entry.caseId === item.id)
              const current = item.id === active?.id
              return (
                <li key={item.id} id={`run-case-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      selectCase(item.id)
                      setShowList(false)
                    }}
                    className={cn(
                      "flex w-full items-start gap-2 border-b px-3 py-2 text-left last:border-0 hover:bg-muted/50",
                      current && "bg-accent",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[11px] text-muted-foreground">
                        {caseCode(project.key, item.number)}
                      </span>
                      <span className="block text-sm">{item.title}</span>
                    </span>
                    {result ? <ResultBadge status={result.status} /> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        {active && activeResult ? (
          <div className={cn("grid gap-4 rounded-xl border bg-card p-4", showList && "max-lg:hidden")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-muted-foreground">
                  {caseCode(project.key, active.number)}
                </p>
                <h2 className="text-base font-medium">{active.title}</h2>
              </div>
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setShowList(true)}>
                Lista
              </Button>
            </div>
            {active.preconditions ? (
              <div className="rounded-lg bg-muted/60 p-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground">Precondiciones</p>
                <p className="mt-1">{active.preconditions}</p>
              </div>
            ) : null}
            {active.steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Este caso no tiene pasos.</p>
            ) : (
              <ol className="grid gap-3">
                {active.steps.map((step, index) => (
                  <li key={step.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Paso {index + 1}</p>
                      <p className="mt-1 break-words text-sm">{step.action}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Resultado esperado</p>
                      <p className="mt-1 break-words text-sm">{step.expected}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {choices.map((choice) => (
                <button
                  key={choice.status}
                  type="button"
                  disabled={closed}
                  onClick={() => mark(choice.status)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm disabled:opacity-60",
                    activeResult.status === choice.status ? choice.active : "hover:bg-muted",
                  )}
                >
                  <span className="block font-medium">{choice.label}</span>
                </button>
              ))}
            </div>
            {active.steps.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-sm font-medium">Resultado por paso</p>
                {active.steps.map((step, index) => {
                  const current = activeResult.stepResults.find((item) => item.stepId === step.id)?.status ?? "pendiente"
                  return (
                    <div key={step.id} className="grid gap-2 rounded-lg border p-3">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Paso {index + 1}. </span>
                        {step.action}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(["passed", "failed", "blocked"] as StepResultStatus[]).map((status) => (
                          <Button
                            key={status}
                            type="button"
                            size="sm"
                            variant={current === status ? "default" : "outline"}
                            disabled={closed}
                            onClick={() => {
                              const stepResults = active.steps.map((item) => ({
                                stepId: item.id,
                                status:
                                  item.id === step.id
                                    ? status
                                    : (activeResult.stepResults.find((entry) => entry.stepId === item.id)?.status ??
                                      "pendiente"),
                              }))
                              const derived = statusFromSteps(
                                active.steps.map((item) => item.id),
                                stepResults,
                              )
                              store.setRunResult(run.id, active.id, {
                                stepResults,
                                ...(derived ? { status: derived } : {}),
                              })
                            }}
                          >
                            {status === "passed" ? "Pasó" : status === "failed" ? "Falló" : "Bloqueado"}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <FormLike label="Responsable del caso">
                <EnumSelect
                  ariaLabel="Responsable del caso"
                  value={activeResult.assigneeId ?? "ninguno"}
                  onChange={(value) =>
                    store.setRunResult(run.id, active.id, { assigneeId: value === "ninguno" ? null : value })
                  }
                  options={memberOptions(data.members.filter((item) => item.projectId === project.id))}
                />
              </FormLike>
              <FormLike label="Minutos">
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label="Minutos empleados"
                  disabled={closed}
                  value={activeResult.minutes ?? ""}
                  onChange={(event) => {
                    const raw = event.target.value
                    store.setRunResult(run.id, active.id, {
                      minutes: raw === "" ? null : Math.max(0, Number(raw) || 0),
                    })
                  }}
                />
              </FormLike>
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-medium">Adjunto del resultado</p>
              {activeResult.attachment ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <a className="underline-offset-2 hover:underline" href={activeResult.attachment.dataUrl} download={activeResult.attachment.name}>
                    {activeResult.attachment.name}
                  </a>
                  <span className="text-xs text-muted-foreground">{formatBytes(activeResult.attachment.size)}</span>
                  {!closed ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => store.setRunResult(run.id, active.id, { attachment: null })}
                    >
                      Quitar
                    </Button>
                  ) : null}
                </div>
              ) : (
                <FilePicker
                  label="Adjuntar archivo"
                  disabled={closed}
                  onFile={(file) => {
                    readAttachment(file)
                      .then((attachment) => store.setRunResult(run.id, active.id, { attachment }))
                      .catch(reportError)
                  }}
                />
              )}
              <p className="text-xs text-muted-foreground">Hasta 350 KB. Se guarda junto al resultado de la corrida.</p>
            </div>
            {activeResult.status === "failed" ? (
              <DefectLinks
                defects={data.defects.filter((item) => item.caseId === active.id && item.runId === run.id)}
                projectId={project.id}
                onCreate={() => setDefectOpen(true)}
                onConfirm={() => setConfirmDefect(true)}
              />
            ) : null}
            <div className="grid gap-1.5">
              <label htmlFor="run-comment" className="text-sm font-medium">
                Comentario
              </label>
              <Textarea
                id="run-comment"
                value={comment}
                disabled={closed}
                onChange={(event) => setComment(event.target.value)}
                onBlur={() => {
                  if (!closed && comment !== activeResult.comment) {
                    store.setRunResult(run.id, active.id, { comment })
                  }
                }}
                placeholder="Qué viste, en qué ambiente y qué quedó pendiente"
              />
              <p className="text-xs text-muted-foreground">
                Se guarda al salir del campo o al marcar un estado. Atajos: J/K cambian de caso, P/F/B/O marcan el resultado.
              </p>
            </div>
            <Button asChild variant="outline" className="justify-self-start">
              <Link href={`/proyectos/${project.id}/casos/${active.id}`}>Abrir el caso</Link>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Esta corrida no tiene casos.</p>
        )}
      </div>

      <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar la corrida?</AlertDialogTitle>
            <AlertDialogDescription>
              {stats.pending > 0
                ? pendingCloseCopy(stats.pending)
                : "Queda como historial. Puedes reabrirla si hace falta corregir un resultado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {stats.pending > 0 ? <p className="text-sm text-muted-foreground">La corrida se guardará como parcial. Los casos pendientes quedarán registrados en el cierre.</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                store.closeRun(run.id, stats.pending > 0 ? "parcial" : "completa", stats.pending > 0 ? `${stats.pending} casos quedaron pendientes.` : "")
                toast.success("Corrida cerrada")
              }}
            >
              Cerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={rerunOpen} onOpenChange={setRerunOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reejecutar fallidos y bloqueados</AlertDialogTitle>
            <AlertDialogDescription>
              Se crea una corrida nueva con esos casos. Puedes ajustar el entorno y la versión antes de crearla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-3">
            <FormLike label="Entorno">
              <Input aria-label="Entorno de la nueva corrida" value={rerunEnv} onChange={(event) => setRerunEnv(event.target.value)} />
            </FormLike>
            <FormLike label="Build o versión">
              <Input aria-label="Versión de la nueva corrida" value={rerunBuild} onChange={(event) => setRerunBuild(event.target.value)} />
            </FormLike>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const ids = run.results
                  .filter((item) => item.status === "failed" || item.status === "blocked")
                  .map((item) => item.caseId)
                try {
                  const created = store.createRun({
                    projectId: project.id,
                    name: `Reejecución: ${run.name}`,
                    sprintId: run.sprintId,
                    planId: run.planId,
                    caseIds: ids,
                    assigneeId: run.assigneeId,
                    environment: rerunEnv,
                    build: rerunBuild,
                  })
                  toast.success("Corrida creada con fallidos y bloqueados")
                  router.push(`/proyectos/${project.id}/corridas/${created.id}`)
                } catch (error) {
                  reportError(error)
                }
              }}
            >
              Crear corrida
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmDefect} onOpenChange={setConfirmDefect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Registrar otro defecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Este resultado ya tiene un defecto ligado. El nuevo queda junto al anterior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDefect(false)
                setDefectOpen(true)
              }}
            >
              Registrar otro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DefectDialog
        open={defectOpen}
        title={active ? `Fallo en ${active.title}` : ""}
        severity={active?.severity ?? "mayor"}
        onOpenChange={setDefectOpen}
        onCreate={(input) => {
          store.createDefect({
            projectId: project.id,
            caseId: active!.id,
            runId: run.id,
            ...input,
          })
          toast.success("Defecto registrado")
          setDefectOpen(false)
        }}
      />
    </div>
  )
}

function DefectLinks({
  defects,
  projectId,
  onCreate,
  onConfirm,
}: {
  defects: { id: string; title: string; externalUrl: string }[]
  projectId: string
  onCreate: () => void
  onConfirm: () => void
}) {
  if (defects.length === 0) {
    return (
      <Button type="button" variant="outline" className="justify-self-start" onClick={onCreate}>
        Registrar defecto
      </Button>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {defects.map((defect) => (
        <Link
          key={defect.id}
          href={defect.externalUrl || `/proyectos/${projectId}/defectos`}
          className="inline-flex max-w-full items-center rounded-full border bg-card px-2 py-1 text-xs underline-offset-2 hover:underline"
        >
          <span className="truncate">{defect.title}</span>
        </Link>
      ))}
      <Button asChild type="button" variant="outline" size="sm">
        <Link href={`/proyectos/${projectId}/defectos`}>Ver defecto</Link>
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onConfirm}>
        Registrar otro
      </Button>
    </div>
  )
}

function memberOptions(members: { id: string; name: string; role: string }[], allLabel = "Sin responsable") {
  return [
    { value: "ninguno", label: allLabel },
    ...members.map((item) => ({ value: item.id, label: item.role ? `${item.name} · ${item.role}` : item.name })),
  ]
}

function FormLike({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  )
}

function DefectDialog({
  open,
  title,
  severity,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  title: string
  severity: Severity
  onOpenChange: (open: boolean) => void
  onCreate: (input: { title: string; severity: Severity; externalUrl: string }) => void
}) {
  const [value, setValue] = useState(title)
  const [level, setLevel] = useState(severity)
  const [url, setUrl] = useState("")
  const [seen, setSeen] = useState(false)
  if (open && !seen) {
    setSeen(true)
    setValue(title)
    setLevel(severity)
    setUrl("")
  }
  if (!open && seen) setSeen(false)
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Registrar defecto</AlertDialogTitle>
          <AlertDialogDescription>
            Queda ligado a este caso y a esta corrida. El enlace externo es opcional.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-3">
          <Input aria-label="Título del defecto" value={value} onChange={(event) => setValue(event.target.value)} />
          <EnumSelect
            ariaLabel="Severidad del defecto"
            value={level}
            onChange={setLevel}
            options={severities.map((item) => ({ value: item, label: severityLabel[item] }))}
          />
          <Input
            aria-label="Enlace externo"
            placeholder="https://github.com/... o Jira"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">Estado inicial: {defectStatusLabel.abierto}.</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              try {
                if (!value.trim()) throw new Error("Escribe el título del defecto.")
                onCreate({ title: value, severity: level, externalUrl: url })
              } catch (error) {
                reportError(error)
              }
            }}
          >
            Crear
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
