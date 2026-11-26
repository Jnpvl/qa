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
import { FilePicker } from "@/components/file-picker"
import { downloadText, parseCsv, toCsv } from "@/lib/csv"
import {
  importFields,
  mapCsvHeaders,
  parseExecution,
  parsePriority,
  parseSeverity,
  parseStatus,
  parseSteps,
  type ImportField,
} from "@/lib/case-import"
import { useStore } from "@/lib/store"
import { createId } from "@/lib/text"
import { flattenSuites } from "@/lib/suites"
import type { CaseDraft, TestCase } from "@/lib/types"

const fieldLabels: Record<ImportField, string> = {
  title: "Título",
  suite: "Suite",
  preconditions: "Precondiciones",
  steps: "Pasos",
  priority: "Prioridad",
  severity: "Severidad",
  kind: "Tipo",
  status: "Estado",
  execution: "Ejecución",
  tags: "Etiquetas",
}

type FieldId = ImportField | "ignore"

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
  const [filePickerKey, setFilePickerKey] = useState(0)
  const headers = rows[0] ?? []
  const body = rows.slice(1)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setRows([])
      setMapping({})
      setFilePickerKey((current) => current + 1)
    }
    onOpenChange(next)
  }

  function load(file: File) {
    file
      .text()
      .then((text) => {
        const parsed = parseCsv(text)
        setRows(parsed)
        setMapping(mapCsvHeaders(parsed[0] ?? []))
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
    let defaultSuiteId = projectSuites[0]?.id
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
        if (!suiteId) {
          if (!defaultSuiteId) {
            const suite = store.createSuite({ projectId, parentId: null, name: "General", description: "" })
            defaultSuiteId = suite.id
            projectSuites.push(suite)
          }
          suiteId = defaultSuiteId
        }
        const kindValue = (column("kind") >= 0 ? row[column("kind")] : "").trim().toLowerCase()
        const draft: CaseDraft = {
          suiteId: suiteId ?? defaultSuiteId!,
          title,
          preconditions: column("preconditions") >= 0 ? row[column("preconditions")] ?? "" : "",
          steps: parseSteps(column("steps") >= 0 ? row[column("steps")] ?? "" : "").map((step) => ({
            id: createId("st"),
            ...step,
          })),
          priority: parsePriority(column("priority") >= 0 ? row[column("priority")] ?? "" : ""),
          severity: parseSeverity(column("severity") >= 0 ? row[column("severity")] ?? "" : ""),
          kind: kindValue === "regresion" || kindValue === "regresión" ? "regresion" : kindValue === "humo" ? "humo" : kindValue === "interfaz" ? "interfaz" : "funcional",
          executionType: parseExecution(column("execution") >= 0 ? row[column("execution")] ?? "" : ""),
          tags: (column("tags") >= 0 ? row[column("tags")] : "").split(",").map((item) => item.trim()).filter(Boolean),
          status: parseStatus(column("status") >= 0 ? row[column("status")] ?? "" : ""),
          sprintIds: [],
          requirementIds: [],
          automationStatus: "candidato",
          automationRef: "",
        }
        store.createCase(projectId, draft)
        created += 1
      }
      if (created === 0) {
        reportError(new Error("No se importaron casos. Revisa que el CSV tenga títulos en la columna asignada."))
        return
      }
      toast.success(created === 1 ? "1 caso importado" : `${created} casos importados`)
      handleOpenChange(false)
    } catch (error) {
      reportError(error)
    }
  }

  const flat = data ? flattenSuites(data.suites, projectId) : []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar casos</DialogTitle>
          <DialogDescription>
            El CSV se importa en {data?.projects.find((item) => item.id === projectId)?.name ?? "este proyecto"}. Las suites indicadas que no existan se crearán aquí; si una fila no indica suite, se usará la primera del proyecto o se creará “General”.
          </DialogDescription>
        </DialogHeader>
        <FormField label="Archivo CSV">
          <FilePicker key={filePickerKey} label="Elegir CSV" accept=".csv,text/csv" emptyLabel="Ningún CSV seleccionado" onFile={load} />
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
                    ...importFields.map((field) => ({ value: field, label: fieldLabels[field] })),
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
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
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
