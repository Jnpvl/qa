"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, FormField, PageHeader, reportError } from "@/components/bits"
import { EnumSelect } from "@/components/enum-select"
import { MissingProject } from "@/components/missing-project"
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
import { Textarea } from "@/components/ui/textarea"
import { useWorkspace } from "@/components/use-workspace"
import { planCaseIds } from "@/lib/plan-cases"
import { caseCode } from "@/lib/text"
import { flattenSuites } from "@/lib/suites"
import type { Plan } from "@/lib/types"

export function PlansPanel() {
  const router = useRouter()
  const { store, data, project } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [removing, setRemoving] = useState<Plan | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [sprintId, setSprintId] = useState("none")
  const [caseIds, setCaseIds] = useState<string[]>([])
  const [suiteIds, setSuiteIds] = useState<string[]>([])
  const formKey = editing?.id ?? (open ? "new" : "closed")
  const [seen, setSeen] = useState<string | null>(null)

  if ((open || editing) && seen !== formKey) {
    setSeen(formKey)
    setName(editing?.name ?? "")
    setDescription(editing?.description ?? "")
    setSprintId(editing?.sprintId ?? "none")
    setCaseIds(editing?.caseIds ?? [])
    setSuiteIds(editing?.suiteIds ?? [])
  }
  if (!open && !editing && seen) setSeen(null)

  if (!data || !project) return <MissingProject />

  const plans = data.plans.filter((item) => item.projectId === project.id)
  const sprints = data.sprints.filter((item) => item.projectId === project.id)
  const runs = data.runs.filter((item) => item.projectId === project.id)

  function save() {
    try {
      const payload = {
        name,
        description,
        sprintId: sprintId === "none" ? null : sprintId,
        caseIds,
        suiteIds,
      }
      if (editing) store.updatePlan(editing.id, payload)
      else store.createPlan({ projectId: project!.id, ...payload })
      toast.success(editing ? "Plan actualizado" : "Plan creado")
      setOpen(false)
      setEditing(null)
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 p-4 md:p-6">
      <PageHeader
        title="Planes"
        description="Un plan reúne suites o casos para volver a ejecutarlos. Desde aquí se crea la corrida."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus />
            Nuevo plan
          </Button>
        }
      />
      {plans.length === 0 ? (
        <EmptyState
          title="Todavía no hay planes"
          body="Crea uno para juntar, por ejemplo, el humo y la regresión del sprint."
        />
      ) : (
        <ul className="grid gap-3">
          {plans.map((plan) => {
            const linked = runs.filter((run) => run.planId === plan.id)
            const sprint = sprints.find((item) => item.id === plan.sprintId)
            return (
              <li key={plan.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-medium">{plan.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sprint ? sprint.name : "Sin sprint"}
                      {plan.description ? ` · ${plan.description}` : ""}
                      {` · ${planCaseIds(plan, data.cases, data.suites).length} casos`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm">
                      {linked.length === 0 ? (
                        <span className="text-muted-foreground">Sin corridas todavía.</span>
                      ) : (
                        linked.map((run) => (
                          <Link
                            key={run.id}
                            href={`/proyectos/${project.id}/corridas/${run.id}`}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {run.name}
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        try {
                          const created = store.createRun({
                            projectId: project.id,
                            name: plan.name,
                            sprintId: plan.sprintId,
                            planId: plan.id,
                            caseIds: planCaseIds(plan, data.cases, data.suites),
                          })
                          toast.success("Corrida creada desde el plan")
                          router.push(`/proyectos/${project.id}/corridas/${created.id}`)
                        } catch (error) {
                          reportError(error)
                        }
                      }}
                    >
                      Crear corrida
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(plan)
                        setOpen(true)
                      }}
                    >
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRemoving(plan)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setEditing(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar plan" : "Nuevo plan"}</DialogTitle>
            <DialogDescription>Elige suites completas, casos sueltos, o ambos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <FormField label="Nombre" htmlFor="plan-name">
              <Input id="plan-name" value={name} onChange={(event) => setName(event.target.value)} />
            </FormField>
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
            <PlanPicker
              suites={data.suites.filter((item) => item.projectId === project.id)}
              cases={data.cases.filter((item) => item.projectId === project.id)}
              projectKey={project.key}
              suiteIds={suiteIds}
              caseIds={caseIds}
              onSuiteIds={setSuiteIds}
              onCaseIds={setCaseIds}
            />
            <FormField label="Descripción" htmlFor="plan-description">
              <Textarea
                id="plan-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(removing)} onOpenChange={(next) => !next && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Las corridas siguen existiendo, solo dejan de pertenecer al plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!removing) return
                store.deletePlan(removing.id)
                setRemoving(null)
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

function PlanPicker({
  suites,
  cases,
  projectKey,
  suiteIds,
  caseIds,
  onSuiteIds,
  onCaseIds,
}: {
  suites: { id: string; projectId: string; parentId: string | null; name: string; description: string; order: number }[]
  cases: { id: string; suiteId: string; number: number; title: string; status: string }[]
  projectKey: string
  suiteIds: string[]
  caseIds: string[]
  onSuiteIds: (ids: string[]) => void
  onCaseIds: (ids: string[]) => void
}) {
  const flat = flattenSuites(suites, suites[0]?.projectId ?? "")
  return (
    <div className="grid max-h-64 gap-2 overflow-y-auto rounded-lg border p-2">
      <p className="text-sm font-medium">Suites y casos</p>
      {flat.map((row) => (
        <div key={row.suite.id} style={{ paddingLeft: `${row.depth * 12}px` }}>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={suiteIds.includes(row.suite.id)}
              onCheckedChange={(value) =>
                onSuiteIds(
                  value === true ? [...suiteIds, row.suite.id] : suiteIds.filter((id) => id !== row.suite.id),
                )
              }
            />
            {row.suite.name}
          </label>
          {cases
            .filter((item) => item.suiteId === row.suite.id && item.status !== "obsoleto")
            .map((item) => (
              <label key={item.id} className="mt-1 flex items-center gap-2 pl-6 text-sm">
                <Checkbox
                  checked={caseIds.includes(item.id)}
                  onCheckedChange={(value) =>
                    onCaseIds(value === true ? [...caseIds, item.id] : caseIds.filter((id) => id !== item.id))
                  }
                />
                <span className="font-mono text-xs text-muted-foreground">{caseCode(projectKey, item.number)}</span>
                <span className="min-w-0 truncate">{item.title}</span>
              </label>
            ))}
        </div>
      ))}
    </div>
  )
}
