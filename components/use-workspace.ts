"use client"

import { useParams } from "next/navigation"
import { useStore } from "@/lib/store"

export function useRouteParam(name: string) {
  const params = useParams()
  const value = params[name]
  if (Array.isArray(value)) return value[0]
  return value
}

export function useWorkspace() {
  const store = useStore()
  const projectId = useRouteParam("projectId") ?? ""
  const project =
    store.data?.projects.find((item) => item.id === projectId) ?? null
  return { store, data: store.data, projectId, project }
}
