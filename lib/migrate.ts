import type {
  Attachment,
  CaseChange,
  CaseStatus,
  Defect,
  DemoState,
  Member,
  Plan,
  Project,
  RunResult,
  TestCase,
  TestRun,
  TestStep,
  Requirement,
} from "@/lib/types"

const priorities = new Set(["baja", "media", "alta", "critica"])
const severities = new Set(["menor", "mayor", "critica", "bloqueante"])
const kinds = new Set(["funcional", "regresion", "humo", "interfaz"])
const executions = new Set(["manual", "automatizado", "ambos"])
const results = new Set(["pendiente", "passed", "failed", "blocked", "skipped"])
const stepResults = new Set(["pendiente", "passed", "failed", "blocked"])
const defectStatuses = new Set(["abierto", "en_progreso", "resuelto", "cerrado"])

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function text(value: unknown) {
  return typeof value === "string" ? value : ""
}

function statusOf(value: unknown): CaseStatus {
  if (value === "listo" || value === "activo") return "activo"
  if (value === "obsoleto") return "obsoleto"
  return "borrador"
}

function attachment(value: unknown): Attachment | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<Attachment>
  if (!item.id || !item.name || !item.dataUrl) return null
  return {
    id: text(item.id),
    name: text(item.name),
    mime: text(item.mime) || "application/octet-stream",
    size: typeof item.size === "number" ? item.size : 0,
    dataUrl: text(item.dataUrl),
  }
}

function normalizeCase(value: unknown): TestCase | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<TestCase> & { status?: string }
  if (!item.id || !item.projectId || !item.title) return null
  const steps = asArray<Partial<TestStep>>(item.steps)
    .filter((step) => step && (step.action || step.expected))
    .map((step, index) => ({
      id: text(step.id) || `st_migrated_${index}`,
      action: text(step.action),
      expected: text(step.expected),
    }))
  const changes = asArray<Partial<CaseChange>>(item.changes)
    .filter((change) => change && change.summary)
    .map((change, index) => ({
      id: text(change.id) || `chg_${index}`,
      at: text(change.at) || text(item.updatedAt) || new Date().toISOString(),
      summary: text(change.summary),
    }))
  return {
    id: text(item.id),
    projectId: text(item.projectId),
    suiteId: text(item.suiteId),
    number: typeof item.number === "number" ? item.number : 0,
    title: text(item.title),
    preconditions: text(item.preconditions),
    steps,
    priority: priorities.has(text(item.priority)) ? item.priority! : "media",
    severity: severities.has(text(item.severity)) ? item.severity! : "mayor",
    kind: kinds.has(text(item.kind)) ? item.kind! : "funcional",
    executionType: executions.has(text(item.executionType)) ? item.executionType! : "manual",
    tags: asArray<unknown>(item.tags).map((tag) => text(tag)).filter(Boolean),
    status: statusOf(item.status),
    sprintIds: asArray<unknown>(item.sprintIds).map((id) => text(id)).filter(Boolean),
    requirementIds: asArray<unknown>(item.requirementIds).map((id) => text(id)).filter(Boolean),
    automationStatus: ["candidato", "planeado", "automatizado", "no_aplica"].includes(text(item.automationStatus)) ? item.automationStatus as TestCase["automationStatus"] : "candidato",
    automationRef: text(item.automationRef),
    attachments: asArray<unknown>(item.attachments).map(attachment).filter((item): item is Attachment => Boolean(item)),
    changes,
    updatedAt: text(item.updatedAt) || new Date().toISOString(),
  }
}

function normalizeResult(value: unknown): RunResult | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<RunResult>
  if (!item.caseId) return null
  return {
    caseId: text(item.caseId),
    status: results.has(text(item.status)) ? item.status! : "pendiente",
    comment: text(item.comment),
    assigneeId: item.assigneeId ? text(item.assigneeId) : null,
    stepResults: asArray<Partial<RunResult["stepResults"][number]>>(item.stepResults)
      .filter((step) => step?.stepId)
      .map((step) => ({
        stepId: text(step.stepId),
        status: stepResults.has(text(step.status)) ? (step.status as RunResult["stepResults"][number]["status"]) : "pendiente",
      })),
    attachment: attachment(item.attachment),
    minutes: typeof item.minutes === "number" && item.minutes >= 0 ? item.minutes : null,
    caseSnapshot: item.caseSnapshot && typeof item.caseSnapshot === "object" ? item.caseSnapshot as NonNullable<RunResult["caseSnapshot"]> : undefined,
  }
}

