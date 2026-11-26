import type {
  CaseKind,
  CaseStatus,
  ExecutionType,
  Priority,
  ResultStatus,
  Severity,
  SprintStatus,
} from "@/lib/types"

export const priorityLabel: Record<Priority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
}

export const priorityRank: Record<Priority, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baja: 3,
}

export const priorities: Priority[] = ["critica", "alta", "media", "baja"]

export const severityLabel: Record<Severity, string> = {
  menor: "Menor",
  mayor: "Mayor",
  critica: "Crítica",
  bloqueante: "Bloqueante",
}

export const severities: Severity[] = ["bloqueante", "critica", "mayor", "menor"]

export const kindLabel: Record<CaseKind, string> = {
  funcional: "Funcional",
  regresion: "Regresión",
  humo: "Humo",
  interfaz: "Interfaz",
}

export const kinds: CaseKind[] = ["funcional", "regresion", "humo", "interfaz"]

export const executionLabel: Record<ExecutionType, string> = {
  manual: "Manual",
  automatizado: "Automatizado",
  ambos: "Ambos",
}

export const executionTypes: ExecutionType[] = ["manual", "automatizado", "ambos"]

export const caseStatusLabel: Record<CaseStatus, string> = {
  borrador: "Borrador",
  listo: "Listo",
  obsoleto: "Obsoleto",
}

export const caseStatuses: CaseStatus[] = ["borrador", "listo", "obsoleto"]

export const resultLabel: Record<ResultStatus, string> = {
  pendiente: "Pendiente",
  passed: "Pasó",
  failed: "Falló",
  blocked: "Bloqueado",
  skipped: "Omitido",
}

export const resultHint: Record<Exclude<ResultStatus, "pendiente">, string> = {
  passed: "Passed",
  failed: "Failed",
  blocked: "Blocked",
  skipped: "Skipped",
}

export const sprintStatusLabel: Record<SprintStatus, string> = {
  planeado: "Planeado",
  activo: "Activo",
  cerrado: "Cerrado",
}

export const sprintStatuses: SprintStatus[] = ["planeado", "activo", "cerrado"]
