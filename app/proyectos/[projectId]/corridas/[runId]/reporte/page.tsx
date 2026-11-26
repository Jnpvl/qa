import type { Metadata } from "next"
import { RunReport } from "@/components/runs/run-report"

export const metadata: Metadata = { title: "Reporte" }

export default function RunReportPage() {
  return <RunReport />
}
