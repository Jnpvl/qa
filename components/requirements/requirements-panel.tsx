"use client"

import { useState } from "react"
import { toast } from "sonner"
import { EmptyState, FormField, PageHeader, reportError } from "@/components/bits"
import { MissingProject } from "@/components/missing-project"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useWorkspace } from "@/components/use-workspace"

export function RequirementsPanel() {
  const { store, data, project } = useWorkspace()
  const [key, setKey] = useState("")
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [description, setDescription] = useState("")
  if (!data || !project) return <MissingProject />
  const requirements = (data.requirements ?? []).filter((item) => item.projectId === project.id)
  function create() {
    try {
      store.createRequirement({ projectId: project!.id, key, title, externalUrl: url, description })
      setKey(""); setTitle(""); setUrl(""); setDescription("")
      toast.success("Requisito agregado")
    } catch (error) { reportError(error) }
  }
  return <div className="mx-auto grid w-full min-w-0 max-w-screen-2xl gap-5 p-4 md:p-6">
    <PageHeader title="Requisitos" description="Registra historias y requisitos y relaciónalos con casos. Los IDs y enlaces externos preparan la trazabilidad con Azure DevOps." />
    <section className="grid min-w-0 gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-lg shadow-slate-900/[0.035] sm:grid-cols-2 sm:p-5 lg:p-6">
      <FormField label="ID externo"><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="US-123" /></FormField>
      <FormField label="Título"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="El cliente puede pagar con tarjeta" /></FormField>
      <FormField label="Enlace externo"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL del work item en Azure DevOps" /></FormField>
      <FormField label="Descripción"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
      <div><Button onClick={create}>Agregar requisito</Button></div>
    </section>
    {requirements.length === 0 ? <EmptyState title="Aún no hay requisitos" body="Agrega una historia o requisito y después relaciónalo desde el editor de casos." /> : <ul className="grid gap-3">{requirements.map((item) => {
      const count = data.cases.filter((testCase) => (testCase.requirementIds ?? []).includes(item.id)).length
      return <li key={item.id} className="rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-medium">{item.key ? `${item.key} · ` : ""}{item.title}</h2><p className="text-sm text-muted-foreground">{count} casos vinculados{item.description ? ` · ${item.description}` : ""}</p>{item.externalUrl ? <a className="text-sm underline" href={item.externalUrl} target="_blank" rel="noreferrer">Abrir elemento externo</a> : null}</div><Button variant="ghost" size="sm" onClick={() => { store.deleteRequirement(item.id); toast.success("Requisito eliminado") }}>Eliminar</Button></div></li>
    })}</ul>}
  </div>
}
