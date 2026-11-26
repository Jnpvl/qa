"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, FormField, PageHeader, reportError } from "@/components/bits"
import { EnumSelect } from "@/components/enum-select"
import { MissingProject } from "@/components/missing-project"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { runStats } from "@/lib/metrics"
import { descendantIds, flattenSuites } from "@/lib/suites"
import { caseCode, formatDateTime, normalize } from "@/lib/text"
import { useWorkspace } from "@/components/use-workspace"
import type { TestCase } from "@/lib/types"

export function RunsPanel() {
  const router = useRouter()
  const { store, data, project } = useWorkspace()
  const draft = store.runDraftIds
  const [appliedDraft, setAppliedDraft] = useState<string[] | null>(null)
  const [open, setOpen] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  if (draft && draft !== appliedDraft) {
    setAppliedDraft(draft)
    setOpen(true)
  }

  if (!data || !project) return <MissingProject />

  const runs = data.runs
    .filter((item) => item.projectId === project.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const removingRun = runs.find((item) => item.id === removing)

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 p-4 md:p-6">
      <PageHeader
        title="Corridas"
        description="Elige casos y registra si pasaron, fallaron, quedaron bloqueados o se omitieron."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus />
            Nueva corrida
          </Button>
        }
      />
      {runs.length === 0 ? (
        <EmptyState
          title="Todavía no hay corridas"
          body="Crea una con los casos de un sprint, de una suite o con la selección que ya tengas."
          action={<Button onClick={() => setOpen(true)}>Nueva corrida</Button>}
        />
      ) : (
        <ul className="grid gap-3">
          {runs.map((run) => {
            const stats = runStats(run)
            const sprint = data.sprints.find((item) => item.id === run.sprintId)
            const plan = data.plans.find((item) => item.id === run.planId)
            return (
              <li key={run.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/proyectos/${project.id}/corridas/${run.id}`}
                      className="font-medium hover:underline"
                    >
                      {run.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(run.createdAt)}
                      {sprint ? ` · ${sprint.name}` : ""}
                      {plan ? ` · ${plan.name}` : ""}
                      {run.status === "cerrada" ? " · Cerrada" : " · En progreso"}
                    </p>
                    <div className="mt-3 grid gap-2">
                      <Progress value={stats.percent} aria-label="Avance de la corrida" />
                      <p className="text-xs text-muted-foreground">
                        {stats.done} de {stats.total} con resultado
                        {stats.passRate !== null ? ` · ${stats.passRate}% de aprobación` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm">
                      <Link href={`/proyectos/${project.id}/corridas/${run.id}`}>
                        {run.status === "cerrada" ? "Ver" : "Ejecutar"}
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRemoving(run.id)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <RunFormDialog
        open={open}
        initialCaseIds={draft ?? []}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) store.setRunDraftIds(null)
        }}
        onCreated={(id) => {
          setOpen(false)
          store.setRunDraftIds(null)
          router.push(`/proyectos/${project.id}/corridas/${id}`)
        }}
      />

      <AlertDialog open={Boolean(removingRun)} onOpenChange={(next) => !next && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {removingRun?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Se pierden los resultados de esta corrida.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!removing) return
                store.deleteRun(removing)
                setRemoving(null)
                toast.success("Corrida eliminada")
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function RunFormDialog({
  open,
  onOpenChange,
  onCreated,
  initialCaseIds,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
  initialCaseIds: string[]
}) {
  const { store, data, project } = useWorkspace()
  const [seen, setSeen] = useState(false)
  const [name, setName] = useState("")
  const [sprintId, setSprintId] = useState("none")
  const [planId, setPlanId] = useState("none")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>([])

  if (open && !seen) {
    setSeen(true)
    setName("")
    setSprintId("none")
    setPlanId("none")
    setQuery("")
    setSelected(initialCaseIds)
  }
  if (!open && seen) setSeen(false)

  const cases = useMemo(
    () =>
      data && project
        ? data.cases
            .filter((item) => item.projectId === project.id)
            .sort((a, b) => a.number - b.number)
        : [],
    [data, project],
  )
  const suites = data && project ? data.suites.filter((item) => item.projectId === project.id) : []
  const sprints = data && project ? data.sprints.filter((item) => item.projectId === project.id) : []
  const plans = data && project ? data.plans.filter((item) => item.projectId === project.id) : []

  if (!data || !project) return null

  const needle = normalize(query.trim())
  const visible = cases.filter((item) => {
    if (!needle) return true
    return normalize(`${caseCode(project.key, item.number)} ${item.title}`).includes(needle)
  })
  const flat = flattenSuites(suites, project.id).filter((row) =>
    visible.some((item) => descendantIds(suites, row.suite.id).includes(item.suiteId)),
  )

  function toggleIds(ids: string[], on: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return [...next]
    })
  }

  function addSprintCases() {
    if (sprintId === "none") return
    const ids = cases
      .filter((item) => item.sprintIds.includes(sprintId) && item.status !== "obsoleto")
      .map((item) => item.id)
    toggleIds(ids, true)
  }

  function create() {
    try {
      const run = store.createRun({
        projectId: project!.id,
        name,
        sprintId: sprintId === "none" ? null : sprintId,
        planId: planId === "none" ? null : planId,
        caseIds: selected,
      })
      toast.success("Corrida creada")
      onCreated(run.id)
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nueva corrida</DialogTitle>
          <DialogDescription>
            Marca una suite para incluir sus casos, o agrega los de un sprint.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Nombre" htmlFor="run-name">
            <Input
              id="run-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Humo de checkout"
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Sprint">
              <EnumSelect
                value={sprintId}
                onChange={setSprintId}
                options={[
                  { value: "none", label: "Sin sprint" },
                  ...sprints.map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
            </FormField>
            <FormField label="Plan">
              <EnumSelect
                value={planId}
                onChange={setPlanId}
                options={[
                  { value: "none", label: "Sin plan" },
                  ...plans.map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addSprintCases} disabled={sprintId === "none"}>
              Agregar casos del sprint
            </Button>
            <span className="self-center text-xs text-muted-foreground">
              {selected.length} casos en la corrida
            </span>
          </div>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar casos"
            aria-label="Filtrar casos de la corrida"
          />
          <div className="max-h-80 overflow-y-auto rounded-lg border">
            {flat.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No hay casos para mostrar.</p>
            ) : (
              flat.map((row) => {
                const direct = visible.filter((item) =>
                  descendantIds(suites, row.suite.id).includes(item.suiteId),
                )
                const own = visible.filter((item) => item.suiteId === row.suite.id)
                const allOn = direct.length > 0 && direct.every((item) => selected.includes(item.id))
                const someOn = direct.some((item) => selected.includes(item.id))
                return (
                  <div key={row.suite.id} className="border-b last:border-0">
                    <label
                      className="flex items-center gap-2 bg-muted/40 px-3 py-2 text-sm font-medium"
                      style={{ paddingLeft: `${row.depth * 16 + 12}px` }}
                    >
                      <Checkbox
                        checked={allOn ? true : someOn ? "indeterminate" : false}
                        onCheckedChange={(value) => toggleIds(direct.map((item) => item.id), value === true)}
                      />
                      {row.suite.name}
                    </label>
                    {own.map((item) => (
                      <CaseRow
                        key={item.id}
                        item={item}
                        projectKey={project.key}
                        depth={row.depth + 1}
                        checked={selected.includes(item.id)}
                        onCheckedChange={(on) => toggleIds([item.id], on)}
                      />
                    ))}
                  </div>
                )
              })
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={create}>Crear corrida</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CaseRow({
  item,
  projectKey,
  depth,
  checked,
  onCheckedChange,
}: {
  item: TestCase
  projectKey: string
  depth: number
  checked: boolean
  onCheckedChange: (on: boolean) => void
}) {
  return (
    <label
      className="flex items-center gap-2 px-3 py-2 text-sm"
      style={{ paddingLeft: `${depth * 16 + 12}px` }}
    >
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <span className="font-mono text-xs text-muted-foreground">{caseCode(projectKey, item.number)}</span>
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
      {item.status === "obsoleto" ? (
        <span className="text-xs text-muted-foreground">Obsoleto</span>
      ) : null}
    </label>
  )
}
