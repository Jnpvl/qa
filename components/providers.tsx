"use client"

import { Suspense, type ReactNode } from "react"
import { AuthProvider } from "@/components/auth/auth-provider"
import { WorkspaceGate } from "@/components/auth/workspace-gate"
import { AppShell } from "@/components/shell/app-shell"
import { AppSkeleton } from "@/components/bits"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { StoreProvider } from "@/lib/store"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TooltipProvider>
        <StoreProvider>
          <Suspense fallback={<AppSkeleton />}>
            <WorkspaceGate><AppShell>{children}</AppShell></WorkspaceGate>
          </Suspense>
          <Toaster position="top-right" />
        </StoreProvider>
      </TooltipProvider>
    </AuthProvider>
  )
}
