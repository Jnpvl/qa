"use client"

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"
import { migrate } from "@/lib/migrate"
import { readState, writeState } from "@/lib/storage"
import { seedData } from "@/lib/seed"
import { wouldCycle } from "@/lib/suites"
import { caseCode, createId, isProjectKey, normalize } from "@/lib/text"
import type {
  Attachment,
  BulkPatch,
  CaseDraft,
  Defect,
  DefectStatus,
  DemoState,
  Member,
  Plan,
  Project,
  ResultStatus,
  RunResult,
  Severity,
  Sprint,
  SprintStatus,
  StepResult,
  Suite,
  TestCase,
  TestRun,
} from "@/lib/types"

type Listener = () => void

let snapshot: DemoState | null = null
let loadScheduled = false
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  if (!loadScheduled && typeof window !== "undefined") {
    loadScheduled = true
    queueMicrotask(() => {
      if (!snapshot) {
        snapshot = readState()
        emit()
      }
    })
  }
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return snapshot
}

function getServerSnapshot() {
  return null
}

function update(recipe: (draft: DemoState) => void) {
  if (!snapshot) throw new Error("La demo todavía está cargando.")
  const next = structuredClone(snapshot)
  recipe(next)
  snapshot = next
  writeState(next)
  emit()
}

function current() {
  if (!snapshot) throw new Error("La demo todavía está cargando.")
  return snapshot
}

function nextCaseNumber(state: DemoState, projectId: string) {
  const numbers = state.cases
    .filter((item) => item.projectId === projectId)
    .map((item) => item.number)
  return (numbers.length ? Math.max(...numbers) : 0) + 1
}

function blankResult(caseId: string): RunResult {
  return {
    caseId,
    status: "pendiente",
    comment: "",
    assigneeId: null,
    stepResults: [],
    attachment: null,
    minutes: null,
  }
}

function changeSummary(before: TestCase, draft: CaseDraft, steps: TestCase["steps"]) {
  const bits: string[] = []
  if (before.title !== draft.title.trim()) bits.push("el título")
  if (before.preconditions !== draft.preconditions.trim()) bits.push("las precondiciones")
  if (JSON.stringify(before.steps) !== JSON.stringify(steps)) bits.push("los pasos")
  if (before.priority !== draft.priority) bits.push("la prioridad")
  if (before.severity !== draft.severity) bits.push("la severidad")
  if (before.kind !== draft.kind) bits.push("el tipo")
  if (before.status !== draft.status) bits.push("el estado")
  if (before.executionType !== draft.executionType) bits.push("el tipo de ejecución")
  if (before.suiteId !== draft.suiteId) bits.push("la suite")
  if (JSON.stringify(before.tags) !== JSON.stringify(uniqueTags(draft.tags))) bits.push("las etiquetas")
  if (JSON.stringify([...before.sprintIds].sort()) !== JSON.stringify([...new Set(draft.sprintIds)].sort())) {
    bits.push("los sprints")
  }
  if (!bits.length) return null
  return `Cambió ${bits.join(", ")}.`
}

function assertKey(state: DemoState, key: string, ignoreId?: string) {
  if (!isProjectKey(key)) {
    throw new Error("La clave usa de 2 a 8 letras o números y empieza con letra.")
  }
  if (state.projects.some((project) => project.id !== ignoreId && project.key === key)) {
    throw new Error("Ya hay un proyecto con esa clave.")
  }
}

