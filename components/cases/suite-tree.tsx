"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  MoreHorizontal,
  Plus,
} from "lucide-react"
import { FormField, reportError } from "@/components/bits"
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
import { childSuites, descendantIds, flattenSuites, wouldCycle } from "@/lib/suites"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Suite, TestCase } from "@/lib/types"

export function SuiteTree({
  projectId,
  suites,
  cases,
  selectedId,
  onSelect,
}: {
  projectId: string
  suites: Suite[]
  cases: TestCase[]
  selectedId: string | "todas"
  onSelect: (id: string | "todas") => void
}) {
  const store = useStore()
  const projectSuites = suites.filter((suite) => suite.projectId === projectId)
  const projectCases = cases.filter((item) => item.projectId === projectId)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [editor, setEditor] = useState<
    | { mode: "create"; parentId: string | null }
    | { mode: "rename"; suite: Suite }
    | { mode: "move"; suite: Suite }
    | null
  >(null)

  const roots = childSuites(projectSuites, projectId, null)

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
            onCreateChild={(parentId) => setEditor({ mode: "create", parentId })}
            onRename={(target) => setEditor({ mode: "rename", suite: target })}
            onMove={(target) => setEditor({ mode: "move", suite: target })}
            onDelete={(target) => {
              try {
                store.deleteSuite(target.id)
                if (selectedId === target.id) onSelect("todas")
              } catch (error) {
                reportError(error)
              }
            }}
            onReorder={(id, direction) => store.reorderSuite(id, direction)}
          />
        ))
      )}
      <Button
        variant="outline"
        size="sm"
        className="mt-1"
        onClick={() => setEditor({ mode: "create", parentId: null })}
      >
        <FolderPlus />
        Nueva suite
      </Button>
      <SuiteDialog
        projectId={projectId}
        suites={projectSuites}
        editor={editor}
        onClose={() => setEditor(null)}
        onCreated={(id) => onSelect(id)}
      />
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
        {children.length > 0 ? (
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
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label={`Acciones de ${suite.name}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onCreateChild(suite.id)}>
              Nueva subsección
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRename(suite)}>Renombrar</DropdownMenuItem>
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
      {open
        ? children.map((child) => (
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
              onCreateChild={onCreateChild}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
              onReorder={onReorder}
            />
          ))
        : null}
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
  const [parentId, setParentId] = useState<string>("root")

  if (open && seen !== key && editor) {
    setSeen(key)
    if (editor.mode === "rename") {
      setName(editor.suite.name)
      setDescription(editor.suite.description)
    } else if (editor.mode === "create") {
      setName("")
      setDescription("")
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
        })
        onCreated(created.id)
      } else if (editor.mode === "rename") {
        store.updateSuite(editor.suite.id, { name, description })
      } else {
        store.moveSuite(editor.suite.id, parentId === "root" ? null : parentId)
      }
      onClose()
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editor?.mode === "rename"
              ? "Renombrar suite"
              : editor?.mode === "move"
                ? "Mover suite"
                : editor?.parentId
                  ? "Nueva subsección"
                  : "Nueva suite"}
          </DialogTitle>
        </DialogHeader>
        {editor?.mode === "move" ? (
          <FormField label="Nueva ubicación">
            <EnumSelect value={parentId} onChange={setParentId} options={moveOptions} />
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
