import type { Metadata } from "next"
import { ProjectSettingsPanel } from "@/components/projects/project-settings-panel"

export const metadata: Metadata = { title: "Configuración del proyecto" }

export default function ProjectSettingsPage() {
  return <ProjectSettingsPanel />
}
