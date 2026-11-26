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
import { isProjectKey, suggestKey } from "@/lib/text"
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
  const [errors, setErrors] = useState<{ name?: string; key?: string }>({})

  if (open && seen !== identity) {
    setSeen(identity)
    setName(project?.name ?? "")
    setKey(project?.key ?? "")
    setDescription(project?.description ?? "")
    setKeyTouched(Boolean(project))
    setErrors({})
  }
  if (!open && seen) setSeen(null)

  function save() {
    const next: { name?: string; key?: string } = {}
    if (!name.trim()) next.name = "Escribe el nombre del proyecto."
    if (!isProjectKey(key.trim().toUpperCase())) {
      next.key = "La clave usa de 2 a 8 letras o números y empieza con letra."
    }
    if (next.name || next.key) {
      setErrors(next)
      reportError(new Error(next.name ?? next.key ?? "Revisa los campos."))
      return
    }
    try {
      if (project) {
        store.updateProject(project.id, { name, key, description })
        toast.success("Proyecto actualizado")
      } else {
        const created = store.createProject({ name, key, description })
        toast.success("Proyecto creado")
        router.push(`/proyectos/${created.id}/casos`)
      }
      setErrors({})
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo completar."
      if (message.includes("nombre")) setErrors({ name: message })
      else setErrors({ key: message })
      reportError(error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? "Editar proyecto" : "Nuevo proyecto"}</DialogTitle>
          <DialogDescription>
            La clave forma el identificador de los casos, por ejemplo QA-001.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Nombre" htmlFor="project-name" error={errors.name}>
            <Input
              id="project-name"
              value={name}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "project-name-error" : undefined}
              onChange={(event) => {
                const next = event.target.value
                setName(next)
                if (!keyTouched) setKey(suggestKey(next))
                if (errors.name) setErrors((current) => ({ ...current, name: undefined }))
              }}
              placeholder="Portal de clientes"
            />
          </FormField>
          <FormField
            label="Clave"
            htmlFor="project-key"
            error={errors.key}
            hint="De 2 a 8 caracteres. Empieza con letra. Si la cambias, cambia el ID visible y el número se conserva."
          >
            <Input
              id="project-key"
              value={key}
              className="font-mono uppercase"
              aria-invalid={errors.key ? true : undefined}
              aria-describedby={errors.key ? "project-key-error" : undefined}
              onChange={(event) => {
                setKeyTouched(true)
                setKey(event.target.value.toUpperCase())
                if (errors.key) setErrors((current) => ({ ...current, key: undefined }))
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
