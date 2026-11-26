import type { Metadata } from "next"
import { SprintsPanel } from "@/components/sprints/sprints-panel"

export const metadata: Metadata = { title: "Sprints" }

export default function SprintsPage() {
  return <SprintsPanel />
}
