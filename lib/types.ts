export type Priority = "baja" | "media" | "alta" | "critica"
export type Severity = "menor" | "mayor" | "critica" | "bloqueante"
export type CaseKind = "funcional" | "regresion" | "humo" | "interfaz"
export type ExecutionType = "manual" | "automatizado" | "ambos"
export type CaseStatus = "borrador" | "activo" | "obsoleto"
export type SprintStatus = "planeado" | "activo" | "cerrado"
export type RunStatus = "en_progreso" | "cerrada"
export type DefectStatus = "abierto" | "en_progreso" | "resuelto" | "cerrado"
export type ResultStatus =
  | "pendiente"
  | "passed"
  | "failed"
  | "blocked"
  | "skipped"
export type StepResultStatus = "pendiente" | "passed" | "failed" | "blocked"

export interface Attachment {
  id: string
  name: string
  mime: string
  size: number
  dataUrl: string
}

export interface CaseChange {
  id: string
  at: string
  summary: string
}

export interface Project {
  id: string
  key: string
  name: string
  description: string
  environments: { local: string; stage: string; production: string }
  createdAt: string
  createdById?: string
  createdByName?: string
  sample?: boolean
}

export interface AutomationReport {
  schema: "qa-results/v1"
  projectKey: string
  environment?: string
  build?: string
  generatedAt?: string
  coverage?: { caseId: string; spec: string }[]
  results: {
    caseId: string
    status: "passed" | "failed" | "blocked" | "skipped"
    durationMs?: number
    error?: string
    spec?: string
  }[]
}

export interface Sprint {
  id: string
  projectId: string
  name: string
  goal: string
  startDate: string
  endDate: string
  status: SprintStatus
}

export interface Suite {
  id: string
  projectId: string
  parentId: string | null
  name: string
  description: string
  order: number
}

export interface TestStep {
  id: string
  action: string
  expected: string
}

export interface TestCase {
  id: string
  projectId: string
  suiteId: string
  number: number
  title: string
  preconditions: string
  steps: TestStep[]
  priority: Priority
  severity: Severity
  kind: CaseKind
  executionType: ExecutionType
  tags: string[]
  status: CaseStatus
  sprintIds: string[]
  requirementIds: string[]
  automationStatus: "candidato" | "planeado" | "automatizado" | "no_aplica"
  automationRef: string
  attachments: Attachment[]
  changes: CaseChange[]
  updatedAt: string
}

export interface StepResult {
  stepId: string
  status: StepResultStatus
}

export interface RunResult {
  caseId: string
  status: ResultStatus
  comment: string
  assigneeId: string | null
  stepResults: StepResult[]
  attachment: Attachment | null
  minutes: number | null
  caseSnapshot?: CaseSnapshot
  closeNote?: string
}

export interface CaseSnapshot {
  number: number
  title: string
  preconditions: string
  steps: TestStep[]
  priority: Priority
  severity: Severity
  kind: CaseKind
  executionType: ExecutionType
  requirementIds: string[]
}

export interface TestRun {
  id: string
  projectId: string
  sprintId: string | null
  planId: string | null
  name: string
  assigneeId: string | null
  environment: string
  build: string
  createdAt: string
  closedAt: string | null
  status: RunStatus
  closeType: "completa" | "parcial" | null
  closeNote: string
  results: RunResult[]
}

export interface Plan {
  id: string
  projectId: string
  sprintId: string | null
  name: string
  description: string
  caseIds: string[]
  suiteIds: string[]
  createdAt: string
}

export interface Defect {
  id: string
  projectId: string
  caseId: string | null
  runId: string | null
  title: string
  description: string
  stepsToReproduce: string
  expected: string
  actual: string
  severity: Severity
  priority: Priority
  assigneeId: string | null
  environment: string
  build: string
  externalId: string
  origin: "corrida" | "exploratoria" | "soporte" | "produccion" | "otro"
  originNote: string
  status: DefectStatus
  externalUrl: string
  createdAt: string
}

export interface Member {
  id: string
  projectId: string
  name: string
  role: string
}

export interface Requirement {
  id: string
  projectId: string
  key: string
  title: string
  description: string
  externalUrl: string
  status: "propuesto" | "activo" | "completado" | "cancelado"
  createdAt: string
}

export interface DemoState {
  version: 3
  projects: Project[]
  sprints: Sprint[]
  suites: Suite[]
  cases: TestCase[]
  runs: TestRun[]
  plans: Plan[]
  defects: Defect[]
  members: Member[]
  requirements: Requirement[]
  autoAdvance: boolean
  initialized: boolean
}

export interface CaseDraft {
  suiteId: string
  title: string
  preconditions: string
  steps: TestStep[]
  priority: Priority
  severity: Severity
  kind: CaseKind
  executionType: ExecutionType
  tags: string[]
  status: CaseStatus
  sprintIds: string[]
  requirementIds: string[]
  automationStatus: TestCase["automationStatus"]
  automationRef: string
}

export interface BulkPatch {
  suiteId?: string
  status?: CaseStatus
  priority?: Priority
  executionType?: ExecutionType
  addTag?: string
  addSprintId?: string
  removeSprintId?: string
}
