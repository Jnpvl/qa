export function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

export function caseCode(key: string, number: number, idPrefix?: string, customId?: string) {
  if (customId?.trim()) return customId.trim()
  return `${idPrefix?.trim() || key}-${String(number).padStart(3, "0")}`
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

const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

function isRealDate(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function readIsoDate(iso: string) {
  const match = dateOnly.exec(iso)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!isRealDate(year, month, day)) return null
  return { year, month, day }
}

export function localDateStamp(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function formatDate(iso: string) {
  const parsed = readIsoDate(iso)
  if (parsed) return `${parsed.day} ${MONTHS_SHORT[parsed.month - 1]} ${parsed.year}`
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`
}

export function formatDateInput(iso: string) {
  const parsed = readIsoDate(iso)
  if (!parsed) return ""
  return `${String(parsed.day).padStart(2, "0")}/${String(parsed.month).padStart(2, "0")}/${parsed.year}`
}

export function parseDateInput(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim())
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (!isRealDate(year, month, day)) return null
  return `${match[3]}-${match[2]}-${match[1]}`
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
