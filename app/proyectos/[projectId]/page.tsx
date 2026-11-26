import { redirect } from "next/navigation"

export default async function ProjectIndex({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  redirect(`/proyectos/${projectId}/casos`)
}
