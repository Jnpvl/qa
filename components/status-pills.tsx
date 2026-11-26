import { Badge } from "@/components/ui/badge"
import {
  caseStatusLabel,
  executionLabel,
  priorityLabel,
  resultLabel,
} from "@/lib/labels"
import { cn } from "@/lib/utils"
import type {
  CaseStatus,
  ExecutionType,
  Priority,
  ResultStatus,
} from "@/lib/types"

const executionClass: Record<ExecutionType, string> = {
  manual: "border-border bg-background text-foreground",
  automatizado: "border-transparent bg-primary/10 text-primary",
  ambos: "border-transparent bg-amber-100 text-amber-950",
}

export function ExecutionBadge({ type }: { type: ExecutionType }) {
  return (
    <Badge variant="outline" className={cn("font-medium", executionClass[type])}>
      {executionLabel[type]}
    </Badge>
  )
}

const statusClass: Record<CaseStatus, string> = {
  borrador: "border-border bg-background text-muted-foreground",
  listo: "border-emerald-200 bg-emerald-50 text-emerald-800",
  obsoleto: "border-transparent bg-muted text-muted-foreground line-through",
}

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return (
    <Badge variant="outline" className={statusClass[status]}>
      {caseStatusLabel[status]}
    </Badge>
  )
}

const priorityClass: Record<Priority, string> = {
  critica: "bg-red-500",
  alta: "bg-orange-500",
  media: "bg-amber-400",
  baja: "bg-stone-300",
}

export function PriorityMark({ priority }: { priority: Priority }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={cn("size-1.5 rounded-full", priorityClass[priority])} />
      {priorityLabel[priority]}
    </span>
  )
}

const resultClass: Record<ResultStatus, string> = {
  pendiente: "border-border bg-background text-muted-foreground",
  passed: "border-transparent bg-emerald-100 text-emerald-800",
  failed: "border-transparent bg-red-100 text-red-800",
  blocked: "border-transparent bg-amber-100 text-amber-950",
  skipped: "border-transparent bg-stone-200 text-stone-700",
}

export function ResultBadge({ status }: { status: ResultStatus }) {
  return (
    <Badge variant="outline" className={resultClass[status]}>
      {resultLabel[status]}
    </Badge>
  )
}
