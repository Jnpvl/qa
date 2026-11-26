import { normalize } from "@/lib/text"
import type { CaseStatus, ExecutionType, Priority, Severity } from "@/lib/types"

export const importFields = [
  "title",
  "suite",
  "preconditions",
  "steps",
  "priority",
  "severity",
  "kind",
  "status",
  "execution",
  "tags",
] as const

export type ImportField = (typeof importFields)[number]

const aliases: Record<ImportField, string[]> = {
  title: ["titulo", "title", "nombre"],
  suite: ["suite"],
  preconditions: ["precondiciones", "preconditions"],
  steps: ["pasos", "paso", "steps"],
  priority: ["prioridad", "priority"],
  severity: ["severidad", "severity"],
  kind: ["tipo", "kind"],
  status: ["estado", "status"],
  execution: ["ejecucion", "execution"],
  tags: ["etiquetas", "etiqueta", "tags"],
}

export function mapCsvHeaders(headers: string[]) {
  const mapping: Record<string, ImportField | "ignore"> = {}
  headers.forEach((header, index) => {
    const key = normalize(header.trim())
    const match = importFields.find((field) => aliases[field].some((alias) => key === alias || key.includes(alias)))
    mapping[String(index)] = match ?? "ignore"
  })
  return mapping
}

const priorities: Record<string, Priority> = {
  baja: "baja",
  media: "media",
  alta: "alta",
  critica: "critica",
}

const severities: Record<string, Severity> = {
  menor: "menor",
  mayor: "mayor",
  critica: "critica",
  bloqueante: "bloqueante",
}

const statuses: Record<string, CaseStatus> = {
  borrador: "borrador",
  activo: "activo",
  listo: "activo",
  obsoleto: "obsoleto",
}

const executions: Record<string, ExecutionType> = {
  manual: "manual",
  automatizado: "automatizado",
  ambos: "ambos",
}

export function parsePriority(value: string): Priority {
  return priorities[normalize(value)] ?? "media"
}

export function parseSeverity(value: string): Severity {
  return severities[normalize(value)] ?? "mayor"
}

export function parseStatus(value: string): CaseStatus {
  return statuses[normalize(value)] ?? "borrador"
}

export function parseExecution(value: string): ExecutionType {
  return executions[normalize(value)] ?? "manual"
}

export function parseSteps(value: string) {
  return value
    .split(/\s*(?:\||\n)\s*/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [action, expected = ""] = part.split(/\s*=>\s*/, 2)
      return { action: action.trim(), expected: expected.trim() }
    })
    .filter((step) => step.action || step.expected)
}
