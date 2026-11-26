import type { Metadata } from "next"
import { CaseEditor } from "@/components/cases/case-editor"

export const metadata: Metadata = { title: "Caso" }

export default function CasePage() {
  return <CaseEditor />
}
