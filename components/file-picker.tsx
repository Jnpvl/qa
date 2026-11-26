"use client"

import { useId, useState } from "react"
import { Button } from "@/components/ui/button"

export function FilePicker({
  label,
  accept,
  disabled,
  emptyLabel = "Ningún archivo seleccionado",
  onFile,
}: {
  label: string
  accept?: string
  disabled?: boolean
  emptyLabel?: string
  onFile: (file: File) => void
}) {
  const id = useId()
  const [name, setName] = useState<string | null>(null)
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (!file) return
          setName(file.name)
          onFile(file)
        }}
      />
      <Button type="button" variant="outline" disabled={disabled} asChild>
        <label htmlFor={id} className={disabled ? "pointer-events-none opacity-50" : undefined}>
          {label}
        </label>
      </Button>
      <span className="min-w-0 truncate text-sm text-muted-foreground">{name ?? emptyLabel}</span>
    </div>
  )
}
