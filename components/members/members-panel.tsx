"use client"

import { useCallback, useEffect, useState } from "react"
import { LoaderCircle, Save, Users } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/auth-provider"
import { EmptyState, PageHeader } from "@/components/bits"
import { MissingProject } from "@/components/missing-project"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/components/use-workspace"

type ProjectMembers = {
  canManage: boolean
  members: Array<{ id: string; name: string; email?: string; role: string }>
  assignedIds: string[]
}

const apiBase = (process.env.NEXT_PUBLIC_QA_API_URL ?? "").replace(/\/$/, "")

export function MembersPanel() {
  const auth = useAuth()
  const { project } = useWorkspace()
  const [team, setTeam] = useState<ProjectMembers | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const canManage = auth.user?.role === "owner"

  const load = useCallback(async () => {
    if (!project) return
    setLoading(true)
    setError("")
    try {
      const token = await auth.getAccessToken()
      const response = await fetch(`${apiBase}/api/v1/projects/${encodeURIComponent(project.id)}/members`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      const body = await response.json().catch(() => ({})) as ProjectMembers & { message?: string | string[] }
      if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message[0] : body.message || "No se pudo cargar el equipo del proyecto.")
      setTeam(body)
      setSelected(body.assignedIds)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el equipo del proyecto.")
    } finally {
      setLoading(false)
    }
  }, [auth.getAccessToken, project])

  useEffect(() => { void load() }, [load])

  async function save() {
    if (!project) return
    setSaving(true)
    try {
      const token = await auth.getAccessToken()
      const response = await fetch(`${apiBase}/api/v1/projects/${encodeURIComponent(project.id)}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ memberIds: selected }),
      })
      const body = await response.json().catch(() => ({})) as ProjectMembers & { message?: string | string[] }
      if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message[0] : body.message || "No se pudieron guardar las asignaciones.")
      setTeam(body)
      setSelected(body.assignedIds)
      toast.success("Equipo del proyecto actualizado")
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudieron guardar las asignaciones.")
    } finally {
      setSaving(false)
    }
  }

  if (!project) return <MissingProject />
  if (loading) return <div className="grid min-h-48 place-items-center"><LoaderCircle className="size-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-screen-xl gap-5 p-4 md:p-6">
      <PageHeader title="Equipo del proyecto" description={canManage ? "Asigna integrantes de tu organización. Solo las personas asignadas podrán ver este proyecto; tú conservas acceso a todos." : "Integrantes de la organización asignados a este proyecto."} actions={<Users className="size-5 text-muted-foreground" />} />
      {error ? <div className="grid gap-3 rounded-xl border p-4"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => void load()}>Reintentar</Button></div> : null}
      {!error && team?.members.length === 0 ? <EmptyState title="No hay integrantes asignados" body={canManage ? "Selecciona integrantes para que puedan acceder a este proyecto." : "Pide al propietario que te asigne al equipo del proyecto."} /> : null}
      {!error && team?.members.length ? <section className="grid gap-2 rounded-xl border bg-card p-4">
        {team.members.map((member) => <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3">
          {canManage ? <input type="checkbox" checked={selected.includes(member.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, member.id] : current.filter((id) => id !== member.id))} /> : null}
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{member.name}</span><span className="block text-xs text-muted-foreground">{member.email ?? roleName(member.role)}</span></span>
          {canManage ? <span className="text-xs text-muted-foreground">{roleName(member.role)}</span> : null}
        </label>)}
        {canManage ? <Button className="mt-2 w-fit" disabled={saving || sameMembers(selected, team.assignedIds)} onClick={() => void save()}>{saving ? <LoaderCircle className="animate-spin" /> : <Save />}Guardar asignaciones</Button> : null}
      </section> : null}
    </div>
  )
}

function roleName(role: string) {
  if (role === "owner") return "Propietario"
  return "Miembro"
}

function sameMembers(left: string[], right: string[]) {
  return left.length === right.length && left.every((id) => right.includes(id))
}
