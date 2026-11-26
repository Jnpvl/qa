import type { Metadata } from "next"
import { ProjectList } from "@/components/projects/project-list"

export const metadata: Metadata = {
  title: "Gestión de pruebas QA",
  description: "Organiza casos de prueba, corridas y defectos en un espacio de trabajo para tu equipo de QA.",
}

export default function HomePage() {
  return <ProjectList />
}
