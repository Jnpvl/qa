import type { DemoState } from "@/lib/types"
import { apiBase } from "@/lib/api-url"

type TokenProvider = () => Promise<string>
type WorkspaceResponse = { state: unknown | null; revision: number }

let tokenProvider: TokenProvider | null = null
let revision = 0
let ready = false
let pending = Promise.resolve()

export function setBackendTokenProvider(provider: TokenProvider | null) {
  tokenProvider = provider
}

async function request(path: string, init?: RequestInit) {
  if (!tokenProvider) throw new Error("No hay una sesión para guardar en el backend.")
  const token = await tokenProvider()
  return fetch(`${apiBase}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  })
}

export async function bootstrapBackend(localState: DemoState) {
  const result = await request("/api/v1/workspace")
  if (!result.ok) throw new Error(`No se pudo leer el backend (${result.status}).`)
  const remote = await result.json() as WorkspaceResponse

  if (remote.state) {
    revision = remote.revision
    ready = true
    return remote.state
  }

  const imported = await request("/api/v1/workspace/import", {
    method: "POST",
    body: JSON.stringify({ state: localState }),
  })
  if (imported.status === 409) {
    const retry = await request("/api/v1/workspace")
    if (!retry.ok) throw new Error(`No se pudo leer el backend (${retry.status}).`)
    const current = await retry.json() as WorkspaceResponse
    if (!current.state) throw new Error("El espacio se modificó durante la importación. Intenta de nuevo.")
    revision = current.revision
    ready = true
    return current.state
  }
  if (!imported.ok) throw new Error(`No se pudo importar el espacio (${imported.status}).`)
  const saved = await imported.json() as { revision: number }
  revision = saved.revision
  ready = true
  return null
}

export function queueBackendSave(state: DemoState) {
  if (!ready || !tokenProvider) return
  const snapshot = structuredClone(state)
  pending = pending.then(async () => {
    const result = await request("/api/v1/workspace", {
      method: "PUT",
      body: JSON.stringify({ state: snapshot, expectedRevision: revision }),
    })
    if (result.status === 409) {
      ready = false
      throw new Error("El espacio cambió en otro navegador. Recarga la página para obtener la versión actual.")
    }
    if (!result.ok) throw new Error(`No se pudo guardar en el backend (${result.status}).`)
    const saved = await result.json() as { revision: number; state?: { members?: DemoState["members"] } }
    revision = saved.revision
    window.dispatchEvent(new CustomEvent("qa-backend-sync", { detail: { status: "saved", members: saved.state?.members } }))
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "No se pudo sincronizar con el backend."
    window.dispatchEvent(new CustomEvent("qa-backend-sync", { detail: { status: "error", message } }))
  })
}

export function markBackendUnavailable() {
  ready = false
  revision = 0
}
