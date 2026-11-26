import type { Metadata } from "next"
import { OrganizationPanel } from "@/components/organization/organization-panel"

export const metadata: Metadata = { title: "Organización" }

export default function OrganizationPage() {
  return <OrganizationPanel />
}
