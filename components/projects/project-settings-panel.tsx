"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FormField, PageHeader, reportError } from "@/components/bits"
import { MissingProject } from "@/components/missing-project"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWorkspace } from "@/components/use-workspace"

export function ProjectSettingsPanel() {
  const { store, project } = useWorkspace()
  const [draft, setDraft] = useState<{ projectId: string; urls: { local: string; stage: string; production: string } } | null>(null)

  if (!project) return <MissingProject />

  const activeProject = project
  const currentUrls = activeProject.environments ?? { local: "", stage: "", production: "" }
  const urls = draft?.projectId === activeProject.id ? draft.urls : currentUrls
  function updateUrls(patch: Partial<typeof currentUrls>) {
    setDraft({ projectId: activeProject.id, urls: { ...urls, ...patch } })
  }

  function save() {
    try {
      store.updateProjectEnvironments(activeProject.id, urls)
      toast.success("Ambientes actualizados")
      setDraft({ projectId: activeProject.id, urls })
    } catch (error) {
      reportError(error)
    }
  }

  const dirty = JSON.stringify(urls) !== JSON.stringify(currentUrls)

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-screen-xl gap-5 p-4 md:p-6">
      <PageHeader
        title="Configuración del proyecto"
        description={`Configura el sitio y los ambientes que usarán las corridas y el paquete de Playwright de ${activeProject.name}.`}
        actions={<Button onClick={save} disabled={!dirty}>Guardar cambios</Button>}
      />
      <section className="grid gap-4 rounded-xl border bg-card p-4 md:p-6">
        <div>
          <h2 className="text-base font-medium">Sitio y ambientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Guarda las URLs de local, Stage y Producción. Se agregan al manifiesto que exportas para el agente de Playwright.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Desarrollo / local" htmlFor="environment-local">
            <Input id="environment-local" type="url" value={urls.local} placeholder="http://localhost:3000" onChange={(event) => updateUrls({ local: event.target.value })} />
          </FormField>
          <FormField label="Stage" htmlFor="environment-stage">
            <Input id="environment-stage" type="url" value={urls.stage} placeholder="https://stage.ejemplo.com" onChange={(event) => updateUrls({ stage: event.target.value })} />
          </FormField>
          <FormField label="Producción" htmlFor="environment-production">
            <Input id="environment-production" type="url" value={urls.production} placeholder="https://www.ejemplo.com" onChange={(event) => updateUrls({ production: event.target.value })} />
          </FormField>
        </div>
        <p className="text-xs text-muted-foreground">No agregues usuarios, contraseñas, tokens ni parámetros secretos a estas URLs. El exportador omite credenciales, query string y fragmento.</p>
      </section>
      <section className="grid gap-2 rounded-xl border bg-card p-4 md:p-6">
        <h2 className="text-base font-medium">Credenciales de prueba</h2>
        <p className="text-sm text-muted-foreground">La app no almacena contraseñas ni cookies. Configura credenciales como variables secretas del repositorio o del pipeline de CI; si Playwright necesita una sesión, guarda el storageState en un archivo excluido de Git.</p>
      </section>
    </div>
  )
}
