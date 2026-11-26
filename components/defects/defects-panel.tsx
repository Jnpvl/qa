"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyState, PageHeader } from "@/components/bits"
import { EnumSelect } from "@/components/enum-select"
import { MissingProject } from "@/components/missing-project"
import { Button } from "@/components/ui/button"
import { defectStatusLabel, defectStatuses, severityLabel } from "@/lib/labels"
import { caseCode, formatDateTime } from "@/lib/text"
import { useWorkspace } from "@/components/use-workspace"
import type { DefectStatus } from "@/lib/types"

export function DefectsPanel() {
  const { store, data, project } = useWorkspace()
  const [status, setStatus] = useState<DefectStatus | "todos">("todos")
  if (!data || !project) return <MissingProject />
  const defects = data.defects
    .filter((item) => item.projectId === project.id)
    .filter((item) => status === "todos" || item.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-5 p-4 md:p-6">
      <PageHeader
        title="Defectos"
        description="Fallos registrados desde una corrida. El enlace a Jira o GitHub es opcional."
        actions={
          <div className="w-full min-w-0 sm:w-44">
            <EnumSelect
              ariaLabel="Filtrar por estado"
              value={status}
              onChange={setStatus}
              options={[
                { value: "todos", label: "Todos" },
                ...defectStatuses.map((item) => ({ value: item, label: defectStatusLabel[item] })),
              ]}
            />
          </div>
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
                    {testCase ? ` · ${caseCode(project.key, testCase.number)} ${testCase.title}` : ""}
                  </p>
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
    </div>
  )
}
