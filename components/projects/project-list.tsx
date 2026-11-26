"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Plus } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, PageHeader, reportError } from "@/components/bits"
import { ProjectFormDialog } from "@/components/projects/project-form"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useStore } from "@/lib/store"
import { downloadText } from "@/lib/csv"
import { countLabel, localDateStamp, normalize } from "@/lib/text"
import type { Project } from "@/lib/types"

export function ProjectList() {
  const store = useStore()
  const router = useRouter()
  const data = store.data
  const [query, setQuery] = useState("")
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [removing, setRemoving] = useState<Project | null>(null)
  const [dropSample, setDropSample] = useState(false)
  const [pendingRestore, setPendingRestore] = useState<string | null>(null)

  const projects = useMemo(() => {
    if (!data) return []
    const needle = normalize(query.trim())
    return data.projects.filter((project) => {
      if (!needle) return true
      return normalize(`${project.name} ${project.key} ${project.description}`).includes(needle)
    })
  }, [data, query])

  if (!data) return null

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 p-4 md:p-6">
      <PageHeader
        title="Proyectos"
        description="Elige un proyecto para ver sus suites, casos y corridas."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => downloadText("casos-respaldo.json", JSON.stringify(data, null, 2), "application/json")}
            >
              Respaldar
            </Button>
            <label className="inline-flex">
              <input
                className="sr-only"
                type="file"
                accept="application/json,.json"
                aria-label="Restaurar respaldo"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ""
                  if (!file) return
                  file
                    .text()
                    .then((text) => setPendingRestore(text))
                    .catch(reportError)
                }}
              />
              <span className="inline-flex h-8 cursor-pointer items-center rounded-lg border px-2.5 text-sm">
                Restaurar
              </span>
            </label>
            {data.projects.some((item) => item.sample) ? (
              <Button variant="outline" onClick={() => setDropSample(true)}>
                Quitar ejemplo
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  try {
                    store.addDemo()
                    toast.success("Proyecto de ejemplo agregado")
                  } catch (error) {
                    reportError(error)
                  }
                }}
              >
                Cargar demo
              </Button>
            )}
            <Button onClick={() => setCreating(true)}>
              <Plus />
              Nuevo proyecto
            </Button>
          </div>
        }
      />
      <Input
        data-search-input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar proyectos"
        aria-label="Buscar proyectos"
        className="max-w-sm"
      />
      {projects.length === 0 ? (
        <EmptyState
          title={data.projects.length === 0 ? "Todavía no hay proyectos" : "Nada coincide con la búsqueda"}
          body={
            data.projects.length === 0
              ? "Crea el primero para empezar a escribir casos."
              : "Prueba con otro nombre o con la clave."
          }
          action={
            data.projects.length === 0 ? (
              <Button onClick={() => setCreating(true)}>Nuevo proyecto</Button>
            ) : null
          }
        />
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {projects.map((project) => (
              <li key={project.id} className="rounded-xl border bg-card p-4">
                <ProjectSummary
                  project={project}
                  cases={data.cases.filter((item) => item.projectId === project.id).length}
                  sprints={data.sprints.filter((item) => item.projectId === project.id).length}
                  openRuns={
                    data.runs.filter(
                      (item) => item.projectId === project.id && item.status === "en_progreso",
                    ).length
                  }
                  onEdit={() => setEditing(project)}
                  onDelete={() => setRemoving(project)}
                />
              </li>
            ))}
          </ul>
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Proyecto</th>
                  <th className="px-4 py-2 font-medium">Clave</th>
                  <th className="px-4 py-2 font-medium">Casos</th>
                  <th className="px-4 py-2 font-medium">Sprints</th>
                  <th className="px-4 py-2 font-medium">Corridas abiertas</th>
                  <th className="px-4 py-2 font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const cases = data.cases.filter((item) => item.projectId === project.id).length
                  const sprints = data.sprints.filter((item) => item.projectId === project.id).length
                  const openRuns = data.runs.filter(
                    (item) => item.projectId === project.id && item.status === "en_progreso",
                  ).length
                  return (
                    <tr
                      key={project.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                      onClick={() => router.push(`/proyectos/${project.id}/casos`)}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/proyectos/${project.id}/casos`}
                          className="font-medium hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {project.name}
                        {project.sample ? (
                          <span className="ml-2 rounded-full border px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                            Ejemplo
                          </span>
                        ) : null}
                        </Link>
                        {project.description ? (
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {project.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{project.key}</td>
                      <td className="px-4 py-3 tabular-nums">{cases}</td>
                      <td className="px-4 py-3 tabular-nums">{sprints}</td>
                      <td className="px-4 py-3 tabular-nums">{openRuns}</td>
                      <td className="px-4 py-3 text-right">
                        <RowMenu
                          onEdit={() => setEditing(project)}
                          onDelete={() => setRemoving(project)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <ProjectFormDialog open={creating} onOpenChange={setCreating} />
      <ProjectFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        project={editing ?? undefined}
      />
      <AlertDialog open={pendingRestore !== null} onOpenChange={(open) => !open && setPendingRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reemplazar todo el espacio?</AlertDialogTitle>
            <AlertDialogDescription>
              Restaurar borra los proyectos, casos y corridas de este navegador y deja solo lo que viene en el archivo. Puedes descargar el respaldo actual antes de continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() =>
                downloadText(
                  `casos-respaldo-${localDateStamp()}.json`,
                  JSON.stringify(data, null, 2),
                  "application/json",
                )
              }
            >
              Descargar respaldo actual
            </Button>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!pendingRestore) return
                try {
                  store.replaceState(JSON.parse(pendingRestore))
                  setPendingRestore(null)
                  toast.success("Respaldo restaurado")
                } catch (error) {
                  reportError(error)
                }
              }}
            >
              Reemplazar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={dropSample} onOpenChange={setDropSample}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar el proyecto de ejemplo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra la tienda de demostración y lo que hayas cambiado dentro de ella. Tus otros proyectos se quedan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                store.removeSample()
                setDropSample(false)
                toast.success("Se quitó el proyecto de ejemplo")
              }}
            >
              Quitar ejemplo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminan también sus suites, casos, sprints, planes y corridas de este navegador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!removing) return
                try {
                  store.deleteProject(removing.id)
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
    </div>
  )
}

function ProjectSummary({
  project,
  cases,
  sprints,
  openRuns,
  onEdit,
  onDelete,
}: {
  project: Project
  cases: number
  sprints: number
  openRuns: number
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/proyectos/${project.id}/casos`} className="font-medium">
            {project.name}
            {project.sample ? (
              <span className="ml-2 rounded-full border px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                Ejemplo
              </span>
            ) : null}
          </Link>
          <p className="font-mono text-xs text-muted-foreground">{project.key}</p>
        </div>
        <RowMenu onEdit={onEdit} onDelete={onDelete} />
      </div>
      <p className="text-xs text-muted-foreground">
        {countLabel(cases, "caso", "casos")} · {countLabel(sprints, "sprint", "sprints")} ·{" "}
        {countLabel(openRuns, "corrida abierta", "corridas abiertas")}
      </p>
    </div>
  )
}

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Acciones del proyecto"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
