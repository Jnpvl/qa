"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FormField, reportError } from "@/components/bits"
import { EnumSelect } from "@/components/enum-select"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { downloadText, parseCsv, toCsv } from "@/lib/csv"
import { useStore } from "@/lib/store"
import { createId } from "@/lib/text"
import { flattenSuites } from "@/lib/suites"
import type { CaseDraft, CaseStatus, ExecutionType, Priority, Severity, TestCase } from "@/lib/types"

const fields = [
  { id: "title", label: "Título" },
  { id: "suite", label: "Suite" },
  { id: "preconditions", label: "Precondiciones" },
  { id: "steps", label: "Pasos" },
  { id: "priority", label: "Prioridad" },
  { id: "severity", label: "Severidad" },
  { id: "kind", label: "Tipo" },
  { id: "status", label: "Estado" },
  { id: "execution", label: "Ejecución" },
  { id: "tags", label: "Etiquetas" },
] as const

type FieldId = (typeof fields)[number]["id"] | "ignore"

const priorityMap: Record<string, Priority> = { baja: "baja", media: "media", alta: "alta", critica: "critica", crítica: "critica" }
const severityMap: Record<string, Severity> = { menor: "menor", mayor: "mayor", critica: "critica", crítica: "critica", bloqueante: "bloqueante" }
const statusMap: Record<string, CaseStatus> = { borrador: "borrador", activo: "activo", listo: "activo", obsoleto: "obsoleto" }
const executionMap: Record<string, ExecutionType> = { manual: "manual", automatizado: "automatizado", ambos: "ambos" }

export function exportCases(cases: TestCase[], suites: { id: string; name: string }[], filename: string) {
  const rows = [
    ["titulo", "suite", "precondiciones", "pasos", "prioridad", "severidad", "tipo", "estado", "ejecucion", "etiquetas"],
    ...cases.map((item) => [
      item.title,
      suites.find((suite) => suite.id === item.suiteId)?.name ?? "",
      item.preconditions,
      item.steps.map((step) => `${step.action} => ${step.expected}`).join(" | "),
      item.priority,
      item.severity,
      item.kind,
      item.status,
      item.executionType,
      item.tags.join(", "),
    ]),
  ]
  downloadText(filename, toCsv(rows), "text/csv;charset=utf-8")
}

export function CaseImportDialog({
  open,
  projectId,
  onOpenChange,
}: {
  open: boolean
  projectId: string
  onOpenChange: (open: boolean) => void
}) {
  const store = useStore()
  const data = store.data
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, FieldId>>({})
  const headers = rows[0] ?? []
  const body = rows.slice(1)

  function load(file: File) {
    file
      .text()
      .then((text) => {
        const parsed = parseCsv(text)
        setRows(parsed)
        const next: Record<string, FieldId> = {}
        parsed[0]?.forEach((header, index) => {
          const key = header.trim().toLowerCase()
          const match = fields.find((field) => key.includes(field.id) || key.includes(field.label.toLowerCase()))
          next[String(index)] = match?.id ?? "ignore"
        })
        setMapping(next)
      })
      .catch(reportError)
  }

  function column(field: FieldId) {
    return Number(Object.entries(mapping).find(([, value]) => value === field)?.[0] ?? -1)
  }

  function importRows() {
    if (!data) return
    const titleIndex = column("title")
    if (titleIndex < 0) {
      reportError(new Error("Mapea una columna al título."))
      return
    }
    const projectSuites = data.suites.filter((item) => item.projectId === projectId)
    const fallback = projectSuites[0]
    if (!fallback) {
      reportError(new Error("Crea una suite antes de importar."))
      return
    }
    let created = 0
    try {
      for (const row of body) {
        const title = row[titleIndex]?.trim()
        if (!title) continue
        const suiteName = column("suite") >= 0 ? row[column("suite")]?.trim() : ""
        let suiteId = projectSuites.find((item) => item.name.toLowerCase() === suiteName.toLowerCase())?.id
        if (!suiteId && suiteName) {
          const suite = store.createSuite({ projectId, parentId: null, name: suiteName, description: "" })
          suiteId = suite.id
          projectSuites.push(suite)
        }
        const steps = (column("steps") >= 0 ? row[column("steps")] : "")
          .split("|")
          .map((part) => part.trim())
          .filter(Boolean)
          .map((part) => {
            const [action, expected = ""] = part.split("=>")
            return { id: createId("st"), action: action.trim(), expected: expected.trim() }
          })
        const draft: CaseDraft = {
          suiteId: suiteId ?? fallback.id,
          title,
          preconditions: column("preconditions") >= 0 ? row[column("preconditions")] ?? "" : "",
          steps,
          priority: priorityMap[(column("priority") >= 0 ? row[column("priority")] : "").trim().toLowerCase()] ?? "media",
          severity: severityMap[(column("severity") >= 0 ? row[column("severity")] : "").trim().toLowerCase()] ?? "mayor",
          kind: (column("kind") >= 0 ? row[column("kind")] : "").trim().toLowerCase() === "regresion" ? "regresion" : "funcional",
          executionType: executionMap[(column("execution") >= 0 ? row[column("execution")] : "").trim().toLowerCase()] ?? "manual",
          tags: (column("tags") >= 0 ? row[column("tags")] : "").split(",").map((item) => item.trim()).filter(Boolean),
          status: statusMap[(column("status") >= 0 ? row[column("status")] : "").trim().toLowerCase()] ?? "borrador",
          sprintIds: [],
        }
        store.createCase(projectId, draft)
        created += 1
      }
      toast.success(created === 1 ? "1 caso importado" : `${created} casos importados`)
      onOpenChange(false)
      setRows([])
    } catch (error) {
      reportError(error)
    }
  }

  const flat = data ? flattenSuites(data.suites, projectId) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar casos</DialogTitle>
          <DialogDescription>
            Elige el CSV, revisa las primeras filas y asigna cada columna. Si la suite no existe, se crea.
          </DialogDescription>
        </DialogHeader>
        <FormField label="Archivo CSV">
          <input
            className="text-sm"
            type="file"
            accept=".csv,text/csv"
            aria-label="Archivo CSV"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) load(file)
            }}
          />
        </FormField>
        {headers.length > 0 ? (
          <div className="grid gap-3">
            {headers.map((header, index) => (
              <div key={`${header}-${index}`} className="grid gap-2 sm:grid-cols-2 sm:items-center">
                <p className="truncate text-sm">{header || `Columna ${index + 1}`}</p>
                <EnumSelect
                  ariaLabel={`Mapeo de ${header || index}`}
                  value={mapping[String(index)] ?? "ignore"}
                  onChange={(value) => setMapping({ ...mapping, [String(index)]: value })}
                  options={[
                    { value: "ignore", label: "Ignorar" },
                    ...fields.map((field) => ({ value: field.id, label: field.label })),
                  ]}
                />
              </div>
            ))}
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead>
                  <tr>
                    {headers.map((header, index) => (
                      <th key={index} className="px-2 py-1 font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.slice(0, 5).map((row, index) => (
                    <tr key={index} className="border-t">
                      {headers.map((_, cell) => (
                        <td key={cell} className="px-2 py-1">{row[cell]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              {body.length} filas. Suites actuales: {flat.map((row) => row.suite.name).join(", ") || "ninguna"}.
            </p>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={importRows} disabled={body.length === 0}>
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
