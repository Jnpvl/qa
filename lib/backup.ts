const key = "casos.backup.meta"

export interface BackupMeta {
  at: number | null
  changes: number
  since: number | null
}

const empty: BackupMeta = { at: null, changes: 0, since: null }

export function readBackupMeta(): BackupMeta {
  if (typeof window === "undefined") return empty
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<BackupMeta>
    return {
      at: typeof parsed.at === "number" ? parsed.at : null,
      changes: typeof parsed.changes === "number" ? parsed.changes : 0,
      since: typeof parsed.since === "number" ? parsed.since : null,
    }
  } catch {
    return empty
  }
}

function writeMeta(meta: BackupMeta) {
  window.localStorage.setItem(key, JSON.stringify(meta))
}

export function noteEdit() {
  if (typeof window === "undefined") return
  const current = readBackupMeta()
  writeMeta({
    at: current.at,
    changes: current.changes + 1,
    since: current.since ?? Date.now(),
  })
}

export function markBackup() {
  if (typeof window === "undefined") return
  writeMeta({ at: Date.now(), changes: 0, since: null })
}

export function backupReminder(meta: BackupMeta) {
  if (meta.changes <= 0) return null
  if (meta.changes >= 20) return "Llevas 20 cambios o más sin descargar un respaldo."
  const stamp = meta.at ?? meta.since
  if (stamp && Date.now() - stamp > 24 * 60 * 60 * 1000) {
    return "Pasó más de un día desde el último respaldo."
  }
  return null
}
