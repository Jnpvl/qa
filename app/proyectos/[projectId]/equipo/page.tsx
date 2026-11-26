import type { Metadata } from "next"
import { MembersPanel } from "@/components/members/members-panel"

export const metadata: Metadata = { title: "Equipo" }

export default function MembersPage() {
  return <MembersPanel />
}
