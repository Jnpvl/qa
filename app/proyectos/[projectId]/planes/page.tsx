import type { Metadata } from "next"
import { PlansPanel } from "@/components/plans/plans-panel"

export const metadata: Metadata = { title: "Planes" }

export default function PlansPage() {
  return <PlansPanel />
}
