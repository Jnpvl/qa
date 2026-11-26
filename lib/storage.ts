import { noteEdit } from "@/lib/backup"
import { emptyWorkspace, migrate } from "@/lib/migrate"
import { product } from "@/lib/product"
import type { DemoState } from "@/lib/types"

/**
 * Persistencia de la demo.
 * Hoy lee y escribe localStorage. Para un API real, sustituye estas dos
 * funciones (y las mutaciones de lib/store.tsx) por llamadas HTTP.
 * Los componentes no conocen dónde viven los datos.
 */
export function readState(): DemoState {
  if (typeof window === "undefined") return emptyWorkspace()
  try {
    const raw = window.localStorage.getItem(product.storageKey)
    if (!raw) return emptyWorkspace()
    const parsed = JSON.parse(raw) as { version?: number }
    const migrated = migrate(parsed)
    if (!migrated) return emptyWorkspace()
    if (parsed.version !== 2) writeState(migrated)
    return migrated
  } catch {
    return emptyWorkspace()
  }
}

export function writeState(state: DemoState, options?: { countEdit?: boolean }) {
  try {
    window.localStorage.setItem(product.storageKey, JSON.stringify(state))
  } catch (error) {
    const quota =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
    if (quota) {
      const message =
        "El navegador no tiene espacio para guardar más datos. Descarga un respaldo y quita adjuntos grandes."
      window.dispatchEvent(new CustomEvent("casos-quota", { detail: message }))
      throw new Error(message)
    }
    throw error
  }
  if (options?.countEdit) noteEdit()
}
