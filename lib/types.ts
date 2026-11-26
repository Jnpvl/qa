export type Priority = "baja" | "media" | "alta" | "critica"
export type Severity = "menor" | "mayor" | "critica" | "bloqueante"
export type CaseKind = "funcional" | "regresion" | "humo" | "interfaz"
export type ExecutionType = "manual" | "automatizado" | "ambos"
export type CaseStatus = "borrador" | "listo" | "obsoleto"
export type SprintStatus = "planeado" | "activo" | "cerrado"
export type RunStatus = "en_progreso" | "cerrada"
export type ResultStatus =
  | "pendiente"
  | "passed"
  | "failed"
  | "blocked"
  | "skipped"

export interface Project {
  id: string
  key: string
  name: string
  description: string
  createdAt: string
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
  updatedAt: string
}

export interface RunResult {
  caseId: string
  status: ResultStatus
  comment: string
}

export interface TestRun {
  id: string
  projectId: string
  sprintId: string | null
  planId: string | null
  name: string
  createdAt: string
  closedAt: string | null
  status: RunStatus
  results: RunResult[]
}

export interface Plan {
  id: string
  projectId: string
  sprintId: string | null
  name: string
  description: string
  createdAt: string
}

export interface DemoState {
  version: 1
  projects: Project[]
  sprints: Sprint[]
  suites: Suite[]
  cases: TestCase[]
  runs: TestRun[]
  plans: Plan[]
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
