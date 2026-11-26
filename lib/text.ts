export function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

export function caseCode(key: string, number: number) {
  return `${key}-${String(number).padStart(3, "0")}`
}

export function suggestKey(name: string) {
  const clean = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
  const words = clean.trim().split(/\s+/).filter(Boolean)
  const source = words.find((word) => word.length >= 3) ?? words[0] ?? "PRY"
  let key = source.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
  if (key.length < 2) key = "PRY"
  if (!/^[A-Z]/.test(key)) key = `P${key}`.slice(0, 6)
  return key
}

export function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function isProjectKey(value: string) {
  return /^[A-Z][A-Z0-9]{1,7}$/.test(value)
}

const dateOnly = /^\d{4}-\d{2}-\d{2}$/

export function formatDate(iso: string) {
  const date = new Date(dateOnly.test(iso) ? `${iso}T12:00:00` : iso)
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

let sequence = 0

export function createId(prefix: string) {
  sequence += 1
  return `${prefix}_${Date.now().toString(36)}${sequence.toString(36)}`
}