function normalizeRun(value: unknown): TestRun | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<TestRun>
  if (!item.id || !item.projectId || !item.name) return null
  return {
    id: text(item.id),
    projectId: text(item.projectId),
    sprintId: item.sprintId ? text(item.sprintId) : null,
    planId: item.planId ? text(item.planId) : null,
    name: text(item.name),
    assigneeId: item.assigneeId ? text(item.assigneeId) : null,
    environment: text(item.environment),
    build: text(item.build),
    createdAt: text(item.createdAt) || new Date().toISOString(),
    closedAt: item.closedAt ? text(item.closedAt) : null,
    status: item.status === "cerrada" ? "cerrada" : "en_progreso",
    closeType: item.closeType === "completa" || item.closeType === "parcial" ? item.closeType : null,
    closeNote: text(item.closeNote),
    results: asArray<unknown>(item.results).map(normalizeResult).filter((item): item is RunResult => Boolean(item)),
  }
}

function normalizePlan(value: unknown): Plan | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<Plan>
  if (!item.id || !item.projectId || !item.name) return null
  return {
    id: text(item.id),
    projectId: text(item.projectId),
    sprintId: item.sprintId ? text(item.sprintId) : null,
    name: text(item.name),
    description: text(item.description),
    caseIds: asArray<unknown>(item.caseIds).map((id) => text(id)).filter(Boolean),
    suiteIds: asArray<unknown>(item.suiteIds).map((id) => text(id)).filter(Boolean),
    createdAt: text(item.createdAt) || new Date().toISOString(),
  }
}

function normalizeDefect(value: unknown): Defect | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<Defect>
  if (!item.id || !item.projectId || !item.title) return null
  return {
    id: text(item.id),
    projectId: text(item.projectId),
    caseId: item.caseId ? text(item.caseId) : null,
    runId: item.runId ? text(item.runId) : null,
    title: text(item.title),
    description: text(item.description),
    stepsToReproduce: text(item.stepsToReproduce),
    expected: text(item.expected),
    actual: text(item.actual),
    severity: severities.has(text(item.severity)) ? item.severity! : "mayor",
    priority: priorities.has(text(item.priority)) ? item.priority! : "media",
    assigneeId: item.assigneeId ? text(item.assigneeId) : null,
    environment: text(item.environment),
    build: text(item.build),
    externalId: text(item.externalId),
    origin: ["corrida", "exploratoria", "soporte", "produccion", "otro"].includes(text(item.origin)) ? item.origin as Defect["origin"] : item.runId ? "corrida" : "otro",
    originNote: text(item.originNote),
    status: defectStatuses.has(text(item.status)) ? item.status! : "abierto",
    externalUrl: text(item.externalUrl),
    createdAt: text(item.createdAt) || new Date().toISOString(),
  }
}

function normalizeMember(value: unknown): Member | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<Member>
  if (!item.id || !item.projectId || !item.name) return null
  return {
    id: text(item.id),
    projectId: text(item.projectId),
    name: text(item.name),
    role: text(item.role),
  }
}

export function migrate(raw: unknown): DemoState | null {
  if (!raw || typeof raw !== "object") return null
  const data = raw as Record<string, unknown>
  if (!Array.isArray(data.projects) || !Array.isArray(data.cases) || !Array.isArray(data.suites)) {
    return null
  }
  const cases = data.cases.map(normalizeCase).filter((item): item is TestCase => Boolean(item))
  const projects = (data.projects as Project[]).map((project) => {
    const legacy = project as Project & { environments?: Partial<Project["environments"]> }
    return {
      ...project,
      environments: {
        local: text(legacy.environments?.local),
        stage: text(legacy.environments?.stage),
        production: text(legacy.environments?.production),
      },
      sample: project.sample === true || project.id === "prj_tienda",
    }
  })
  return {
    version: 3,
    projects,
    sprints: asArray(data.sprints),
    suites: data.suites as DemoState["suites"],
    cases,
    runs: asArray(data.runs).map(normalizeRun).filter((item): item is TestRun => Boolean(item)),
    plans: asArray(data.plans).map(normalizePlan).filter((item): item is Plan => Boolean(item)),
    defects: asArray(data.defects).map(normalizeDefect).filter((item): item is Defect => Boolean(item)),
    members: asArray(data.members).map(normalizeMember).filter((item): item is Member => Boolean(item)),
    requirements: asArray<Partial<Requirement>>(data.requirements).filter((item): item is Partial<Requirement> & { id: string; projectId: string; title: string } => Boolean(item?.id && item.projectId && item.title)).map((item) => ({ id: text(item.id), projectId: text(item.projectId), key: text(item.key), title: text(item.title), description: text(item.description), externalUrl: text(item.externalUrl), status: ["propuesto", "activo", "completado", "cancelado"].includes(text(item.status)) ? item.status as Requirement["status"] : "activo", createdAt: text(item.createdAt) || new Date().toISOString() })),
    autoAdvance: typeof data.autoAdvance === "boolean" ? data.autoAdvance : true,
    initialized: data.initialized === false ? false : true,
  }
}

export function emptyWorkspace(): DemoState {
  return {
    version: 3,
    projects: [],
    sprints: [],
    suites: [],
    cases: [],
    runs: [],
    plans: [],
    defects: [],
    members: [],
    requirements: [],
    autoAdvance: true,
    initialized: false,
  }
}
