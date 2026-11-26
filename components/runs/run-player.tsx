"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PageHeader, reportError } from "@/components/bits"
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
import { Textarea } from "@/components/ui/textarea"
import { runStats } from "@/lib/metrics"
import { product } from "@/lib/product"
import { caseCode } from "@/lib/text"
import { useRouteParam, useWorkspace } from "@/components/use-workspace"
import { cn } from "@/lib/utils"
import type { ResultStatus, TestCase } from "@/lib/types"

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

export function RunPlayer() {
  const router = useRouter()
  const runId = useRouteParam("runId") ?? ""
  const { store, data, project } = useWorkspace()
  const run = data?.runs.find((item) => item.id === runId && item.projectId === project?.id)
  const ordered = run
    ? run.results
        .map((result) => data?.cases.find((item) => item.id === result.caseId))
        .filter((item): item is TestCase => Boolean(item))
    : []
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showList, setShowList] = useState(false)
  const [comment, setComment] = useState("")
  const [commentFor, setCommentFor] = useState<string | null>(null)
  const [closeOpen, setCloseOpen] = useState(false)
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
  })

  useEffect(() => {
    keyboard.current = {
      ordered,
      active,
      run,
      closed: run?.status === "cerrada",
      comment,
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
      if (!ok) return
      const pending = current.run.results.find(
        (item) => item.caseId !== current.active?.id && item.status === "pendiente",
      )
      if (pending) setActiveId(pending.caseId)
      setShowList(false)
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

  function mark(status: Exclude<ResultStatus, "pendiente">) {
    if (!run || !active || closed) return
    try {
      store.setRunResult(run.id, active.id, { status, comment })
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-4 p-4 md:p-6">
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
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                store.closeRun(run.id)
                toast.success("Corrida cerrada")
              }}
            >
              Cerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
