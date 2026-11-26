import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export function EnumSelect<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "default",
  id,
  ariaLabel,
  invalid,
  describedBy,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  className?: string
  size?: "sm" | "default"
  id?: string
  ariaLabel?: string
  invalid?: boolean
  describedBy?: string
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T)}>
      <SelectTrigger
        id={id}
        size={size}
        className={cn("w-full", className)}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
