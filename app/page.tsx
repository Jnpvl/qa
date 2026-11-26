import type { Metadata } from "next"
import { ProjectList } from "@/components/projects/project-list"

export const metadata: Metadata = {
  title: "Proyectos",
}

export default function HomePage() {
  return <ProjectList />
}
