"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"
import {
  Bug,
  Building2,
  CircleHelp,
  Clock3,
  FolderKanban,
  Flag,
  LayoutDashboard,
  Layers,
  ListChecks,
  LogOut,
  Menu,
  Play,
  Waypoints,
  Search,
  Settings2,
  UserRoundPlus,
} from "lucide-react"
import { AppSkeleton, Kbd } from "@/components/bits"
import { GlossaryContent } from "@/components/glossary-content"
import { CommandPalette } from "@/components/shell/command-palette"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { product } from "@/lib/product"
import { replaceWorkspaceMembers, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-provider"

const nav = [
  { slug: "casos", label: "Casos", icon: ListChecks },
  { slug: "requisitos", label: "Requisitos", icon: Waypoints },
  { slug: "sprints", label: "Sprints", icon: Flag },
  { slug: "planes", label: "Planes", icon: Layers },
  { slug: "corridas", label: "Corridas", icon: Play },
  { slug: "defectos", label: "Defectos", icon: Bug },
  { slug: "equipo", label: "Equipo", icon: UserRoundPlus },
  { slug: "tablero", label: "Tablero", icon: LayoutDashboard },
  { slug: "configuracion", label: "Configuración", icon: Settings2 },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const store = useStore()
  if (!store.data) {
    return (
      <>
        <AppSkeleton />
        <div className="hidden">{children}</div>
      </>
    )
  }
  if (!store.data.initialized) return <Welcome onContinue={() => store.startEmpty()} />
  return <ShellFrame>{children}</ShellFrame>
}

function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const store = useStore()
  const auth = useAuth()
  const data = store.data
  const projectId = pathname.match(/^\/proyectos\/([^/]+)/)?.[1] ?? null
  const project = data?.projects.find((item) => item.id === projectId) ?? null
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    function onBackendSync(event: Event) {
      const detail = (event as CustomEvent<{ status?: string; message?: string; members?: import("@/lib/types").Member[] }>).detail
      if (detail?.status === "error") toast.error(detail.message ?? "No se pudo guardar en el backend.")
      if (detail?.status === "saved" && Array.isArray(detail.members)) replaceWorkspaceMembers(detail.members)
    }
    window.addEventListener("qa-backend-sync", onBackendSync)
    return () => {
      window.removeEventListener("qa-backend-sync", onBackendSync)
    }
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      const typing =
        target instanceof HTMLElement &&
        Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setPaletteOpen(true)
        return
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === "/") {
        const field = document.querySelector<HTMLElement>("[data-search-input]")
        if (!field) return
        event.preventDefault()
        field.focus()
      } else if (event.key === "?") {
        setHelpOpen(true)
      } else if (event.key.toLowerCase() === "c" && project && pathname.endsWith("/casos")) {
        router.push(`/proyectos/${project.id}/casos/nuevo`)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [pathname, project, router])

  const links = (
    <nav className="grid gap-1">
      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">General</p>
      <ShellLink href="/" active={pathname === "/"} onNavigate={() => setMenuOpen(false)}>
        <FolderKanban />
        Proyectos
      </ShellLink>
      {auth.user?.role === "owner" ? <ShellLink href="/organizacion" active={pathname === "/organizacion"} onNavigate={() => setMenuOpen(false)}>
        <Building2 />
        Organización
      </ShellLink> : null}
      {auth.user?.role === "owner" ? <ShellLink href="/actividad" active={pathname === "/actividad"} onNavigate={() => setMenuOpen(false)}>
        <Clock3 />
        Bitácora
      </ShellLink> : null}
      {project ? <>
        <div className="mx-3 my-2 border-t border-sidebar-border" />
        <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">Proyecto</p>
        {nav.map((item) => {
            const href = `/proyectos/${project.id}/${item.slug}`
            const Icon = item.icon
            return (
              <ShellLink
                key={item.slug}
                href={href}
                active={pathname === href || pathname.startsWith(`${href}/`)}
                onNavigate={() => setMenuOpen(false)}
              >
                <Icon />
                {item.label}
              </ShellLink>
            )
          })}
      </> : null}
      {!project ? <div className="mx-3 my-2 border-t border-sidebar-border" /> : null}
      <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">Ayuda</p>
      <ShellLink
        href="/ayuda"
        active={pathname === "/ayuda"}
        onNavigate={() => setMenuOpen(false)}
      >
        <CircleHelp />
        Ayuda
      </ShellLink>
    </nav>
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex print:hidden">
        <Link href="/" className="flex items-center gap-3 border-b border-sidebar-border px-4 py-5">
          <Mark />
          <span className="min-w-0"><span className="block truncate text-sm font-semibold tracking-tight">{product.name}</span><span className="mt-0.5 block truncate text-[10px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/55">Quality workspace</span></span>
        </Link>
        {project ? (
          <div className="mx-3 my-3 rounded-lg border border-sidebar-border bg-sidebar-accent/60 px-3 py-2.5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50">Proyecto activo</p><p className="mt-1 truncate text-xs font-medium">{project.name}</p><p className="mt-1 font-mono text-[10px] text-sidebar-foreground/55">{project.key}</p></div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-2">{links}</div>
        <div className="shrink-0 border-t border-sidebar-border p-3">
          {auth.user?.email ? <p className="mb-2 truncate px-1 text-xs text-sidebar-foreground/60" title={auth.user.email}>{auth.user.email}</p> : null}
          {auth.authenticated ? <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent" onClick={auth.logout}><LogOut />Cerrar sesión</Button> : null}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:ml-60">
        <header className="sticky top-0 z-20 flex h-14 min-w-0 shrink-0 items-center gap-1.5 overflow-hidden border-b border-border/80 bg-card/90 px-2 shadow-sm backdrop-blur-md sm:gap-2 sm:px-4 print:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Abrir menú"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </Button>
          {project ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="max-w-[42vw] truncate px-2 sm:max-w-[50vw]">
                  {project.name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {data?.projects.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onSelect={() => router.push(`/proyectos/${item.id}/casos`)}
                  >
                    <span className="font-mono text-xs text-muted-foreground">{item.key}</span>
                    {item.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-sm font-medium">{product.name}</span>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => setPaletteOpen(true)}>
              <Search />
              <span className="hidden sm:inline">Buscar</span>
              <span className="hidden md:inline">
                <Kbd>Ctrl K</Kbd>
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ayuda"
              onClick={() => setHelpOpen(true)}
            >
              <CircleHelp />
            </Button>
          </div>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[min(18rem,85vw)] bg-sidebar text-sidebar-foreground">
          <SheetHeader>
            <SheetTitle className="text-sidebar-foreground">{product.name}</SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col px-2">
            <div className="min-h-0 flex-1 overflow-y-auto">{links}</div>
            <div className="shrink-0 border-t border-sidebar-border p-3">
              {auth.user?.email ? <p className="mb-2 truncate px-1 text-xs text-sidebar-foreground/60">{auth.user.email}</p> : null}
              {auth.authenticated ? <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => { auth.logout(); setMenuOpen(false) }}><LogOut />Cerrar sesión</Button> : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} projectId={project?.id ?? null} />

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cómo está organizado {product.name}</DialogTitle>
            <DialogDescription>
              Proyecto, suite, caso, sprint, plan y corrida.
            </DialogDescription>
          </DialogHeader>
          <GlossaryContent />
        </DialogContent>
      </Dialog>

    </div>
  )
}

function Welcome({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-lg content-center gap-6 p-6">
      <div>
        <p className="text-sm text-muted-foreground">{product.name}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Tu espacio de QA está listo</h1>
      </div>
      <div className="grid gap-3">
        <Button onClick={onContinue}>Continuar</Button>
      </div>
    </div>
  )
}

function Mark() {
  return (
    <span className="grid size-9 place-items-center rounded-xl bg-sidebar-primary text-base font-bold text-sidebar-primary-foreground shadow-lg shadow-black/10">
      {product.name.slice(0, 1).toUpperCase()}
    </span>
  )
}

function ShellLink({
  href,
  active,
  onNavigate,
  children,
}: {
  href: string
  active: boolean
  onNavigate: () => void
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&_svg]:size-4 [&_svg]:opacity-75",
        active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm [&_svg]:text-sidebar-primary [&_svg]:opacity-100",
      )}
    >
      {children}
    </Link>
  )
}
