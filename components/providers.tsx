"use client"

import type { ReactNode } from "react"
import { AuthProvider } from "@/components/auth/auth-provider"
import { WorkspaceGate } from "@/components/auth/workspace-gate"
import { AppShell } from "@/components/shell/app-shell"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { StoreProvider } from "@/lib/store"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TooltipProvider>
        <StoreProvider>
          <WorkspaceGate><AppShell>{children}</AppShell></WorkspaceGate>
          <Toaster position="top-right" />
        </StoreProvider>
      </TooltipProvider>
    </AuthProvider>
  )
}
