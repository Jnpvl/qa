"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyState, PageHeader } from "@/components/bits"
import { EnumSelect } from "@/components/enum-select"
import { MissingProject } from "@/components/missing-project"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FormField } from "@/components/bits"
import { defectStatusLabel, defectStatuses, severityLabel } from "@/lib/labels"
import { caseCode, formatDateTime } from "@/lib/text"
import { useWorkspace } from "@/components/use-workspace"
import type { DefectStatus } from "@/lib/types"

export function DefectsPanel() {
  const { store, data, project } = useWorkspace()
  const [status, setStatus] = useState<DefectStatus | "todos">("todos")
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [caseId, setCaseId] = useState("none")
  const [origin, setOrigin] = useState<"exploratoria" | "soporte" | "produccion" | "otro">("exploratoria")
  const [externalUrl, setExternalUrl] = useState("")
  if (!data || !project) return <MissingProject />
  const defects = data.defects
    .filter((item) => item.projectId === project.id)
    .filter((item) => status === "todos" || item.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-screen-2xl gap-5 p-4 md:p-6">
      <PageHeader
        title="Defectos"
        description="Registra defectos detectados en corridas, pruebas exploratorias, soporte o producción."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><Button onClick={() => setCreateOpen(true)}>Registrar defecto</Button><div className="w-full min-w-0 sm:w-44">
            <EnumSelect
              ariaLabel="Filtrar por estado"
              value={status}
              onChange={setStatus}
              options={[
                { value: "todos", label: "Todos" },
                ...defectStatuses.map((item) => ({ value: item, label: defectStatusLabel[item] })),
              ]}
            />
          </div></div>
        }
      />
      {defects.length === 0 ? (
        <EmptyState
          title="No hay defectos"
          body="Cuando un caso falle en una corrida, puedes registrar el defecto desde el resultado."
        />
      ) : (
        <ul className="grid gap-3">
          {defects.map((defect) => {
            const testCase = data.cases.find((item) => item.id === defect.caseId)
            const run = data.runs.find((item) => item.id === defect.runId)
            return (
              <li key={defect.id} className="grid gap-3 rounded-xl border bg-card p-4">
                <div className="min-w-0">
                  <h2 className="font-medium break-words">{defect.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(defect.createdAt)} · {severityLabel[defect.severity]}
                    {testCase ? ` · ${caseCode(project.key, testCase.number, testCase.idPrefix, testCase.customId)} ${testCase.title}` : ` · Sin caso (${defect.origin})`}
                  </p>
                  {defect.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{defect.description}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {testCase ? (
                      <Link className="underline-offset-2 hover:underline" href={`/proyectos/${project.id}/casos/${testCase.id}`}>
                        Ver caso
                      </Link>
                    ) : null}
                    {run ? (
                      <Link className="underline-offset-2 hover:underline" href={`/proyectos/${project.id}/corridas/${run.id}`}>
                        {run.name}
                      </Link>
                    ) : null}
                    {defect.externalUrl ? (
                      <a className="underline-offset-2 hover:underline" href={defect.externalUrl} target="_blank" rel="noreferrer">
                        Enlace externo
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-full min-w-0 sm:w-44">
                    <EnumSelect
                      ariaLabel={`Estado de ${defect.title}`}
                      value={defect.status}
                      onChange={(next) => {
                        store.updateDefect(defect.id, { status: next })
                        toast.success("Defecto actualizado")
                      }}
                      options={defectStatuses.map((item) => ({ value: item, label: defectStatusLabel[item] }))}
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => store.deleteDefect(defect.id)}>
                    Eliminar
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border/80 bg-card shadow-2xl sm:max-w-xl">
          <DialogHeader><DialogTitle>Registrar defecto</DialogTitle><DialogDescription>Registra un hallazgo con o sin caso de prueba asociado.</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <FormField label="Título"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></FormField>
            <FormField label="Descripción"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qué observaste y cómo afecta." /></FormField>
            <FormField label="Caso relacionado (opcional)"><EnumSelect value={caseId} onChange={setCaseId} options={[{value:"none",label:"Sin caso"}, ...data.cases.filter((item) => item.projectId === project.id).map((item) => ({value:item.id,label:`${caseCode(project.key,item.number,item.idPrefix,item.customId)} · ${item.title}`}))]} /></FormField>
            <FormField label="Origen"><EnumSelect value={origin} onChange={setOrigin} options={[{value:"exploratoria",label:"Prueba exploratoria"},{value:"soporte",label:"Soporte"},{value:"produccion",label:"Producción"},{value:"otro",label:"Otro"}]} /></FormField>
            <FormField label="Enlace externo (opcional)"><Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="Azure DevOps, Jira, etc." /></FormField>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button onClick={() => { try { store.createDefect({projectId:project.id,caseId:caseId === "none" ? null : caseId,runId:null,title,description,externalUrl,severity:"mayor",origin}); setTitle("");setDescription("");setExternalUrl("");setCaseId("none");setCreateOpen(false);toast.success("Defecto registrado") } catch(error) { toast.error(error instanceof Error ? error.message : "No se pudo registrar") } }}>Guardar defecto</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
