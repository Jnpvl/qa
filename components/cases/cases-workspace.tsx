"use client"

import Link from "next/link"
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { useRouter } from "next/navigation"
import { GripVertical, MoreHorizontal, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, FormField, PageHeader, reportError } from "@/components/bits"
import { SuiteTree } from "@/components/cases/suite-tree"
import { EnumSelect } from "@/components/enum-select"
import { MissingProject } from "@/components/missing-project"
import { CaseStatusBadge, ExecutionBadge, PriorityMark } from "@/components/status-pills"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { CaseImportDialog, exportCases } from "@/components/cases/case-transfer"
import { filterCases, sortCases, type CaseSortKey } from "@/lib/cases-query"
import { downloadText } from "@/lib/csv"
import { downloadPlaywrightAgentPackage } from "@/lib/playwright-package"
import {
  caseStatuses,
  caseStatusLabel,
  executionLabel,
  executionTypes,
  priorities,
  priorityLabel,
} from "@/lib/labels"
import { descendantIds, flattenSuites, suitePath } from "@/lib/suites"
import { caseCode } from "@/lib/text"
import { useWorkspace } from "@/components/use-workspace"
import { cn } from "@/lib/utils"
import type {
  BulkPatch,
  CaseStatus,
  ExecutionType,
  Priority,
  TestCase,
} from "@/lib/types"

const PAGE_SIZE = 12

type BulkMode =
  | "suite"
  | "status"
  | "priority"
  | "execution"
  | "sprint-add"
  | "sprint-remove"
  | "tag"
  | "delete"
  | null

