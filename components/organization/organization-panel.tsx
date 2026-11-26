"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Building2, Copy, LoaderCircle, MailPlus, Users } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/auth-provider"
import { EmptyState, PageHeader } from "@/components/bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiBase } from "@/lib/api-url"

type OrganizationData = {
  id: string
  name: string
  users: Array<{ id: string; name: string; email: string; role: string; createdAt: string }>
  invitations: Array<{ id: string; email: string; role: string; expiresAt: string; createdAt: string }>
}
type InvitationResponse = { id: string; email: string; expiresAt: string; token: string }

export function OrganizationPanel() {
  const auth = useAuth()
  const router = useRouter()
  const [organization, setOrganization] = useState<OrganizationData | null>(null)
  const [name, setName] = useState(auth.user?.organizationName ?? "")
  const [email, setEmail] = useState("")
  const [inviteLink, setInviteLink] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState("")
  const canManage = auth.user?.role === "owner"

  const api = useCallback(async <T,>(path: string, init?: RequestInit) => {
    const token = await auth.getAccessToken()
    const response = await fetch(`${apiBase}/api/v1/organization${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers },
      cache: "no-store",
    })
    const body = await response.json().catch(() => ({})) as { message?: string | string[] }
    if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message[0] : body.message || "No se pudo completar la solicitud.")
    return body as T
  }, [auth.getAccessToken])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const result = await api<OrganizationData>("/current")
      setOrganization(result)
      setName(result.name)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la organización.")
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (auth.user && auth.user.role !== "owner") router.replace("/")
  }, [auth.user, router])

  async function saveOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await api<{ id: string; name: string }>("/current", { method: "PUT", body: JSON.stringify({ name }) })
      setOrganization((current) => current ? { ...current, name: result.name } : current)
      auth.updateOrganizationName(result.name)
      toast.success("Nombre de la organización actualizado")
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo actualizar la organización.")
    } finally {
      setSaving(false)
    }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setInviting(true)
    setInviteLink("")
    try {
      const result = await api<InvitationResponse>("/invitations", { method: "POST", body: JSON.stringify({ email }) })
      const url = new URL("/", window.location.origin)
      url.searchParams.set("invite", result.token)
      setInviteLink(url.toString())
      setEmail("")
      await load()
      toast.success("Invitación creada. Comparte el enlace con esa persona.")
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se pudo crear la invitación.")
    } finally {
      setInviting(false)
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink)
      toast.success("Enlace copiado")
    } catch {
      toast.error("No se pudo copiar. Selecciona y copia el enlace manualmente.")
    }
  }

  if (auth.user?.role !== "owner") return null
  if (loading) return <div className="grid min-h-48 place-items-center"><LoaderCircle className="size-6 animate-spin text-muted-foreground" /></div>
  if (error) return <div className="mx-auto grid w-full min-w-0 max-w-screen-xl gap-4 p-4 md:p-6"><PageHeader title="Organización" description={error} /><Button variant="outline" className="w-fit max-w-full" onClick={() => void load()}>Reintentar</Button></div>

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-screen-xl gap-5 p-4 md:p-6">
      <PageHeader title="Organización" description="Administra el nombre y quién puede acceder a sus proyectos y datos." />

      <section className="grid gap-4 rounded-xl border bg-card p-4 md:p-5">
        <div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Building2 className="size-5" /></div><div><h2 className="font-semibold">Datos de la organización</h2><p className="text-sm text-muted-foreground">Los proyectos y registros de QA pertenecen a esta organización.</p></div></div>
        <form onSubmit={(event) => void saveOrganization(event)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-1.5 text-sm font-medium">Nombre<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} disabled={!canManage} className="h-9 rounded-md border border-input bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
          {canManage ? <Button type="submit" disabled={saving || name.trim() === organization?.name}>{saving ? <LoaderCircle className="animate-spin" /> : null}Guardar</Button> : null}
        </form>
      </section>

      <section className="grid gap-4 rounded-xl border bg-card p-4 md:p-5">
        <div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Users className="size-5" /></div><div><h2 className="font-semibold">Personas</h2><p className="text-sm text-muted-foreground">Cada persona invitada podrá ver y trabajar con los datos de esta organización.</p></div></div>
        {canManage ? <form onSubmit={(event) => void invite(event)} className="flex flex-col gap-2 sm:flex-row">
          <Input type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="correo@empresa.com" aria-label="Correo de la persona a invitar" />
          <Button type="submit" disabled={inviting} className="shrink-0">{inviting ? <LoaderCircle className="animate-spin" /> : <MailPlus />}Invitar</Button>
        </form> : <p className="text-sm text-muted-foreground">Solo el propietario puede invitar personas.</p>}
        {inviteLink ? <div className="grid gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm font-medium">Enlace de invitación creado</p>
          <p className="break-all text-xs text-muted-foreground">{inviteLink}</p>
          <p className="text-xs text-muted-foreground">Vence en 7 días. La persona debe registrarse con el correo invitado.</p>
          <Button variant="outline" size="sm" className="w-fit" onClick={() => void copyInvite()}><Copy />Copiar enlace</Button>
        </div> : null}
        {organization?.users.length ? <ul className="divide-y rounded-lg border">
          {organization.users.map((member) => <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
            <div className="min-w-0"><p className="truncate text-sm font-medium">{member.name}</p><p className="truncate text-xs text-muted-foreground">{member.email}</p></div>
            <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">{roleName(member.role)}</span>
          </li>)}
        </ul> : <EmptyState title="Aún no hay personas" body="Invita a tu equipo para colaborar en esta organización." />}
        {organization?.invitations.length ? <div className="grid gap-2">
          <h3 className="text-sm font-medium">Invitaciones pendientes</h3>
          <ul className="divide-y rounded-lg border">
            {organization.invitations.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"><span>{item.email}</span><span className="text-xs text-muted-foreground">Vence {new Date(item.expiresAt).toLocaleDateString("es-MX")}</span></li>)}
          </ul>
        </div> : null}
        <p className="text-xs text-muted-foreground">El sistema genera el enlace; envíalo desde tu correo o chat. El envío automático de correos aún no está conectado.</p>
      </section>
    </div>
  )
}

function roleName(role: string) {
  if (role === "owner") return "Propietario"
  if (role === "admin") return "Administradora"
  return "Miembro"
}
