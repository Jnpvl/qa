"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
} from "lucide-react"
import { FormField, reportError } from "@/components/bits"
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
import { Textarea } from "@/components/ui/textarea"
import { EnumSelect } from "@/components/enum-select"
import { childSuites, descendantIds, effectiveSuitePrefix, flattenSuites, suitePrefixFromName, wouldCycle } from "@/lib/suites"
import { useStore } from "@/lib/store"
import { caseCode } from "@/lib/text"
import { cn } from "@/lib/utils"
import type { Suite, TestCase } from "@/lib/types"

export function SuiteTree({
  projectId,
  suites,
  cases,
  selectedId,
  onSelect,
  showCases = false,
  activeCaseId,
  projectKey,
  onSelectCase,
}: {
  projectId: string
  suites: Suite[]
  cases: TestCase[]
  selectedId: string | "todas"
  onSelect: (id: string | "todas") => void
  showCases?: boolean
  activeCaseId?: string
  projectKey?: string
  onSelectCase?: (testCase: TestCase) => void
}) {
  const store = useStore()
  const projectSuites = suites.filter((suite) => suite.projectId === projectId)
  const projectCases = cases.filter((item) => item.projectId === projectId)
  const activeSuite = projectCases.find((item) => item.id === activeCaseId)?.suiteId ??
    projectSuites.find((suite) => suite.id === selectedId)?.id
  const activePath = new Set<string>()
  let pathSuite = projectSuites.find((suite) => suite.id === activeSuite)
  while (pathSuite) {
    activePath.add(pathSuite.id)
    pathSuite = projectSuites.find((suite) => suite.id === pathSuite?.parentId)
  }
  const [collapsed, setCollapsed] = useState<Set<string>>(() =>
    showCases ? new Set(projectSuites.filter((suite) => !activePath.has(suite.id)).map((suite) => suite.id)) : new Set(),
  )
  const [removing, setRemoving] = useState<Suite | null>(null)
  const [repairOpen, setRepairOpen] = useState(false)
  const [repairing, setRepairing] = useState(false)
  const [editor, setEditor] = useState<
    | { mode: "create"; parentId: string | null }
    | { mode: "rename"; suite: Suite }
    | { mode: "move"; suite: Suite }
    | null
  >(null)

  const roots = childSuites(projectSuites, projectId, null)
  const legacyPaths = roots.filter((suite) => suite.name.includes(" > "))

  async function repairSuitePaths() {
    setRepairing(true)
    try {
      const result = await store.repairImportedSuitePaths(projectId)
      toast.success(`Jerarquía reparada: ${result.suites} suites y ${result.cases} casos reorganizados.`)
      setRepairOpen(false)
    } catch (error) {
      reportError(error)
    } finally {
      setRepairing(false)
    }
  }

  return (
    <div className="grid gap-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Suites
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Nueva suite"
          onClick={() => setEditor({ mode: "create", parentId: null })}
        >
          <Plus />
        </Button>
      </div>
      <button
        type="button"
        onClick={() => onSelect("todas")}
        className={cn(
          "flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
          selectedId === "todas" && "bg-accent font-medium",
        )}
      >
        <span>Todas</span>
        <span className="text-xs text-muted-foreground tabular-nums">{projectCases.length}</span>
      </button>
      {roots.length === 0 ? (
        <p className="px-2 text-xs text-muted-foreground">
          Todavía no hay suites. Crea la primera para agrupar los casos.
        </p>
      ) : (
        roots.map((suite) => (
          <SuiteNode
            key={suite.id}
            suite={suite}
            depth={0}
            suites={projectSuites}
            cases={projectCases}
            projectId={projectId}
            selectedId={selectedId}
            collapsed={collapsed}
            onToggle={(id) =>
              setCollapsed((current) => {
                const next = new Set(current)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
              })
            }
            onSelect={onSelect}
            showCases={showCases}
            activeCaseId={activeCaseId}
            projectKey={projectKey}
            onSelectCase={onSelectCase}
            onCreateChild={(parentId) => setEditor({ mode: "create", parentId })}
            onRename={(target) => setEditor({ mode: "rename", suite: target })}
            onMove={(target) => setEditor({ mode: "move", suite: target })}
            onDelete={(target) => setRemoving(target)}
            onReorder={(id, direction) => store.reorderSuite(id, direction)}
          />
        ))
      )}
      {legacyPaths.length > 0 ? (
        <div className="grid gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <p>Hay {legacyPaths.length} suite(s) importadas como ruta completa.</p>
          <Button variant="outline" size="sm" onClick={() => setRepairOpen(true)}>
            Reparar jerarquía
          </Button>
        </div>
      ) : null}
      <SuiteDialog
        projectId={projectId}
        suites={projectSuites}
        editor={editor}
        onClose={() => setEditor(null)}
        onCreated={(id) => onSelect(id)}
      />
      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Solo se puede si no tiene subsecciones ni casos. Esos hay que moverlos o eliminarlos antes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!removing) return
                try {
                  store.deleteSuite(removing.id)
                  if (selectedId === removing.id) onSelect("todas")
                  setRemoving(null)
                } catch (error) {
                  reportError(error)
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={repairOpen} onOpenChange={setRepairOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reparar suites importadas</AlertDialogTitle>
            <AlertDialogDescription>
              Las rutas se convertirán en suites y subsecciones reales. Los casos se conservarán y se moverán a su ubicación; sus IDs generados pueden cambiar al prefijo correcto. Los IDs personalizados se mantienen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={repairing}
              onClick={() => void repairSuitePaths()}
            >
              {repairing ? "Guardando…" : "Reparar jerarquía"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SuiteNode({
  suite,
  depth,
  suites,
  cases,
  projectId,
  selectedId,
  collapsed,
  onToggle,
  onSelect,
  showCases = false,
  activeCaseId,
  projectKey,
  onSelectCase,
  onCreateChild,
  onRename,
  onMove,
  onDelete,
  onReorder,
}: {
  suite: Suite
  depth: number
  suites: Suite[]
  cases: TestCase[]
  projectId: string
  selectedId: string | "todas"
  collapsed: Set<string>
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  showCases?: boolean
  activeCaseId?: string
  projectKey?: string
  onSelectCase?: (testCase: TestCase) => void
  onCreateChild: (parentId: string) => void
  onRename: (suite: Suite) => void
  onMove: (suite: Suite) => void
  onDelete: (suite: Suite) => void
  onReorder: (id: string, direction: -1 | 1) => void
}) {
  const children = childSuites(suites, projectId, suite.id)
  const open = !collapsed.has(suite.id)
  const count = cases.filter((item) =>
    descendantIds(suites, suite.id).includes(item.suiteId),
  ).length

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-0.5 rounded-md pr-1 hover:bg-muted",
          selectedId === suite.id && "bg-accent",
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {children.length > 0 || (showCases && cases.some((item) => item.suiteId === suite.id)) ? (
          <button
            type="button"
            className="grid size-5 place-items-center text-muted-foreground"
            aria-label={open ? "Contraer sección" : "Expandir sección"}
            onClick={() => onToggle(suite.id)}
          >
            {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        ) : (
          <span className="size-5" />
        )}
        <button
          type="button"
          className="min-w-0 flex-1 truncate py-1.5 text-left text-sm"
          onClick={() => onSelect(suite.id)}
        >
          {suite.name}
        </button>
        <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-100"
              aria-label={`Acciones de ${suite.name}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onCreateChild(suite.id)}>
              Nueva subsección
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRename(suite)}>Editar suite</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onMove(suite)}>Mover…</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onReorder(suite.id, -1)}>Subir</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onReorder(suite.id, 1)}>Bajar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(suite)}>
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {open ? (
        <>
          {showCases && cases.filter((item) => item.suiteId === suite.id).sort((a, b) => a.number - b.number).map((item) => (
            <button
              key={item.id}
              type="button"
              title={`${projectKey ? `${caseCode(projectKey, item.number, item.idPrefix, item.customId)} · ` : ""}${item.title}`}
              onClick={() => onSelectCase?.(item)}
              className={cn(
                "flex min-w-0 items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted",
                activeCaseId === item.id && "bg-primary/10 font-medium text-foreground",
              )}
              style={{ marginLeft: `${depth * 12 + 28}px`, width: `calc(100% - ${depth * 12 + 28}px)` }}
            >
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{projectKey ? caseCode(projectKey, item.number, item.idPrefix, item.customId) : item.number}</span>
              <span className="min-w-0 truncate">{item.title || "Sin título"}</span>
            </button>
          ))}
          {children.map((child) => (
            <SuiteNode
              key={child.id}
              suite={child}
              depth={depth + 1}
              suites={suites}
              cases={cases}
              projectId={projectId}
              selectedId={selectedId}
              collapsed={collapsed}
              onToggle={onToggle}
              onSelect={onSelect}
              showCases={showCases}
              activeCaseId={activeCaseId}
              projectKey={projectKey}
              onSelectCase={onSelectCase}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
              onReorder={onReorder}
            />
          ))}
        </>
      ) : null}
    </div>
  )
}

function SuiteDialog({
  projectId,
  suites,
  editor,
  onClose,
  onCreated,
}: {
  projectId: string
  suites: Suite[]
  editor:
    | { mode: "create"; parentId: string | null }
    | { mode: "rename"; suite: Suite }
    | { mode: "move"; suite: Suite }
    | null
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const store = useStore()
  const open = editor !== null
  const key = editor
    ? editor.mode === "create"
      ? `create-${editor.parentId ?? "root"}`
      : `${editor.mode}-${editor.suite.id}`
    : "closed"
  const [seen, setSeen] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [idPrefix, setIdPrefix] = useState("")
  const [parentId, setParentId] = useState<string>("root")
  const [moveError, setMoveError] = useState("")

  if (open && seen !== key && editor) {
    setSeen(key)
    setMoveError("")
    if (editor.mode === "rename") {
      setName(editor.suite.name)
      setDescription(editor.suite.description)
      setIdPrefix(editor.suite.idPrefix ?? "")
    } else if (editor.mode === "create") {
      setName("")
      setDescription("")
      setIdPrefix("")
    } else {
      setParentId(editor.suite.parentId ?? "root")
    }
  }
  if (!open && seen) setSeen(null)

  const flat = flattenSuites(suites, projectId)
  const moveOptions = [
    { value: "root", label: "Raíz del proyecto" },
    ...flat
      .filter(
        (row) =>
          editor?.mode !== "move" || !wouldCycle(suites, editor.suite.id, row.suite.id),
      )
      .map((row) => ({
        value: row.suite.id,
        label: `${"· ".repeat(row.depth)}${row.suite.name}`,
      })),
  ]

  function save() {
    if (!editor) return
    try {
      if (editor.mode === "create") {
        const created = store.createSuite({
          projectId,
          parentId: editor.parentId,
          name,
          description,
          idPrefix,
        })
        onCreated(created.id)
      } else if (editor.mode === "rename") {
        store.updateSuite(editor.suite.id, { name, description, idPrefix })
      } else {
        store.moveSuite(editor.suite.id, parentId === "root" ? null : parentId)
      }
      setMoveError("")
      onClose()
    } catch (error) {
      if (editor.mode === "move") {
        setMoveError(error instanceof Error ? error.message : "No se pudo mover la suite.")
      }
      reportError(error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editor?.mode === "rename"
              ? "Editar suite"
              : editor?.mode === "move"
                ? "Mover suite"
                : editor?.parentId
                  ? "Nueva subsección"
                  : "Nueva suite"}
          </DialogTitle>
        </DialogHeader>
        {editor?.mode === "move" ? (
          <FormField label="Nueva ubicación" htmlFor="move-suite-parent" error={moveError}>
            <EnumSelect
              id="move-suite-parent"
              invalid={Boolean(moveError)}
              describedBy={moveError ? "move-suite-parent-error" : undefined}
              value={parentId}
              onChange={(value) => {
                setParentId(value)
                if (moveError) setMoveError("")
              }}
              options={moveOptions}
            />
          </FormField>
        ) : (
          <div className="grid gap-3">
            <FormField label="Nombre" htmlFor="suite-name">
              <Input
                id="suite-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Checkout"
              />
            </FormField>
            <FormField label="Descripción" htmlFor="suite-description">
              <Textarea
                id="suite-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </FormField>
            <FormField label="Prefijo de ID" htmlFor="suite-id-prefix">
              <Input
                id="suite-id-prefix"
                value={idPrefix}
                onChange={(event) => setIdPrefix(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24))}
                placeholder={editor?.mode === "create" && editor.parentId ? effectiveSuitePrefix(suites, editor.parentId) : suitePrefixFromName(name || "INICIO")}
                maxLength={24}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {idPrefix.trim()
                  ? `Los casos nuevos usarán ${idPrefix.trim().toUpperCase()}-001.`
                  : editor?.mode === "rename"
                    ? `Vacío: hereda ${editor.suite.parentId ? effectiveSuitePrefix(suites, editor.suite.parentId) : suitePrefixFromName(name || editor.suite.name)}.`
                    : editor?.parentId
                      ? `Vacío: hereda ${effectiveSuitePrefix(suites, editor.parentId)}.`
                      : `Vacío: se deriva del nombre (${suitePrefixFromName(name || "INICIO")}).`}
              </p>
            </FormField>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
