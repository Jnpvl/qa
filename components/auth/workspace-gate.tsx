"use client"

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { LoaderCircle, LogIn, ShieldCheck } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { useStore, replaceWorkspaceFromBackend } from "@/lib/store"
import { emptyWorkspace } from "@/lib/migrate"
import { bootstrapBackend, markBackendUnavailable, setBackendTokenProvider } from "@/lib/backend-sync"

type GateState = "waiting" | "syncing" | "ready" | "error"

export function WorkspaceGate({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const store = useStore()
  const [state, setState] = useState<GateState>("waiting")
  const [error, setError] = useState("")
  const [formError, setFormError] = useState("")
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const [registering, setRegistering] = useState(true)
  const [name, setName] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const startedFor = useRef<string | null>(null)
  const loadedOrganization = useRef<string | null>(null)
  const authKey = auth.user?.email ?? ""

  useEffect(() => {
    if (!auth.ready || !auth.authenticated || !store.data || state === "ready" || state === "error" || startedFor.current === authKey) return
    startedFor.current = authKey
    let active = true
    setBackendTokenProvider(auth.getAccessToken)
    const organizationId = auth.user!.organizationId
    const initialState = loadedOrganization.current && loadedOrganization.current !== organizationId ? emptyWorkspace() : store.data
    loadedOrganization.current = organizationId
    if (initialState !== store.data) replaceWorkspaceFromBackend(initialState)
    void bootstrapBackend(initialState).then((remoteState) => {
      if (!active) return
      if (remoteState) replaceWorkspaceFromBackend(remoteState)
      setState("ready")
    }).catch((cause: unknown) => {
      if (!active) return
      startedFor.current = null
      setError(cause instanceof Error ? cause.message : "No fue posible conectar con el backend.")
      setState("error")
    })
    return () => { active = false }
  }, [auth.ready, auth.authenticated, auth.user, authKey, auth.getAccessToken, store.data, retry, state])

  useEffect(() => {
    if (!auth.authenticated) {
      startedFor.current = null
      setState("waiting")
      markBackendUnavailable()
      setBackendTokenProvider(null)
    }
  }, [auth.authenticated])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setFormError("")
    try {
      if (auth.invitationToken || registering) {
        await auth.register({ name, email, password, organizationName, invitationToken: auth.invitationToken ?? undefined })
      } else {
        await auth.login(email, password)
      }
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "No se pudo completar el acceso.")
    } finally {
      setBusy(false)
      setPassword("")
    }
  }

  if (!auth.ready) return <Centered title="Conectando con QA" detail="Comprobando el acceso al sistema…" loading />
  if (auth.error) return <Centered title="No se pudo conectar" detail={auth.error} />
  if (!auth.authenticated) {
    const creatingAccount = Boolean(auth.invitationToken) || registering
    return (
      <main className="grid min-h-dvh place-items-center bg-background p-6 text-foreground">
        <section className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
          <div className="mb-6 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="size-5" /></div>
          <h1 className="text-2xl font-semibold tracking-tight">{auth.invitationToken ? "Únete a la organización" : creatingAccount ? "Crea tu cuenta" : "Inicia sesión"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{auth.invitationToken ? "Regístrate con el correo al que llegó la invitación." : creatingAccount ? "Tus proyectos y datos quedarán en una organización propia." : "Entra con tu cuenta del sistema QA."}</p>
          <form className="mt-6 grid gap-4" onSubmit={(event) => void submit(event)}>
            {creatingAccount ? <label className="grid gap-1.5 text-sm font-medium">Nombre<input autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} placeholder="Tu nombre" /></label> : null}
            <label className="grid gap-1.5 text-sm font-medium">Correo<input autoComplete="username" type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} placeholder="nombre@empresa.com" /></label>
            {creatingAccount && !auth.invitationToken ? <label className="grid gap-1.5 text-sm font-medium">Nombre de la organización <span className="font-normal text-muted-foreground">(opcional)</span><input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} maxLength={120} className={fieldClass} placeholder="Si lo dejas vacío, usaremos tu nombre" /></label> : null}
            <label className="grid gap-1.5 text-sm font-medium">Contraseña<input autoComplete={creatingAccount ? "new-password" : "current-password"} type="password" required minLength={creatingAccount ? 12 : 1} maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClass} placeholder={creatingAccount ? "Mínimo 12 caracteres" : "Tu contraseña"} /></label>
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={busy} className="mt-1 w-full">{busy ? <LoaderCircle className="animate-spin" /> : <LogIn />}{busy ? "Procesando…" : creatingAccount ? "Crear cuenta y entrar" : "Iniciar sesión"}</Button>
          </form>
          {!auth.invitationToken ? <p className="mt-4 text-center text-sm text-muted-foreground">{creatingAccount ? "¿Ya tienes una cuenta?" : "¿Primera vez aquí?"} <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setRegistering(!creatingAccount); setFormError("") }}>{creatingAccount ? "Inicia sesión" : "Crea una cuenta"}</button></p> : null}
        </section>
      </main>
    )
  }
  if (state === "syncing" || state === "waiting") return <Centered title="Conectando con QA" detail="Cargando proyectos y pruebas…" loading />
  if (state === "error") return <Centered title="No se pudo conectar con el backend" detail={error} action={<Button onClick={() => { setError(""); setState("waiting"); setRetry((value) => value + 1) }}>Reintentar</Button>} />
  return <>{children}</>
}

const fieldClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-ring"

function Centered({ title, detail, action, loading }: { title: string; detail: string; action?: ReactNode; loading?: boolean }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6 text-foreground">
      <section className="grid w-full max-w-md justify-items-center gap-4 rounded-2xl border bg-card p-8 text-center shadow-sm">
        {loading ? <LoaderCircle className="size-8 animate-spin text-primary" /> : <ShieldCheck className="size-8 text-primary" />}
        <div><h1 className="text-xl font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{detail}</p></div>
        {action}
      </section>
    </main>
  )
}
