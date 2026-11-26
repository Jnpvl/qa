import { migrate } from "@/lib/migrate"
import { product } from "@/lib/product"
import { seedData } from "@/lib/seed"
import type { DemoState } from "@/lib/types"

/**
 * Persistencia de la demo.
 * Hoy lee y escribe localStorage. Para un API real, sustituye estas dos
 * funciones (y las mutaciones de lib/store.tsx) por llamadas HTTP.
 * Los componentes no conocen dónde viven los datos.
 */
export function readState(): DemoState {
  if (typeof window === "undefined") return structuredClone(seedData)
  try {
    const raw = window.localStorage.getItem(product.storageKey)
    if (!raw) return structuredClone(seedData)
    const parsed = JSON.parse(raw) as { version?: number }
    const migrated = migrate(parsed)
    if (!migrated) return structuredClone(seedData)
    if (parsed.version !== 2) writeState(migrated)
    return migrated
  } catch {
    return structuredClone(seedData)
  }
}

export function writeState(state: DemoState) {
  window.localStorage.setItem(product.storageKey, JSON.stringify(state))
}
