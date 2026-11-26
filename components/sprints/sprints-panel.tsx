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
import { countLabel, formatDate, formatDateInput, parseDateInput } from "@/lib/text"
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
  const [errors, setErrors] = useState<{ name?: string; start?: string; end?: string }>({})
  const formKey = editing?.id ?? (open ? "new" : "closed")
  const [seen, setSeen] = useState<string | null>(null)

  if ((open || editing) && seen !== formKey) {
    setSeen(formKey)
    setErrors({})
    setForm(
      editing
        ? {
            name: editing.name,
            goal: editing.goal,
            startDate: formatDateInput(editing.startDate),
            endDate: formatDateInput(editing.endDate),
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
    const next: { name?: string; start?: string; end?: string } = {}
    if (!form.name.trim()) next.name = "Escribe el nombre del sprint."
    const start = form.startDate.trim() ? parseDateInput(form.startDate) : ""
    const end = form.endDate.trim() ? parseDateInput(form.endDate) : ""
    if (form.startDate.trim() && !start) next.start = "Usa el formato dd/mm/aaaa."
    if (form.endDate.trim() && !end) next.end = "Usa el formato dd/mm/aaaa."
    if (start && end && end < start) next.end = "La fecha de fin no puede ser anterior al inicio."
    if (next.name || next.start || next.end) {
      setErrors(next)
      reportError(new Error(next.name || next.end || next.start || "Revisa los campos."))
      return
    }
    const payload = { ...form, startDate: start || "", endDate: end || "" }
    try {
      if (editing) {
        store.updateSprint(editing.id, payload)
        toast.success("Sprint actualizado")
      } else {
        store.createSprint({ projectId: project!.id, ...payload })
        toast.success("Sprint creado")
      }
      setErrors({})
      setOpen(false)
      setEditing(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo completar."
      if (message.includes("fin") || message.includes("inicio")) setErrors({ end: message })
      else if (message.includes("nombre")) setErrors({ name: message })
      reportError(error)
    }
  }

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-screen-2xl gap-5 p-4 md:p-6">
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
        <DialogContent className="border-border/80 bg-card shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar sprint" : "Nuevo sprint"}</DialogTitle>
            <DialogDescription>También puedes pensarlo como un milestone.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <FormField label="Nombre" htmlFor="sprint-name" error={errors.name}>
              <Input
                id="sprint-name"
                value={form.name}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "sprint-name-error" : undefined}
                onChange={(event) => {
                  setForm({ ...form, name: event.target.value })
                  if (errors.name) setErrors((current) => ({ ...current, name: undefined }))
                }}
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
              <FormField label="Inicio" htmlFor="sprint-start" error={errors.start}>
                <Input
                  id="sprint-start"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="dd/mm/aaaa"
                  value={form.startDate}
                  aria-invalid={errors.start ? true : undefined}
                  aria-describedby={errors.start ? "sprint-start-error" : undefined}
                  onChange={(event) => {
                    setForm({ ...form, startDate: event.target.value })
                    if (errors.start) setErrors((current) => ({ ...current, start: undefined }))
                  }}
                />
              </FormField>
              <FormField label="Fin" htmlFor="sprint-end" error={errors.end}>
                <Input
                  id="sprint-end"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="dd/mm/aaaa"
                  value={form.endDate}
                  aria-invalid={errors.end ? true : undefined}
                  aria-describedby={errors.end ? "sprint-end-error" : undefined}
                  onChange={(event) => {
                    setForm({ ...form, endDate: event.target.value })
                    if (errors.end) setErrors((current) => ({ ...current, end: undefined }))
                  }}
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
