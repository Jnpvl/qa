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
  const [quick, setQuick] = useState(false)

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
    <div className="mx-auto grid w-full min-w-0 max-w-screen-2xl gap-5 p-4 md:p-6">
      <PageHeader
        title="Corridas"
        description="Elige casos y registra si pasaron, fallaron, quedaron bloqueados o se omitieron."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><Button variant="outline" className="w-full sm:w-auto" onClick={() => { setQuick(true); setOpen(true) }}>Prueba rápida</Button><Button className="w-full sm:w-auto" onClick={() => { setQuick(false); setOpen(true) }}>
            <Plus />
            Nueva corrida
          </Button></div>
        }
      />
      {runs.length === 0 ? (
        <EmptyState
          title="Todavía no hay corridas"
          body="Crea una con los casos de un sprint, de una suite o con la selección que ya tengas."
          action={<Button onClick={() => { setQuick(true); setOpen(true) }}>Prueba rápida</Button>}
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
                  <div className="min-w-0">
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
                  </div>
                  <div className="flex shrink-0 gap-2">
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
                <div className="mt-3 grid gap-2">
                  <Progress className="w-full" value={stats.percent} aria-label="Avance de la corrida" />
                  <p className="text-xs text-muted-foreground">
                    {stats.done} de {stats.total} con resultado
                    {stats.passRate !== null ? ` · ${stats.passRate}% de aprobación` : ""}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <RunFormDialog
        open={open}
        quick={quick}
        onQuickChange={setQuick}
        initialCaseIds={draft ?? []}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) { store.setRunDraftIds(null); setQuick(false) }
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
  quick,
  onQuickChange,
  onOpenChange,
  onCreated,
  initialCaseIds,
}: {
  open: boolean
  quick: boolean
  onQuickChange: (value: boolean) => void
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
  const [quickBuild, setQuickBuild] = useState("")
  const [environmentChoice, setEnvironmentChoice] = useState("none")
  const [customEnvironment, setCustomEnvironment] = useState("")

  if (open && !seen) {
    setSeen(true)
    setName(quick ? "Prueba rápida" : "")
    setSprintId("none")
    setPlanId("none")
    setQuery("")
    setSelected(initialCaseIds)
    const configured = project
      ? (["stage", "production", "local"] as const).find((key) => project.environments?.[key]?.trim())
      : undefined
    setEnvironmentChoice(configured ?? "none")
    setCustomEnvironment("")
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

  const environmentOptions = ([
    ["local", "Desarrollo / local"],
    ["stage", "Stage"],
    ["production", "Producción"],
  ] as const)
    .filter(([key]) => Boolean(project.environments?.[key]?.trim()))
    .map(([key, label]) => ({ value: key, label: `${label} · ${project.environments[key]}` }))
  const selectedEnvironment = environmentChoice === "custom"
    ? customEnvironment.trim()
    : environmentChoice === "none" ? "" : environmentChoice
  const activeProject = project

  function environmentField() {
    return <div className="grid gap-2">
      <FormField label="Entorno">
        <EnumSelect
          value={environmentChoice}
          onChange={setEnvironmentChoice}
          options={[
            { value: "none", label: "Sin especificar" },
            ...environmentOptions,
            { value: "custom", label: "Otro entorno…" },
          ]}
        />
      </FormField>
      {environmentChoice === "custom" ? <FormField label="Nombre del entorno">
        <Input value={customEnvironment} onChange={(event) => setCustomEnvironment(event.target.value)} placeholder="QA local" />
      </FormField> : null}
      {environmentOptions.length === 0 ? <Link className="text-xs text-primary underline-offset-4 hover:underline" href={`/proyectos/${activeProject.id}/configuracion`}>Configura las URLs de los ambientes del proyecto</Link> : <p className="text-xs text-muted-foreground">El entorno queda registrado en esta corrida.</p>}
    </div>
  }

  const needle = normalize(query.trim())
  const visible = cases.filter((item) => {
    if (!needle) return true
    return normalize(`${caseCode(project.key, item.number)} ${item.title}`).includes(needle)
  })
  const flat = flattenSuites(suites, project.id).filter((row) =>
    visible.some((item) => descendantIds(suites, row.suite.id).includes(item.suiteId)),
  )

  function toggleIds(ids: string[], on: boolean) {
    if (quick) {
      setSelected(on ? ids.slice(-1) : [])
      return
    }
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
      if (quick) {
        if (selected.length !== 1) throw new Error("Elige un solo caso para la prueba rápida.")
        const run = store.createQuickRun({ projectId: project!.id, caseId: selected[0], environment: selectedEnvironment, build: quickBuild })
        toast.success("Prueba rápida lista")
        onCreated(run.id)
        return
      }
      const run = store.createRun({
        projectId: project!.id,
        name,
        sprintId: sprintId === "none" ? null : sprintId,
        planId: planId === "none" ? null : planId,
        caseIds: selected,
        environment: selectedEnvironment,
      })
      toast.success("Corrida creada")
      onCreated(run.id)
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) onQuickChange(false) }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{quick ? "Prueba rápida" : "Nueva corrida"}</DialogTitle>
          <DialogDescription>
            {quick ? "Selecciona un caso para ejecutar de forma puntual." : "Marca una suite para incluir sus casos, o agrega los de un sprint."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {!quick ? <FormField label="Nombre" htmlFor="run-name">
            <Input
              id="run-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Humo de checkout"
            />
          </FormField> : null}
          {quick ? <div className="grid gap-3 sm:grid-cols-2">{environmentField()}<FormField label="Build o versión"><Input value={quickBuild} onChange={(e) => setQuickBuild(e.target.value)} placeholder="2026.11.26" /></FormField></div> : null}
          {!quick ? <div className="grid gap-3 sm:grid-cols-2">
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
            {environmentField()}
          </div> : null}
          {!quick ? <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addSprintCases} disabled={sprintId === "none"}>
              Agregar casos del sprint
            </Button>
            <span className="self-center text-xs text-muted-foreground">
              {selected.length} casos en la corrida
            </span>
          </div> : <p className="text-sm text-muted-foreground">Selecciona exactamente un caso.</p>}
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
            <Button onClick={create}>{quick ? "Iniciar prueba rápida" : "Crear corrida"}</Button>
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
