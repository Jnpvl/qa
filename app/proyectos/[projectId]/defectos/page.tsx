import type { Metadata } from "next"
import { DefectsPanel } from "@/components/defects/defects-panel"

export const metadata: Metadata = { title: "Defectos" }

export default function DefectsPage() {
  return <DefectsPanel />
}
