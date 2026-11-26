"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FormField, reportError } from "@/components/bits"
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
import { useStore } from "@/lib/store"
import { suggestKey } from "@/lib/text"
import type { Project } from "@/lib/types"

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project
}) {
  const store = useStore()
  const router = useRouter()
  const identity = project?.id ?? "new"
  const [seen, setSeen] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [key, setKey] = useState("")
  const [description, setDescription] = useState("")
  const [keyTouched, setKeyTouched] = useState(false)

  if (open && seen !== identity) {
    setSeen(identity)
    setName(project?.name ?? "")
    setKey(project?.key ?? "")
    setDescription(project?.description ?? "")
    setKeyTouched(Boolean(project))
  }
  if (!open && seen) setSeen(null)

  function save() {
    try {
      if (project) {
        store.updateProject(project.id, { name, key, description })
        toast.success("Proyecto actualizado")
      } else {
        const created = store.createProject({ name, key, description })
        toast.success("Proyecto creado")
        router.push(`/proyectos/${created.id}/casos`)
      }
      onOpenChange(false)
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? "Editar proyecto" : "Nuevo proyecto"}</DialogTitle>
          <DialogDescription>
            La clave forma el identificador de los casos, por ejemplo DEMO-001.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Nombre" htmlFor="project-name">
            <Input
              id="project-name"
              value={name}
              onChange={(event) => {
                const next = event.target.value
                setName(next)
                if (!keyTouched) setKey(suggestKey(next))
              }}
              placeholder="Tienda en línea"
            />
          </FormField>
          <FormField
            label="Clave"
            htmlFor="project-key"
            hint="De 2 a 8 caracteres. Empieza con letra. Si la cambias, cambia el ID visible y el número se conserva."
          >
            <Input
              id="project-key"
              value={key}
              className="font-mono uppercase"
              onChange={(event) => {
                setKeyTouched(true)
                setKey(event.target.value.toUpperCase())
              }}
            />
          </FormField>
          <FormField label="Descripción" htmlFor="project-description">
            <Textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Qué se prueba en este proyecto"
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save}>{project ? "Guardar" : "Crear proyecto"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