const actions = {
  reset() {
    snapshot = structuredClone(seedData)
    writeState(snapshot)
    emit()
  },
  createProject(input: { name: string; key: string; description: string }) {
    const state = current()
    const name = input.name.trim()
    const key = input.key.trim().toUpperCase()
    if (!name) throw new Error("Escribe el nombre del proyecto.")
    assertKey(state, key)
    const project: Project = {
      id: createId("prj"),
      name,
      key,
      description: input.description.trim(),
      createdAt: new Date().toISOString(),
    }
    update((draft) => {
      draft.projects.push(project)
    })
    return project
  },
  updateProject(
    id: string,
    patch: { name: string; key: string; description: string },
  ) {
    const state = current()
    const name = patch.name.trim()
    const key = patch.key.trim().toUpperCase()
    if (!name) throw new Error("Escribe el nombre del proyecto.")
    assertKey(state, key, id)
    update((draft) => {
      const project = draft.projects.find((item) => item.id === id)
      if (!project) return
      project.name = name
      project.key = key
      project.description = patch.description.trim()
    })
  },
  deleteProject(id: string) {
    update((draft) => {
      draft.projects = draft.projects.filter((item) => item.id !== id)
      draft.sprints = draft.sprints.filter((item) => item.projectId !== id)
      draft.suites = draft.suites.filter((item) => item.projectId !== id)
      draft.cases = draft.cases.filter((item) => item.projectId !== id)
      draft.runs = draft.runs.filter((item) => item.projectId !== id)
      draft.plans = draft.plans.filter((item) => item.projectId !== id)
      draft.defects = draft.defects.filter((item) => item.projectId !== id)
      draft.members = draft.members.filter((item) => item.projectId !== id)
    })
  },
  createSprint(input: {
    projectId: string
    name: string
    goal: string
    startDate: string
    endDate: string
    status: SprintStatus
  }) {
    const name = input.name.trim()
    if (!name) throw new Error("Escribe el nombre del sprint.")
    if (input.startDate && input.endDate && input.endDate < input.startDate) {
      throw new Error("La fecha de fin no puede ser anterior al inicio.")
    }
    const sprint: Sprint = {
      id: createId("spr"),
      projectId: input.projectId,
      name,
      goal: input.goal.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status,
    }
    update((draft) => {
      draft.sprints.push(sprint)
    })
    return sprint
  },
  updateSprint(
    id: string,
    patch: {
      name: string
      goal: string
      startDate: string
      endDate: string
      status: SprintStatus
    },
  ) {
    const name = patch.name.trim()
    if (!name) throw new Error("Escribe el nombre del sprint.")
    if (patch.startDate && patch.endDate && patch.endDate < patch.startDate) {
      throw new Error("La fecha de fin no puede ser anterior al inicio.")
    }
    update((draft) => {
      const sprint = draft.sprints.find((item) => item.id === id)
      if (!sprint) return
      sprint.name = name
      sprint.goal = patch.goal.trim()
      sprint.startDate = patch.startDate
      sprint.endDate = patch.endDate
      sprint.status = patch.status
    })
  },
  deleteSprint(id: string) {
    update((draft) => {
      draft.sprints = draft.sprints.filter((item) => item.id !== id)
      for (const item of draft.cases) {
        item.sprintIds = item.sprintIds.filter((sprintId) => sprintId !== id)
      }
      for (const run of draft.runs) {
        if (run.sprintId === id) run.sprintId = null
      }
      for (const plan of draft.plans) {
        if (plan.sprintId === id) plan.sprintId = null
      }
    })
  },
  createSuite(input: {
    projectId: string
    parentId: string | null
    name: string
    description: string
  }) {
    const name = input.name.trim()
    if (!name) throw new Error("Escribe el nombre de la suite.")
    const suite: Suite = {
      id: createId("sui"),
      projectId: input.projectId,
      parentId: input.parentId,
      name,
      description: input.description.trim(),
      order: 0,
    }
    update((draft) => {
      const siblings = draft.suites.filter(
        (item) =>
          item.projectId === input.projectId && item.parentId === input.parentId,
      )
      suite.order = siblings.reduce((max, item) => Math.max(max, item.order + 1), 0)
      draft.suites.push(suite)
    })
    return suite
  },
  updateSuite(id: string, patch: { name: string; description: string }) {
    const name = patch.name.trim()
    if (!name) throw new Error("Escribe el nombre de la suite.")
    update((draft) => {
      const suite = draft.suites.find((item) => item.id === id)
      if (!suite) return
      suite.name = name
      suite.description = patch.description.trim()
    })
  },
  deleteSuite(id: string) {
    const state = current()
    if (state.suites.some((item) => item.parentId === id)) {
      throw new Error("Esta suite tiene subsecciones. Muévelas o elimínalas primero.")
    }
    if (state.cases.some((item) => item.suiteId === id)) {
      throw new Error("Pasa los casos a otra suite antes de eliminarla.")
    }
    update((draft) => {
      draft.suites = draft.suites.filter((item) => item.id !== id)
    })
  },
  moveSuite(id: string, parentId: string | null) {
    const state = current()
    const suite = state.suites.find((item) => item.id === id)
    if (!suite) return
    if (parentId) {
      const parent = state.suites.find((item) => item.id === parentId)
      if (!parent || parent.projectId !== suite.projectId) {
        throw new Error("Esa suite no pertenece al proyecto.")
      }
    }
    if (wouldCycle(state.suites, id, parentId)) {
      throw new Error("No puedes mover una suite dentro de sí misma.")
    }
    update((draft) => {
      const target = draft.suites.find((item) => item.id === id)
      if (!target) return
      target.parentId = parentId
      const siblings = draft.suites.filter(
        (item) =>
          item.projectId === target.projectId &&
          item.parentId === parentId &&
          item.id !== id,
      )
      target.order = siblings.reduce((max, item) => Math.max(max, item.order + 1), 0)
    })
  },
  reorderSuite(id: string, direction: -1 | 1) {
    update((draft) => {
      const suite = draft.suites.find((item) => item.id === id)
      if (!suite) return
      const siblings = draft.suites
        .filter(
          (item) =>
            item.projectId === suite.projectId && item.parentId === suite.parentId,
        )
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "es"))
      const index = siblings.findIndex((item) => item.id === id)
      const next = index + direction
      if (index < 0 || next < 0 || next >= siblings.length) return
      const reordered = siblings.slice()
      const [item] = reordered.splice(index, 1)
      reordered.splice(next, 0, item)
      reordered.forEach((entry, order) => {
        const target = draft.suites.find((candidate) => candidate.id === entry.id)
        if (target) target.order = order
      })
    })
  },
  createCase(projectId: string, draft: CaseDraft) {
    const state = current()
    const title = draft.title.trim()
    if (!title) throw new Error("Escribe el título del caso.")
    const suite = state.suites.find((item) => item.id === draft.suiteId)
    if (!suite || suite.projectId !== projectId) {
      throw new Error("Elige una suite para el caso.")
    }
    const testCase: TestCase = {
      id: createId("cse"),
      projectId,
      number: nextCaseNumber(state, projectId),
      suiteId: draft.suiteId,
      title,
      preconditions: draft.preconditions.trim(),
      steps: cleanSteps(draft.steps),
      priority: draft.priority,
      severity: draft.severity,
      kind: draft.kind,
      executionType: draft.executionType,
      tags: uniqueTags(draft.tags),
      status: draft.status,
      sprintIds: [...new Set(draft.sprintIds)],
      attachments: [],
      changes: [
        {
          id: createId("chg"),
          at: new Date().toISOString(),
          summary: "Caso creado.",
        },
      ],
      updatedAt: new Date().toISOString(),
    }
    update((next) => {
      next.cases.push(testCase)
    })
    return testCase
  },
  updateCase(id: string, draft: CaseDraft) {
    const state = current()
    const title = draft.title.trim()
    if (!title) throw new Error("Escribe el título del caso.")
    const existing = state.cases.find((item) => item.id === id)
    if (!existing) throw new Error("No encontramos el caso.")
    const suite = state.suites.find((item) => item.id === draft.suiteId)
    if (!suite || suite.projectId !== existing.projectId) {
      throw new Error("Elige una suite del mismo proyecto.")
    }
    const steps = cleanSteps(draft.steps)
    const summary = changeSummary(existing, { ...draft, title }, steps)
    update((next) => {
      const item = next.cases.find((candidate) => candidate.id === id)
      if (!item) return
      item.suiteId = draft.suiteId
      item.title = title
      item.preconditions = draft.preconditions.trim()
      item.steps = steps
      item.priority = draft.priority
      item.severity = draft.severity
      item.kind = draft.kind
      item.executionType = draft.executionType
      item.tags = uniqueTags(draft.tags)
      item.status = draft.status
      item.sprintIds = [...new Set(draft.sprintIds)]
      item.updatedAt = new Date().toISOString()
      if (summary) {
        item.changes.push({ id: createId("chg"), at: item.updatedAt, summary })
      }
    })
  },
  deleteCases(ids: string[]) {
    const drop = new Set(ids)
    update((draft) => {
      draft.cases = draft.cases.filter((item) => !drop.has(item.id))
      for (const run of draft.runs) {
        run.results = run.results.filter((result) => !drop.has(result.caseId))
      }
      for (const plan of draft.plans) {
        plan.caseIds = plan.caseIds.filter((id) => !drop.has(id))
      }
      draft.defects = draft.defects.filter((item) => !drop.has(item.caseId))
    })
  },
  duplicateCase(id: string) {
    const state = current()
    const source = state.cases.find((item) => item.id === id)
    if (!source) throw new Error("No encontramos el caso.")
    const project = state.projects.find((item) => item.id === source.projectId)
    const copy: TestCase = {
      ...structuredClone(source),
      id: createId("cse"),
      number: nextCaseNumber(state, source.projectId),
      title: `${source.title} (copia)`,
      status: "borrador",
      updatedAt: new Date().toISOString(),
      steps: source.steps.map((step) => ({ ...step, id: createId("st") })),
      attachments: source.attachments.map((item) => ({ ...item, id: createId("att") })),
      changes: [
        {
          id: createId("chg"),
          at: new Date().toISOString(),
          summary: `Clonado de ${caseCode(project?.key ?? "CASO", source.number)}.`,
        },
      ],
    }
    update((draft) => {
      draft.cases.push(copy)
    })
    return copy
  },
  bulkUpdate(ids: string[], patch: BulkPatch) {
    const selected = new Set(ids)
    if (!selected.size) return
    update((draft) => {
      if (patch.suiteId) {
        const suite = draft.suites.find((item) => item.id === patch.suiteId)
        if (!suite) return
        for (const item of draft.cases) {
          if (selected.has(item.id) && item.projectId === suite.projectId) {
            item.suiteId = suite.id
            item.updatedAt = new Date().toISOString()
          }
        }
      }
      for (const item of draft.cases) {
        if (!selected.has(item.id)) continue
        if (patch.status) item.status = patch.status
        if (patch.priority) item.priority = patch.priority
        if (patch.executionType) item.executionType = patch.executionType
        if (patch.addTag) {
          const tag = patch.addTag.trim()
          if (tag && !item.tags.some((current) => normalize(current) === normalize(tag))) {
            item.tags.push(tag)
          }
        }
        if (patch.addSprintId && !item.sprintIds.includes(patch.addSprintId)) {
          item.sprintIds.push(patch.addSprintId)
        }
        if (patch.removeSprintId) {
          item.sprintIds = item.sprintIds.filter((id) => id !== patch.removeSprintId)
        }
        if (
          patch.status ||
          patch.priority ||
          patch.executionType ||
          patch.addTag ||
          patch.addSprintId ||
          patch.removeSprintId
        ) {
          item.updatedAt = new Date().toISOString()
        }
      }
    })
  },
  createPlan(input: {
    projectId: string
    sprintId: string | null
    name: string
    description: string
    caseIds?: string[]
    suiteIds?: string[]
  }) {
    const name = input.name.trim()
    if (!name) throw new Error("Escribe el nombre del plan.")
    const plan: Plan = {
      id: createId("pln"),
      projectId: input.projectId,
      sprintId: input.sprintId,
      name,
      description: input.description.trim(),
      caseIds: [...new Set(input.caseIds ?? [])],
      suiteIds: [...new Set(input.suiteIds ?? [])],
      createdAt: new Date().toISOString(),
    }
    update((draft) => {
      draft.plans.push(plan)
    })
    return plan
  },
  updatePlan(
    id: string,
    patch: {
      sprintId: string | null
      name: string
      description: string
      caseIds?: string[]
      suiteIds?: string[]
    },
  ) {
    const name = patch.name.trim()
    if (!name) throw new Error("Escribe el nombre del plan.")
    update((draft) => {
      const plan = draft.plans.find((item) => item.id === id)
      if (!plan) return
      plan.name = name
      plan.sprintId = patch.sprintId
      plan.description = patch.description.trim()
      if (patch.caseIds) plan.caseIds = [...new Set(patch.caseIds)]
      if (patch.suiteIds) plan.suiteIds = [...new Set(patch.suiteIds)]
    })
  },
  deletePlan(id: string) {
    update((draft) => {
      draft.plans = draft.plans.filter((item) => item.id !== id)
      for (const run of draft.runs) {
        if (run.planId === id) run.planId = null
      }
    })
  },
  createRun(input: {
    projectId: string
    name: string
    sprintId: string | null
    planId: string | null
    caseIds: string[]
    assigneeId?: string | null
    environment?: string
    build?: string
  }) {
    const name = input.name.trim()
    if (!name) throw new Error("Escribe el nombre de la corrida.")
    const unique = [...new Set(input.caseIds)]
    if (!unique.length) throw new Error("Elige al menos un caso.")
    const state = current()
    const valid = unique.filter((id) =>
      state.cases.some((item) => item.id === id && item.projectId === input.projectId),
    )
    if (!valid.length) throw new Error("Elige al menos un caso del proyecto.")
    const run: TestRun = {
      id: createId("run"),
      projectId: input.projectId,
      sprintId: input.sprintId,
      planId: input.planId,
      name,
      assigneeId: input.assigneeId ?? null,
      environment: input.environment?.trim() ?? "",
      build: input.build?.trim() ?? "",
      createdAt: new Date().toISOString(),
      closedAt: null,
      status: "en_progreso",
      results: valid.map((caseId) => blankResult(caseId)),
    }
    update((draft) => {
      draft.runs.push(run)
    })
    return run
  },
  updateRunMeta(
    id: string,
    patch: {
      name?: string
      sprintId?: string | null
      planId?: string | null
      assigneeId?: string | null
      environment?: string
      build?: string
    },
  ) {
    update((draft) => {
      const run = draft.runs.find((item) => item.id === id)
      if (!run) return
      if (patch.name !== undefined) {
        const name = patch.name.trim()
        if (!name) throw new Error("Escribe el nombre de la corrida.")
        run.name = name
      }
      if (patch.sprintId !== undefined) run.sprintId = patch.sprintId
      if (patch.planId !== undefined) run.planId = patch.planId
      if (patch.assigneeId !== undefined) run.assigneeId = patch.assigneeId
      if (patch.environment !== undefined) run.environment = patch.environment.trim()
      if (patch.build !== undefined) run.build = patch.build.trim()
    })
  },
  setRunResult(
    runId: string,
    caseId: string,
    patch: {
      status?: ResultStatus
      comment?: string
      assigneeId?: string | null
      stepResults?: StepResult[]
      attachment?: Attachment | null
      minutes?: number | null
    },
  ) {
    const state = current()
    const run = state.runs.find((item) => item.id === runId)
    if (!run || run.status === "cerrada") return false
    update((draft) => {
      const target = draft.runs.find((item) => item.id === runId)
      const result = target?.results.find((item) => item.caseId === caseId)
      if (!target || target.status === "cerrada" || !result) return
      if (patch.status) result.status = patch.status
      if (patch.comment !== undefined) result.comment = patch.comment
      if (patch.assigneeId !== undefined) result.assigneeId = patch.assigneeId
      if (patch.stepResults) result.stepResults = patch.stepResults
      if (patch.attachment !== undefined) result.attachment = patch.attachment
      if (patch.minutes !== undefined) result.minutes = patch.minutes
    })
    return true
  },
  closeRun(id: string) {
    update((draft) => {
      const run = draft.runs.find((item) => item.id === id)
      if (!run) return
      run.status = "cerrada"
      run.closedAt = new Date().toISOString()
    })
  },
  reopenRun(id: string) {
    update((draft) => {
      const run = draft.runs.find((item) => item.id === id)
      if (!run) return
      run.status = "en_progreso"
      run.closedAt = null
    })
  },
  deleteRun(id: string) {
    update((draft) => {
      draft.runs = draft.runs.filter((item) => item.id !== id)
    })
  },
  setAutoAdvance(value: boolean) {
    update((draft) => {
      draft.autoAdvance = value
    })
  },
  addCaseAttachment(caseId: string, file: Attachment) {
    update((draft) => {
      const item = draft.cases.find((candidate) => candidate.id === caseId)
      if (!item) return
      item.attachments.push(file)
      item.updatedAt = new Date().toISOString()
      item.changes.push({
        id: createId("chg"),
        at: item.updatedAt,
        summary: `Adjuntó ${file.name}.`,
      })
    })
  },
  removeCaseAttachment(caseId: string, attachmentId: string) {
    update((draft) => {
      const item = draft.cases.find((candidate) => candidate.id === caseId)
      if (!item) return
      const file = item.attachments.find((candidate) => candidate.id === attachmentId)
      item.attachments = item.attachments.filter((candidate) => candidate.id !== attachmentId)
      item.updatedAt = new Date().toISOString()
      item.changes.push({
        id: createId("chg"),
        at: item.updatedAt,
        summary: `Quitó el adjunto ${file?.name ?? ""}.`.trim(),
      })
    })
  },
  createMember(input: { projectId: string; name: string; role: string }) {
    const name = input.name.trim()
    if (!name) throw new Error("Escribe el nombre.")
    const member: Member = {
      id: createId("mem"),
      projectId: input.projectId,
      name,
      role: input.role.trim(),
    }
    update((draft) => {
      draft.members.push(member)
    })
    return member
  },
  updateMember(id: string, patch: { name: string; role: string }) {
    const name = patch.name.trim()
    if (!name) throw new Error("Escribe el nombre.")
    update((draft) => {
      const member = draft.members.find((item) => item.id === id)
      if (!member) return
      member.name = name
      member.role = patch.role.trim()
    })
  },
  deleteMember(id: string) {
    update((draft) => {
      draft.members = draft.members.filter((item) => item.id !== id)
      for (const run of draft.runs) {
        if (run.assigneeId === id) run.assigneeId = null
        for (const result of run.results) {
          if (result.assigneeId === id) result.assigneeId = null
        }
      }
    })
  },
  createDefect(input: {
    projectId: string
    caseId: string
    runId: string | null
    title: string
    severity: Severity
    externalUrl: string
  }) {
    const title = input.title.trim()
    if (!title) throw new Error("Escribe el título del defecto.")
    const defect: Defect = {
      id: createId("def"),
      projectId: input.projectId,
      caseId: input.caseId,
      runId: input.runId,
      title,
      severity: input.severity,
      status: "abierto",
      externalUrl: input.externalUrl.trim(),
      createdAt: new Date().toISOString(),
    }
    update((draft) => {
      draft.defects.push(defect)
      const item = draft.cases.find((candidate) => candidate.id === input.caseId)
      if (item) {
        item.changes.push({
          id: createId("chg"),
          at: defect.createdAt,
          summary: `Registró el defecto «${title}».`,
        })
      }
    })
    return defect
  },
  updateDefect(
    id: string,
    patch: { title?: string; severity?: Severity; status?: DefectStatus; externalUrl?: string },
  ) {
    update((draft) => {
      const defect = draft.defects.find((item) => item.id === id)
      if (!defect) return
      if (patch.title !== undefined) {
        const title = patch.title.trim()
        if (!title) throw new Error("Escribe el título del defecto.")
        defect.title = title
      }
      if (patch.severity) defect.severity = patch.severity
      if (patch.status) defect.status = patch.status
      if (patch.externalUrl !== undefined) defect.externalUrl = patch.externalUrl.trim()
    })
  },
  deleteDefect(id: string) {
    update((draft) => {
      draft.defects = draft.defects.filter((item) => item.id !== id)
    })
  },
  replaceState(raw: unknown) {
    const next = migrate(raw)
    if (!next) throw new Error("Ese archivo no es un respaldo de Casos.")
    snapshot = next
    writeState(next)
    emit()
  },
}

