"use client"

import type { ReactNode } from "react"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function reportError(error: unknown) {
  toast.error(error instanceof Error ? error.message : "No se pudo completar.")
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed bg-card px-6 py-10 text-center">
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  )
}

export function StackedBar({
  parts,
}: {
  parts: { value: number; className: string; label: string }[]
}) {
  const total = parts.reduce((sum, part) => sum + part.value, 0)
  return (
    <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
      {total === 0
        ? null
        : parts.map((part) =>
            part.value > 0 ? (
              <div
                key={part.label}
                className={cn("h-full", part.className)}
                style={{ width: `${(part.value / total) * 100}%` }}
                title={`${part.label}: ${part.value}`}
              />
            ) : null,
          )}
    </div>
  )
}

export function AppSkeleton() {
  return (
    <div className="flex h-dvh bg-background">
      <div className="hidden w-56 bg-sidebar md:block" />
      <div className="flex-1 p-6">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-72 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  )
}
