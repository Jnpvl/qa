"use client"

import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { caseCode } from "@/lib/text"
import { useStore } from "@/lib/store"

export function CommandPalette({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string | null
}) {
  const router = useRouter()
  const store = useStore()
  const data = store.data
  if (!data) return null

  const project = data.projects.find((item) => item.id === projectId) ?? null
  const cases = data.cases.filter((item) => !project || item.projectId === project.id)

  function go(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Búsqueda rápida"
      description="Ir a una pantalla o abrir un caso"
    >
      <CommandInput placeholder="Buscar casos, proyectos o pantallas…" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        <CommandGroup heading="Pantallas">
          <CommandItem value="proyectos inicio" onSelect={() => go("/")}>
            Proyectos
          </CommandItem>
          <CommandItem value="ayuda glosario" onSelect={() => go("/ayuda")}>
            Ayuda
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
          {project ? (
            <CommandItem
              value="casos de prueba"
              onSelect={() => go(`/proyectos/${project.id}/casos`)}
            >
              Casos
            </CommandItem>
          ) : null}
          {project ? (
            <CommandItem
              value="sprints milestones"
              onSelect={() => go(`/proyectos/${project.id}/sprints`)}
            >
              Sprints
            </CommandItem>
          ) : null}
          {project ? (
            <CommandItem
              value="planes"
              onSelect={() => go(`/proyectos/${project.id}/planes`)}
            >
              Planes
            </CommandItem>
          ) : null}
          {project ? (
            <CommandItem
              value="corridas ejecucion"
              onSelect={() => go(`/proyectos/${project.id}/corridas`)}
            >
              Corridas
            </CommandItem>
          ) : null}
          {project ? (
            <CommandItem
              value="tablero metricas"
              onSelect={() => go(`/proyectos/${project.id}/tablero`)}
            >
              Tablero
            </CommandItem>
          ) : null}
        </CommandGroup>
        {project ? (
          <CommandGroup heading="Acciones">
            <CommandItem
              value="nuevo caso"
              onSelect={() => go(`/proyectos/${project.id}/casos/nuevo`)}
            >
              Nuevo caso
              <CommandShortcut>C</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="nueva corrida"
              onSelect={() => go(`/proyectos/${project.id}/corridas`)}
            >
              Nueva corrida
            </CommandItem>
          </CommandGroup>
        ) : null}
        <CommandSeparator />
        <CommandGroup heading="Casos">
          {cases.flatMap((item) => {
            const owner = data.projects.find((entry) => entry.id === item.projectId)
            if (!owner) return []
            const code = caseCode(owner.key, item.number)
            return (
              <CommandItem
                key={item.id}
                value={`${code} ${item.title} ${item.tags.join(" ")} ${item.id}`}
                onSelect={() =>
                  go(`/proyectos/${item.projectId}/casos/${item.id}`)
                }
              >
                <span className="font-mono text-xs text-muted-foreground">{code}</span>
                <span className="truncate">{item.title}</span>
              </CommandItem>
            )
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
