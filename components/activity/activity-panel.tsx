"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Clock3, LoaderCircle } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { EmptyState, PageHeader } from "@/components/bits"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"

type ActivityEvent = {
  id: string
  projectId: string | null
  entityType: string
  entityId: string
  entityName: string
  action: string
  details: unknown
  createdAt: string
  user: { id: string; name: string }
}

const apiBase = (process.env.NEXT_PUBLIC_QA_API_URL ?? "").replace(/\/$/, "")

export function ActivityPanel() {
  const auth = useAuth()
  const store = useStore()
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [projectFilter, setProjectFilter] = useState("all")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const token = await auth.getAccessToken()
      const response = await fetch(`${apiBase}/api/v1/activity`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      const body = await response.json().catch(() => ({})) as ActivityEvent[] | { message?: string | string[] }
      if (!response.ok) {
        const message = (body as { message?: string | string[] }).message
        throw new Error(Array.isArray(message) ? message[0] : message || "No se pudo cargar la bitácora.")
      }
      setEvents(body as ActivityEvent[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la bitácora.")
    } finally {
      setLoading(false)
    }
  }, [auth.getAccessToken])

  useEffect(() => { void load() }, [load])

  const visibleEvents = useMemo(() => projectFilter === "all" ? events : events.filter((item) => item.projectId === projectFilter), [events, projectFilter])
  const projects = store.data?.projects ?? []

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-screen-xl gap-5 p-4 md:p-6">
      <PageHeader title="Bitácora" description="Cambios registrados automáticamente con la persona que los realizó." actions={<Clock3 className="size-5 text-muted-foreground" />} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Se muestran los últimos 300 cambios de los proyectos a los que tienes acceso.</p>
        <select aria-label="Filtrar por proyecto" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">Todos los proyectos</option>
          {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      {loading ? <div className="grid min-h-40 place-items-center"><LoaderCircle className="size-6 animate-spin text-muted-foreground" /></div> : error ? <div className="grid gap-3 rounded-xl border p-5"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => void load()}>Reintentar</Button></div> : visibleEvents.length === 0 ? <EmptyState title="Aún no hay cambios" body="Las próximas altas, ediciones y eliminaciones aparecerán aquí con su autor." /> : (
        <ol className="divide-y rounded-xl border bg-card">
          {visibleEvents.map((item) => <li key={item.id} className="grid gap-1.5 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="min-w-0">
              <p className="text-sm"><span className="font-medium">{item.user.name}</span> {actionLabel(item.action)} {entityLabel(item.entityType)} <span className="font-medium">“{item.entityName}”</span></p>
              {Array.isArray(item.details) && item.details.length ? <p className="mt-1 text-xs text-muted-foreground">Cambios: {(item.details as string[]).join(", ")}</p> : null}
              {item.projectId ? <p className="mt-1 text-xs text-muted-foreground">{projects.find((project) => project.id === item.projectId)?.name ?? "Proyecto"}</p> : null}
            </div>
            <time dateTime={item.createdAt} className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</time>
          </li>)}
        </ol>
      )}
    </div>
  )
}

function actionLabel(action: string) {
  if (action === "created") return "creó"
  if (action === "updated") return "actualizó"
  if (action === "deleted") return "eliminó"
  if (action === "joined") return "se unió a"
  if (action === "assigned") return "asignó a"
  if (action === "unassigned") return "quitó a"
  return "modificó"
}

function entityLabel(entityType: string) {
  const labels: Record<string, string> = {
    project: "el proyecto", suite: "la suite", case: "el caso", requirement: "el requisito",
    sprint: "el sprint", plan: "el plan", run: "la corrida", defect: "el defecto",
    member: "a una persona", project_member: "un miembro", organization: "la organización", invitation: "la invitación",
  }
  return labels[entityType] ?? "un elemento"
}