export function CasesWorkspace() {
  const router = useRouter()
  const { store, data, project } = useWorkspace()
  const [query, setQuery] = useState("")
  const [priority, setPriority] = useState<Priority | "todas">("todas")
  const [execution, setExecution] = useState<ExecutionType | "todas">("todas")
  const [status, setStatus] = useState<CaseStatus | "todos">("todos")
  const [sprintId, setSprintId] = useState<string | "todos">("todos")
  const [tag, setTag] = useState<string | "todas">("todas")
  const [suiteId, setSuiteId] = useState<string | "todas">(() =>
    store.preferredSuiteId && data?.suites.some((item) => item.id === store.preferredSuiteId && item.projectId === project?.id)
      ? store.preferredSuiteId
      : "todas",
  )
  const [sort, setSort] = useState<{ key: CaseSortKey; dir: "asc" | "desc" }>({
    key: "number",
    dir: "asc",
  })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [treeOpen, setTreeOpen] = useState(false)
  const [bulk, setBulk] = useState<BulkMode>(null)
  const [bulkSuite, setBulkSuite] = useState("none")
  const [bulkStatus, setBulkStatus] = useState<CaseStatus>("activo")
  const [bulkPriority, setBulkPriority] = useState<Priority>("alta")
  const [bulkExecution, setBulkExecution] = useState<ExecutionType>("manual")
  const [bulkSprint, setBulkSprint] = useState("none")
  const [bulkTag, setBulkTag] = useState("")
  const [moveError, setMoveError] = useState("")
  const [importOpen, setImportOpen] = useState(false)
  const [suiteWidth, setSuiteWidth] = useState(288)
  const suiteResizeStart = useRef<{ x: number; width: number } | null>(null)
  const shift = useRef(false)

  const filterKey = [query, priority, execution, status, sprintId, tag, suiteId, sort.key, sort.dir].join("|")
  const selectionKey = [project?.id ?? "", suiteId, query, priority, execution, status, sprintId, tag].join("|")
  const [appliedFilter, setAppliedFilter] = useState(filterKey)
  const [selectionScope, setSelectionScope] = useState(selectionKey)
  const filtersChanged = appliedFilter !== filterKey
  if (filtersChanged) {
    setAppliedFilter(filterKey)
    setPage(1)
  }
  if (selectionScope !== selectionKey) {
    setSelectionScope(selectionKey)
    setSelected(new Set())
  }

  const projectCases = useMemo(
    () => (data && project ? data.cases.filter((item) => item.projectId === project.id) : []),
    [data, project],
  )
  const suites = useMemo(
    () => (data && project ? data.suites.filter((item) => item.projectId === project.id) : []),
    [data, project],
  )
  const sprints = useMemo(
    () => (data && project ? data.sprints.filter((item) => item.projectId === project.id) : []),
    [data, project],
  )

  const filtered = useMemo(() => {
    if (!project) return []
    return sortCases(
      filterCases({
        cases: projectCases,
        projectKey: project.key,
        suites,
        suiteId,
        query,
        priority,
        execution,
        status,
        sprintId,
        tag,
      }),
      sort,
    )
  }, [project, projectCases, suites, suiteId, query, priority, execution, status, sprintId, tag, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  if (!filtersChanged && page > pageCount) setPage(pageCount)
  const safePage = filtersChanged ? 1 : Math.min(page, pageCount)
  const start = (safePage - 1) * PAGE_SIZE
  const pageItems = filtered.slice(start, start + PAGE_SIZE)
  const allPageSelected = pageItems.length > 0 && pageItems.every((item) => selected.has(item.id))
  const somePageSelected = pageItems.some((item) => selected.has(item.id))
  const tags = [...new Set(projectCases.flatMap((item) => item.tags))].sort((a, b) =>
    a.localeCompare(b, "es"),
  )
  const flatSuites = project ? flattenSuites(data?.suites ?? [], project.id) : []
  const selectedSuite = suiteId === "todas" ? null : suites.find((item) => item.id === suiteId)
  const selectedSuiteIncludesChildren = selectedSuite
    ? descendantIds(suites, selectedSuite.id).length > 1
    : false

  if (!data || !project) return <MissingProject />

  function chooseSuite(id: string | "todas") {
    setSuiteId(id)
    if (id !== "todas") store.setPreferredSuiteId(id)
  }

  function toggleSort(key: CaseSortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "title" || key === "updated" ? "asc" : "asc" },
    )
  }

  function startSuiteResize(event: ReactPointerEvent<HTMLDivElement>) {
    suiteResizeStart.current = { x: event.clientX, width: suiteWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveSuiteResize(event: ReactPointerEvent<HTMLDivElement>) {
    const start = suiteResizeStart.current
    if (!start) return
    setSuiteWidth(Math.min(420, Math.max(220, start.width + event.clientX - start.x)))
  }

  function toggleOne(id: string, index: number) {
    setSelected((current) => {
      const next = new Set(current)
      if (shift.current) {
        const anchor = pageItems.findIndex((item) => next.has(item.id))
        const from = anchor === -1 ? index : Math.min(anchor, index)
        const to = anchor === -1 ? index : Math.max(anchor, index)
        for (const item of pageItems.slice(from, to + 1)) next.add(item.id)
        return next
      }
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function togglePage() {
    setSelected((current) => {
      const next = new Set(current)
      if (allPageSelected) {
        for (const item of pageItems) next.delete(item.id)
      } else {
        for (const item of pageItems) next.add(item.id)
      }
      return next
    })
  }

  function selectFiltered() {
    setSelected(new Set(filtered.map((item) => item.id)))
  }

  function runSelected(ids: string[]) {
    store.setRunDraftIds(ids)
    router.push(`/proyectos/${project!.id}/corridas`)
  }

  function applyBulk() {
    const ids = [...selected]
    try {
      if (bulk === "delete") {
        store.deleteCases(ids)
        setSelected(new Set())
        toast.success(ids.length === 1 ? "Caso eliminado" : "Casos eliminados")
      } else {
        const patch: BulkPatch = {}
        if (bulk === "suite") {
          if (bulkSuite === "none") {
            setMoveError("Elige una suite.")
            throw new Error("Elige una suite.")
          }
          patch.suiteId = bulkSuite
        } else if (bulk === "status") patch.status = bulkStatus
        else if (bulk === "priority") patch.priority = bulkPriority
        else if (bulk === "execution") patch.executionType = bulkExecution
        else if (bulk === "sprint-add") {
          if (bulkSprint === "none") throw new Error("Elige un sprint.")
          patch.addSprintId = bulkSprint
        } else if (bulk === "sprint-remove") {
          if (bulkSprint === "none") throw new Error("Elige un sprint.")
          patch.removeSprintId = bulkSprint
        } else if (bulk === "tag") {
          if (!bulkTag.trim()) throw new Error("Escribe una etiqueta.")
          patch.addTag = bulkTag.trim()
        }
        store.bulkUpdate(ids, patch)
        toast.success("Casos actualizados")
      }
      setMoveError("")
      setBulk(null)
    } catch (error) {
      if (bulk === "suite") {
        const message = error instanceof Error ? error.message : "Elige una suite."
        setMoveError(message)
      }
      reportError(error)
    }
  }

  const activeFilters = [
    priority !== "todas" ? { label: `Prioridad: ${priorityLabel[priority]}`, clear: () => setPriority("todas") } : null,
    execution !== "todas"
      ? { label: `Ejecución: ${executionLabel[execution]}`, clear: () => setExecution("todas") }
      : null,
    status !== "todos" ? { label: `Estado: ${caseStatusLabel[status]}`, clear: () => setStatus("todos") } : null,
    sprintId !== "todos"
      ? {
          label: `Sprint: ${sprints.find((item) => item.id === sprintId)?.name ?? "Sprint"}`,
          clear: () => setSprintId("todos"),
        }
      : null,
    tag !== "todas" ? { label: `Etiqueta: ${tag}`, clear: () => setTag("todas") } : null,
  ].filter((item): item is { label: string; clear: () => void } => Boolean(item))

  const tree = (
    <SuiteTree
      key={suiteId}
      projectId={project.id}
      suites={data.suites}
      cases={data.cases}
      selectedId={suiteId}
      showCases
      projectKey={project.key}
      onSelectCase={(item) => router.push(`/proyectos/${project.id}/casos/${item.id}`)}
      onSelect={(id) => {
        chooseSuite(id)
        setTreeOpen(false)
      }}
    />
  )

  return (
    <div className="flex min-h-full w-full min-w-0 max-w-full flex-col lg:flex-row">
      <aside
        style={{ width: suiteWidth, flexBasis: suiteWidth }}
        className="sticky top-0 hidden max-h-[calc(100dvh-3rem)] shrink-0 overflow-y-auto border-r bg-card lg:block"
      >
        {tree}
      </aside>
      <div
        role="separator"
        aria-label="Cambiar ancho de la columna de suites"
        aria-orientation="vertical"
        aria-valuemin={220}
        aria-valuemax={420}
        aria-valuenow={suiteWidth}
        tabIndex={0}
        title="Arrastra para cambiar el ancho"
        className="group relative hidden w-3 shrink-0 cursor-col-resize touch-none items-center justify-center bg-transparent text-muted-foreground/60 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex"
        onPointerDown={startSuiteResize}
        onPointerMove={moveSuiteResize}
        onPointerUp={() => { suiteResizeStart.current = null }}
        onPointerCancel={() => { suiteResizeStart.current = null }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setSuiteWidth((width) => Math.max(220, width - 16))
          if (event.key === "ArrowRight") setSuiteWidth((width) => Math.min(420, width + 16))
        }}
      >
        <GripVertical className="pointer-events-none size-4" aria-hidden="true" />
      </div>
      <div className="mx-auto w-full min-w-0 max-w-screen-2xl flex-1 p-4 md:p-6">
        <div className="grid gap-4">
          <PageHeader
            title="Casos de prueba"
            description="Busca, filtra, mueve y edita los casos de prueba del proyecto."
            actions={
              <>
                <Button variant="outline" className="lg:hidden" onClick={() => setTreeOpen(true)}>
                  Suites
                </Button>
                <Button variant="outline" onClick={() => exportCases(projectCases, suites, "casos.csv")} disabled={projectCases.length === 0}>
                  CSV
                </Button>
                <Button
                  variant="outline"
                  disabled={projectCases.length === 0}
                  onClick={() => downloadText("casos.json", JSON.stringify(projectCases, null, 2), "application/json")}
                >
                  JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadPlaywrightAgentPackage(project, projectCases, suites)}
                  disabled={projectCases.length === 0}
                >
                  Paquete Playwright
                </Button>

                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  Importar
                </Button>
                <Button
                  onClick={() => router.push(`/proyectos/${project.id}/casos/nuevo`)}
                  disabled={suites.length === 0}
                >
                  <Plus />
                  Nuevo caso
                </Button>
              </>
            }
          />
          {suites.length === 0 ? (
            <FirstSuite
              onCreate={(name) => {
                try {
                  const created = store.createSuite({
                    projectId: project.id,
                    parentId: null,
                    name,
                    description: "",
                  })
                  chooseSuite(created.id)
                  toast.success("Suite creada")
                } catch (error) {
                  reportError(error)
                }
              }}
            />
          ) : (
            <>
              {selectedSuite ? (
                <p className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
                  {selectedSuiteIncludesChildren
                    ? `Mostrando casos de “${selectedSuite.name}” y sus subsecciones. Selecciona una subsección para ver solo ese grupo.`
                    : `Mostrando casos de “${selectedSuite.name}”.`}
                </p>
              ) : null}
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
                  <Input
                    data-search-input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar por título, ID o etiqueta"
                    aria-label="Buscar casos"
                    className="xl:max-w-sm"
                  />
                  <div className="flex w-full min-w-0 flex-wrap gap-2">
                    <EnumSelect
                      size="sm"
                      ariaLabel="Filtrar por prioridad"
                      className="w-[calc(50%-0.25rem)] min-w-0 sm:w-36"
                      value={priority}
                      onChange={setPriority}
                      options={[
                        { value: "todas", label: "Prioridad" },
                        ...priorities.map((item) => ({ value: item, label: priorityLabel[item] })),
                      ]}
                    />
                    <EnumSelect
                      size="sm"
                      ariaLabel="Filtrar por ejecución"
                      className="w-[calc(50%-0.25rem)] min-w-0 sm:w-40"
                      value={execution}
                      onChange={setExecution}
                      options={[
                        { value: "todas", label: "Ejecución" },
                        ...executionTypes.map((item) => ({
                          value: item,
                          label: executionLabel[item],
                        })),
                      ]}
                    />
                    <EnumSelect
                      size="sm"
                      ariaLabel="Filtrar por estado"
                      className="w-[calc(50%-0.25rem)] min-w-0 sm:w-36"
                      value={status}
                      onChange={setStatus}
                      options={[
                        { value: "todos", label: "Estado" },
                        ...caseStatuses.map((item) => ({
                          value: item,
                          label: caseStatusLabel[item],
                        })),
                      ]}
                    />
                    <EnumSelect
                      size="sm"
                      ariaLabel="Filtrar por sprint"
                      className="w-[calc(50%-0.25rem)] min-w-0 sm:w-44"
                      value={sprintId}
                      onChange={setSprintId}
                      options={[
                        { value: "todos", label: "Sprint" },
                        ...sprints.map((item) => ({ value: item.id, label: item.name })),
                      ]}
                    />
                    <EnumSelect
                      size="sm"
                      ariaLabel="Filtrar por etiqueta"
                      className="w-full min-w-0 sm:w-40"
                      value={tag}
                      onChange={setTag}
                      options={[
                        { value: "todas", label: "Etiqueta" },
                        ...tags.map((item) => ({ value: item, label: item })),
                      ]}
                    />
                  </div>
                </div>
                {activeFilters.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeFilters.map((filter) => (
                      <button
                        key={filter.label}
                        type="button"
                        onClick={filter.clear}
                        className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-1 text-xs"
                      >
                        {filter.label}
                        <X className="size-3" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {selected.size > 0 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                  <span className="font-medium">{selected.size} seleccionados</span>
                  <Button size="sm" variant="outline" onClick={() => runSelected([...selected])}>
                    Nueva corrida
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setBulk("suite")}>
                    Mover
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setBulk("status")}>
                    Estado
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setBulk("priority")}>
                    Prioridad
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setBulk("execution")}>
                    Ejecución
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setBulk("sprint-add")}>
                    Agregar a sprint
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setBulk("sprint-remove")}>
                    Quitar de sprint
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setBulk("tag")}>
                    Etiqueta
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setBulk("delete")}>
                    Eliminar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                    Limpiar
                  </Button>
                  {selected.size < filtered.length ? (
                    <button
                      type="button"
                      className="text-xs text-primary underline-offset-2 hover:underline"
                      onClick={selectFiltered}
                    >
                      Seleccionar los {filtered.length} filtrados
                    </button>
                  ) : null}
                </div>
              ) : null}

              {filtered.length === 0 ? (
                query.trim() || activeFilters.length > 0 ? (
                  <EmptyState
                    title="No hay casos con estos filtros"
                    body="Quita un filtro o crea un caso en la suite que estás viendo."
                    action={
                      <Button onClick={() => router.push(`/proyectos/${project.id}/casos/nuevo`)}>
                        Nuevo caso
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    title={suiteId === "todas" ? "Todavía no hay casos" : "Esta suite aún no tiene casos"}
                    body={
                      suiteId === "todas"
                        ? "Crea el primero para empezar a documentar las pruebas."
                        : "Crea un caso en esta suite. Si tiene secciones, también puedes revisarlas."
                    }
                    action={
                      <Button onClick={() => router.push(`/proyectos/${project.id}/casos/nuevo`)}>
                        Nuevo caso
                      </Button>
                    }
                  />
                )
              ) : (
                <>
                  <ul className="w-full min-w-0 divide-y overflow-hidden rounded-xl border bg-card lg:hidden">
                    {pageItems.map((item, index) => (
                      <li key={item.id} className="flex w-full min-w-0 items-start gap-2 p-3">
                        <CaseCheckbox
                          checked={selected.has(item.id)}
                          label={item.title}
                          onPointerDown={(pressed) => {
                            shift.current = pressed
                          }}
                          onToggle={() => toggleOne(item.id, index)}
                        />
                        <CaseMain
                          item={item}
                          projectId={project.id}
                          projectKey={project.key}
                          suiteLabel={suitePath(suites, item.suiteId).join(" / ")}
                          sprintLabel={sprintNames(item, sprints)}
                        />
                        <CaseMenu
                          onEdit={() => router.push(`/proyectos/${project.id}/casos/${item.id}`)}
                          onDuplicate={() => {
                            try {
                              const copy = store.duplicateCase(item.id)
                              toast.success("Caso duplicado")
                              router.push(`/proyectos/${project.id}/casos/${copy.id}`)
                            } catch (error) {
                              reportError(error)
                            }
                          }}
                          onMove={() => {
                            setSelected(new Set([item.id]))
                            setBulk("suite")
                          }}
                          onRun={() => runSelected([item.id])}
                          onDelete={() => {
                            setSelected(new Set([item.id]))
                            setBulk("delete")
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                  <div className="hidden min-w-0 overflow-x-auto rounded-xl border bg-card lg:block">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="w-10 px-3 py-2">
                            <Checkbox
                              checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                              onCheckedChange={togglePage}
                              aria-label="Seleccionar esta página"
                            />
                          </th>
                          <SortHeader label="ID" active={sort.key === "number"} dir={sort.dir} onClick={() => toggleSort("number")} />
                          <SortHeader label="Título" active={sort.key === "title"} dir={sort.dir} onClick={() => toggleSort("title")} />
                          <SortHeader label="Prioridad" active={sort.key === "priority"} dir={sort.dir} onClick={() => toggleSort("priority")} />
                          <th className="px-3 py-2 font-medium">Ejecución</th>
                          <th className="px-3 py-2 font-medium">Estado</th>
                          <th className="px-3 py-2 font-medium">
                            <span className="sr-only">Acciones</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.map((item, index) => (
                          <tr
                            key={item.id}
                            className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                            onClick={() => router.push(`/proyectos/${project.id}/casos/${item.id}`)}
                          >
                            <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                              <CaseCheckbox
                                checked={selected.has(item.id)}
                                label={item.title}
                                onPointerDown={(pressed) => {
                                  shift.current = pressed
                                }}
                                onToggle={() => toggleOne(item.id, index)}
                              />
                            </td>
                            <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                              {caseCode(project.key, item.number, item.idPrefix, item.customId)}
                            </td>
                            <td className="px-3 py-2">
                              <p className="font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {suitePath(suites, item.suiteId).join(" / ")}
                                {item.tags.length ? ` · ${item.tags.join(", ")}` : ""}
                              </p>
                            </td>
                            <td className="px-3 py-2">
                              <PriorityMark priority={item.priority} />
                            </td>
                            <td className="px-3 py-2">
                              <ExecutionBadge type={item.executionType} />
                            </td>
                            <td className="px-3 py-2">
                              <CaseStatusBadge status={item.status} />
                            </td>
                            <td className="px-3 py-2 text-right" onClick={(event) => event.stopPropagation()}>
                              <CaseMenu
                                onEdit={() => router.push(`/proyectos/${project.id}/casos/${item.id}`)}
                                onDuplicate={() => {
                                  try {
                                    const copy = store.duplicateCase(item.id)
                                    toast.success("Caso duplicado")
                                    router.push(`/proyectos/${project.id}/casos/${copy.id}`)
                                  } catch (error) {
                                    reportError(error)
                                  }
                                }}
                                onMove={() => {
                                  setSelected(new Set([item.id]))
                                  setBulk("suite")
                                }}
                                onRun={() => runSelected([item.id])}
                                onDelete={() => {
                                  setSelected(new Set([item.id]))
                                  setBulk("delete")
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>
                      {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} de {filtered.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={safePage <= 1}
                        onClick={() => setPage(safePage - 1)}
                      >
                        Anterior
                      </Button>
                      <span className="tabular-nums">
                        {safePage} / {pageCount}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={safePage >= pageCount}
                        onClick={() => setPage(safePage + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <Sheet open={treeOpen} onOpenChange={setTreeOpen}>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle>Suites</SheetTitle>
          </SheetHeader>
          {tree}
        </SheetContent>
      </Sheet>

      <Dialog open={bulk !== null && bulk !== "delete"} onOpenChange={(open) => !open && setBulk(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulk === "suite"
                ? "Mover a una suite"
                : bulk === "status"
                  ? "Cambiar estado"
                  : bulk === "priority"
                    ? "Cambiar prioridad"
                    : bulk === "execution"
                      ? "Cambiar tipo de ejecución"
                      : bulk === "tag"
                        ? "Agregar etiqueta"
                        : bulk === "sprint-remove"
                          ? "Quitar de un sprint"
                          : "Agregar a un sprint"}
            </DialogTitle>
          </DialogHeader>
          {bulk === "suite" ? (
            <FormField label="Suite" htmlFor="move-suite" error={moveError}>
              <EnumSelect
                id="move-suite"
                invalid={Boolean(moveError)}
                describedBy={moveError ? "move-suite-error" : undefined}
                value={bulkSuite}
                onChange={(value) => {
                  setBulkSuite(value)
                  if (moveError) setMoveError("")
                }}
                options={[
                  { value: "none", label: "Elige una suite" },
                  ...flatSuites.map((row) => ({
                    value: row.suite.id,
                    label: `${"— ".repeat(row.depth)}${row.suite.name}`,
                  })),
                ]}
              />
            </FormField>
          ) : null}
          {bulk === "status" ? (
            <EnumSelect
              value={bulkStatus}
              onChange={setBulkStatus}
              options={caseStatuses.map((item) => ({ value: item, label: caseStatusLabel[item] }))}
            />
          ) : null}
          {bulk === "priority" ? (
            <EnumSelect
              value={bulkPriority}
              onChange={setBulkPriority}
              options={priorities.map((item) => ({ value: item, label: priorityLabel[item] }))}
            />
          ) : null}
          {bulk === "execution" ? (
            <EnumSelect
              value={bulkExecution}
              onChange={setBulkExecution}
              options={executionTypes.map((item) => ({ value: item, label: executionLabel[item] }))}
            />
          ) : null}
          {bulk === "sprint-add" || bulk === "sprint-remove" ? (
            <EnumSelect
              value={bulkSprint}
              onChange={setBulkSprint}
              options={[
                { value: "none", label: "Elige un sprint" },
                ...sprints.map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
          ) : null}
          {bulk === "tag" ? (
            <Input
              value={bulkTag}
              onChange={(event) => setBulkTag(event.target.value)}
              placeholder="regresión"
              aria-label="Etiqueta"
            />
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulk(null)}>
              Cancelar
            </Button>
            <Button onClick={applyBulk}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CaseImportDialog open={importOpen} projectId={project.id} onOpenChange={setImportOpen} />

      <AlertDialog open={bulk === "delete"} onOpenChange={(open) => !open && setBulk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar {selected.size === 1 ? "este caso" : `${selected.size} casos`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              También se quitan de las corridas del proyecto. El número no se reutiliza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={applyBulk}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function sprintNames(
  item: TestCase,
  sprints: { id: string; name: string }[],
) {
  const names = item.sprintIds
    .map((id) => sprints.find((sprint) => sprint.id === id)?.name)
    .filter((name): name is string => Boolean(name))
  return names.join(", ")
}

function CaseMain({
  item,
  projectId,
  projectKey,
  suiteLabel,
  sprintLabel,
}: {
  item: TestCase
  projectId: string
  projectKey: string
  suiteLabel: string
  sprintLabel: string
}) {
  return (
    <Link href={`/proyectos/${projectId}/casos/${item.id}`} className="min-w-0 flex-1">
      <p className="font-mono text-[11px] text-muted-foreground">
        {caseCode(projectKey, item.number, item.idPrefix, item.customId)}
      </p>
      <p className="font-medium break-words">{item.title}</p>
      <p className="text-xs break-words text-muted-foreground">
        {suiteLabel}
        {sprintLabel ? ` · ${sprintLabel}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <ExecutionBadge type={item.executionType} />
        <CaseStatusBadge status={item.status} />
      </div>
    </Link>
  )
}

function CaseCheckbox({
  checked,
  label,
  onToggle,
  onPointerDown,
}: {
  checked: boolean
  label: string
  onToggle: () => void
  onPointerDown: (shiftKey: boolean) => void
}) {
  return (
    <Checkbox
      checked={checked}
      aria-label={`Seleccionar ${label}`}
      onPointerDown={(event) => onPointerDown(event.shiftKey)}
      onCheckedChange={onToggle}
      onClick={(event) => event.stopPropagation()}
    />
  )
}

function CaseMenu({
  onEdit,
  onDuplicate,
  onMove,
  onRun,
  onDelete,
}: {
  onEdit: () => void
  onDuplicate: () => void
  onMove: () => void
  onRun: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Acciones del caso">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicate}>Duplicar</DropdownMenuItem>
        <DropdownMenuItem onSelect={onMove}>Mover a suite…</DropdownMenuItem>
        <DropdownMenuItem onSelect={onRun}>Nueva corrida</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FirstSuite({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = useState("General")
  return (
    <EmptyState
      title="Crea la primera suite"
      body="Las suites agrupan los casos. Empieza con una carpeta, por ejemplo General o Login."
      action={
        <form
          className="mx-auto flex w-full max-w-sm flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            onCreate(name)
          }}
        >
          <Input
            aria-label="Nombre de la suite"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button type="submit">Crear suite</Button>
        </form>
      }
    />
  )
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: "asc" | "desc"
  onClick: () => void
}) {
  return (
    <th className="px-3 py-2 font-medium">
      <button type="button" className={cn("hover:text-foreground", active && "text-foreground")} onClick={onClick}>
        {label}
        {active ? (dir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  )
}
