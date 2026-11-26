import type { Metadata } from "next"
import { ActivityPanel } from "@/components/activity/activity-panel"

export const metadata: Metadata = { title: "Bitácora" }

export default function ActivityPage() {
  return <ActivityPanel />
}
