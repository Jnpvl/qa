"use client"

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
import { Badge } from "@/components/ui/badge"
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
import { sprintStatusLabel, sprintStatuses } from "@/lib/labels"
import { countLabel, formatDate } from "@/lib/text"
import { useWorkspace } from "@/components/use-workspace"
import type { Sprint, SprintStatus } from "@/lib/types"

const empty = {
  name: "",
  goal: "",
  startDate: "",
  endDate: "",
  status: "planeado" as SprintStatus,
}

export function SprintsPanel() {
  const { store, data, project } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Sprint | null>(null)
  const [removing, setRemoving] = useState<Sprint | null>(null)
  const [form, setForm] = useState(empty)
  const formKey = editing?.id ?? (open ? "new" : "closed")
  const [seen, setSeen] = useState<string | null>(null)

  if ((open || editing) && seen !== formKey) {
    setSeen(formKey)
    setForm(
      editing
        ? {
            name: editing.name,
            goal: editing.goal,
            startDate: editing.startDate,
            endDate: editing.endDate,
            status: editing.status,
          }
        : empty,
    )
  }
  if (!open && !editing && seen) setSeen(null)

  if (!data || !project) return <MissingProject />

  const sprints = data.sprints
    .filter((item) => item.projectId === project.id)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  function save() {
    try {
      if (editing) {
        store.updateSprint(editing.id, form)
        toast.success("Sprint actualizado")
      } else {
        store.createSprint({ projectId: project!.id, ...form })
        toast.success("Sprint creado")
      }
      setOpen(false)
      setEditing(null)
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 p-4 md:p-6">
      <PageHeader
        title="Sprints"
        description="Un sprint, o milestone, es la ventana de tiempo. Los casos se ligan a uno o varios."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus />
            Nuevo sprint
          </Button>
        }
      />
      {sprints.length === 0 ? (
        <EmptyState
          title="Todavía no hay sprints"
          body="Crea el primero para agrupar el trabajo de un tramo, por ejemplo el checkout."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              Nuevo sprint
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {sprints.map((sprint) => {
            const cases = data.cases.filter((item) => item.sprintIds.includes(sprint.id)).length
            const runs = data.runs.filter((item) => item.sprintId === sprint.id).length
            return (
              <li key={sprint.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium">{sprint.name}</h2>
                      <Badge variant="outline">{sprintStatusLabel[sprint.status]}</Badge>
                    </div>
                    {sprint.goal ? (
                      <p className="mt-1 text-sm text-muted-foreground">{sprint.goal}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {sprint.startDate ? formatDate(sprint.startDate) : "Sin inicio"}
                      {" — "}
                      {sprint.endDate ? formatDate(sprint.endDate) : "Sin fin"}
                      {" · "}
                      {countLabel(cases, "caso", "casos")} · {countLabel(runs, "corrida", "corridas")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(sprint)
                        setOpen(true)
                      }}
                    >
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRemoving(sprint)}>
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
            <DialogTitle>{editing ? "Editar sprint" : "Nuevo sprint"}</DialogTitle>
            <DialogDescription>También puedes pensarlo como un milestone.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <FormField label="Nombre" htmlFor="sprint-name">
              <Input
                id="sprint-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </FormField>
            <FormField label="Objetivo" htmlFor="sprint-goal">
              <Textarea
                id="sprint-goal"
                value={form.goal}
                onChange={(event) => setForm({ ...form, goal: event.target.value })}
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Inicio" htmlFor="sprint-start">
                <Input
                  id="sprint-start"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                />
              </FormField>
              <FormField label="Fin" htmlFor="sprint-end">
                <Input
                  id="sprint-end"
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                />
              </FormField>
            </div>
            <FormField label="Estado">
              <EnumSelect
                value={form.status}
                onChange={(status) => setForm({ ...form, status })}
                options={sprintStatuses.map((item) => ({
                  value: item,
                  label: sprintStatusLabel[item],
                }))}
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
              Los casos siguen existiendo, solo se les quita este sprint. Las corridas quedan sin sprint.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!removing) return
                store.deleteSprint(removing.id)
                setRemoving(null)
                toast.success("Sprint eliminado")
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
