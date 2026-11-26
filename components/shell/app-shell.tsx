"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"
import {
  Bug,
  CircleHelp,
  Flag,
  LayoutDashboard,
  Layers,
  ListChecks,
  Menu,
  Play,
  RotateCcw,
  Search,
  Users,
} from "lucide-react"
import { AppSkeleton, Kbd } from "@/components/bits"
import { GlossaryContent } from "@/components/glossary-content"
import { CommandPalette } from "@/components/shell/command-palette"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { backupReminder, downloadWorkspaceBackup, readBackupMeta } from "@/lib/backup"
import { product } from "@/lib/product"
import { useStore } from "@/lib/store"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const nav = [
  { slug: "casos", label: "Casos", icon: ListChecks },
  { slug: "sprints", label: "Sprints", icon: Flag },
  { slug: "planes", label: "Planes", icon: Layers },
  { slug: "corridas", label: "Corridas", icon: Play },
  { slug: "defectos", label: "Defectos", icon: Bug },
  { slug: "equipo", label: "Equipo", icon: Users },
  { slug: "tablero", label: "Tablero", icon: LayoutDashboard },
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
  if (!store.data.initialized) return <Welcome onEmpty={() => store.startEmpty()} onDemo={() => store.loadDemo()} />
  return <ShellFrame>{children}</ShellFrame>
}

function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const store = useStore()
  const data = store.data
  const projectId = pathname.match(/^\/proyectos\/([^/]+)/)?.[1] ?? null
  const project = data?.projects.find((item) => item.id === projectId) ?? null
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [phrase, setPhrase] = useState("")
  const [quota, setQuota] = useState<string | null>(null)
  const [, setBackupTick] = useState(0)
  const backupMeta = readBackupMeta()
  const realData = data?.projects.some((item) => !item.sample) ?? false
  const reminder = backupReminder(backupMeta)

  useEffect(() => {
    function onQuota(event: Event) {
      setQuota((event as CustomEvent<string>).detail)
    }
    window.addEventListener("casos-quota", onQuota)
    return () => window.removeEventListener("casos-quota", onQuota)
  }, [])

  function backup() {
    if (!data) return
    downloadWorkspaceBackup(data)
    setBackupTick((value) => value + 1)
    setQuota(null)
    toast.success("Respaldo descargado")
  }

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
      <ShellLink href="/" active={pathname === "/"} onNavigate={() => setMenuOpen(false)}>
        Proyectos
      </ShellLink>
      {project
        ? nav.map((item) => {
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
          })
        : null}
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
      <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex print:hidden">
        <Link href="/" className="flex items-center gap-2 px-3 py-3">
          <Mark />
          <span className="font-semibold tracking-tight">{product.name}</span>
        </Link>
        {project ? (
          <p className="truncate px-3 pb-2 text-xs text-sidebar-foreground/70">{project.name}</p>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-2">{links}</div>
        <div className="grid gap-2 border-t border-sidebar-border p-3">
          <p className="text-[11px] leading-4 text-sidebar-foreground/60">
            Los cambios se guardan en este navegador.
          </p>
          <Button
            variant="ghost"
            className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setResetOpen(true)}
          >
            <RotateCcw />
            Restablecer demo
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 min-w-0 shrink-0 items-center gap-2 overflow-hidden border-b bg-card px-3 print:hidden">
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
                <Button variant="ghost" className="max-w-[50vw] truncate px-2">
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
          <div className="ml-auto flex items-center gap-1">
            <Button variant="outline" size="sm" className="shrink-0" onClick={backup}>
              <span className="hidden sm:inline">Respaldo</span>
              <span className="sm:hidden">Copia</span>
            </Button>
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
        {quota ? (
          <p className="border-b bg-destructive/10 px-3 py-2 text-sm text-destructive">{quota}</p>
        ) : reminder ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <span>{reminder} Los datos viven solo en este navegador.</span>
            <Button size="sm" variant="outline" onClick={backup}>
              Descargar respaldo
            </Button>
          </div>
        ) : (
          <p className="border-b px-3 py-1 text-[11px] text-muted-foreground print:hidden">
            Los datos de este espacio viven en este navegador.
          </p>
        )}
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar text-sidebar-foreground">
          <SheetHeader>
            <SheetTitle className="text-sidebar-foreground">{product.name}</SheetTitle>
          </SheetHeader>
          <div className="px-2">{links}</div>
          <div className="mt-auto p-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={() => {
                setMenuOpen(false)
                setResetOpen(true)
              }}
            >
              <RotateCcw />
              Restablecer demo
            </Button>
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

      <AlertDialog
        open={resetOpen}
        onOpenChange={(open) => {
          setResetOpen(open)
          if (!open) setPhrase("")
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restablecer la demo?</AlertDialogTitle>
            <AlertDialogDescription>
              {realData
                ? "Hay proyectos que no son el ejemplo. Esto los reemplaza todos por la tienda de demostración. Escribe BORRAR para continuar."
                : "Se reemplaza lo que hay en este navegador por la tienda de ejemplo."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {realData ? (
            <Input
              aria-label="Escribe BORRAR para confirmar"
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              placeholder="BORRAR"
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={realData && phrase !== "BORRAR"}
              onClick={() => {
                if (realData && phrase !== "BORRAR") return
                store.reset()
                setResetOpen(false)
                setPhrase("")
                router.push("/")
              }}
            >
              Restablecer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Welcome({ onEmpty, onDemo }: { onEmpty: () => void; onDemo: () => void }) {
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-lg content-center gap-6 p-6">
      <div>
        <p className="text-sm text-muted-foreground">{product.name}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">¿Cómo quieres empezar?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Todo se guarda en este navegador. Puedes descargar un respaldo cuando quieras.
        </p>
      </div>
      <div className="grid gap-3">
        <Button onClick={onEmpty}>Empezar vacío</Button>
        <Button variant="outline" onClick={onDemo}>
          Cargar demo
        </Button>
      </div>
    </div>
  )
}

function Mark() {
  return (
    <span className="grid size-7 place-items-center rounded-md bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
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
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
      )}
    >
      {children}
    </Link>
  )
}
