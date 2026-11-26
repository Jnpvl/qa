import { createId } from "@/lib/text"
import type { Attachment } from "@/lib/types"

export const MAX_ATTACHMENT_BYTES = 350 * 1024

export function readAttachment(file: File): Promise<Attachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return Promise.reject(new Error("El archivo pasa de 350 KB. Elige uno más pequeño."))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."))
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : ""
      if (!dataUrl) {
        reject(new Error("No se pudo leer el archivo."))
        return
      }
      resolve({
        id: createId("att"),
        name: file.name || "archivo",
        mime: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
      })
    }
    reader.readAsDataURL(file)
  })
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  return `${Math.round(size / 1024)} KB`
}
