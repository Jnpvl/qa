import { emptyWorkspace } from "@/lib/migrate"
import { queueBackendSave } from "@/lib/backend-sync"
import type { DemoState } from "@/lib/types"

/** Estado de la aplicación sincronizado con el backend. */
export function readState(): DemoState {
  return emptyWorkspace()
}

export function writeState(state: DemoState) {
  return queueBackendSave(state)
}
