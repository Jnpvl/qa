import type { Metadata } from "next"
import { CasesWorkspace } from "@/components/cases/cases-workspace"

export const metadata: Metadata = { title: "Casos" }

export default function CasesPage() {
  return <CasesWorkspace />
}
