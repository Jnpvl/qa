"use client"

import Link from "next/link"
import { useState } from "react"
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
import type { Plan } from "@/lib/types"

export function PlansPanel() {
  const { store, data, project } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [removing, setRemoving] = useState<Plan | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [sprintId, setSprintId] = useState("none")
  const formKey = editing?.id ?? (open ? "new" : "closed")
  const [seen, setSeen] = useState<string | null>(null)

  if ((open || editing) && seen !== formKey) {
    setSeen(formKey)
    setName(editing?.name ?? "")
    setDescription(editing?.description ?? "")
    setSprintId(editing?.sprintId ?? "none")
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
        description="Un plan agrupa las corridas de un sprint. No es el caso ni la ejecución: es el paquete de trabajo."
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
                  <div className="flex gap-2">
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
            <DialogDescription>Luego puedes crear corridas y asociarlas a este plan.</DialogDescription>
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
