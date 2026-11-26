import type { Metadata } from "next"
import { RunsPanel } from "@/components/runs/runs-panel"

export const metadata: Metadata = { title: "Corridas" }

export default function RunsPage() {
  return <RunsPanel />
}