function cleanSteps(steps: CaseDraft["steps"]) {
  return steps
    .map((step) => ({
      id: step.id || createId("st"),
      action: step.action.trim(),
      expected: step.expected.trim(),
    }))
    .filter((step) => step.action || step.expected)
}

function uniqueTags(tags: string[]) {
  const seen = new Set<string>()
  const next: string[] = []
  for (const tag of tags) {
    const trimmed = tag.trim()
    const key = normalize(trimmed)
    if (!trimmed || seen.has(key)) continue
    seen.add(key)
    next.push(trimmed)
  }
  return next
}

export type StoreValue = typeof actions & {
  data: DemoState | null
  preferredSuiteId: string | null
  setPreferredSuiteId: Dispatch<SetStateAction<string | null>>
  runDraftIds: string[] | null
  setRunDraftIds: Dispatch<SetStateAction<string[] | null>>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [preferredSuiteId, setPreferredSuiteId] = useState<string | null>(null)
  const [runDraftIds, setRunDraftIds] = useState<string[] | null>(null)
  const value = useMemo<StoreValue>(
    () => ({
      data,
      preferredSuiteId,
      setPreferredSuiteId,
      runDraftIds,
      setRunDraftIds,
      ...actions,
    }),
    [data, preferredSuiteId, runDraftIds],
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error("useStore debe usarse dentro de StoreProvider.")
  return value
}
