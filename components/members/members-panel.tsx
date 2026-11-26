"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, FormField, PageHeader, reportError } from "@/components/bits"
import { MissingProject } from "@/components/missing-project"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useWorkspace } from "@/components/use-workspace"

export function MembersPanel() {
  const { store, data, project } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const member = data?.members.find((item) => item.id === editing)
  const formKey = editing ?? (open ? "new" : "closed")
  const [seen, setSeen] = useState<string | null>(null)
  if ((open || editing) && seen !== formKey) {
    setSeen(formKey)
    setName(member?.name ?? "")
    setRole(member?.role ?? "")
  }
  if (!open && !editing && seen) setSeen(null)
  if (!data || !project) return <MissingProject />
  const members = data.members.filter((item) => item.projectId === project.id)

  function save() {
    try {
      if (editing) store.updateMember(editing, { name, role })
      else store.createMember({ projectId: project!.id, name, role })
      toast.success(editing ? "Persona actualizada" : "Persona agregada")
      setOpen(false)
      setEditing(null)
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-3xl gap-5 p-4 md:p-6">
      <PageHeader
        title="Equipo"
        description="Personas que pueden quedar como responsables de una corrida o de un caso. No hay inicio de sesión."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus />
            Agregar
          </Button>
        }
      />
      {members.length === 0 ? (
        <EmptyState title="Todavía no hay personas" body="Agrega a quien ejecuta o da seguimiento." />
      ) : (
        <ul className="grid gap-2">
          {members.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.role || "Sin rol"}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(item.id)
                    setOpen(true)
                  }}
                >
                  Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => store.deleteMember(item.id)}>
                  Quitar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setEditing(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar persona" : "Nueva persona"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <FormField label="Nombre" htmlFor="member-name">
              <Input id="member-name" value={name} onChange={(event) => setName(event.target.value)} />
            </FormField>
            <FormField label="Rol" htmlFor="member-role">
              <Input id="member-role" value={role} onChange={(event) => setRole(event.target.value)} placeholder="QA" />
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
    </div>
  )
}
