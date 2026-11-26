"use client"

import type { ReactNode } from "react"
import { AppShell } from "@/components/shell/app-shell"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { StoreProvider } from "@/lib/store"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <StoreProvider>
        <AppShell>{children}</AppShell>
        <Toaster position="top-right" />
      </StoreProvider>
    </TooltipProvider>
  )
}
