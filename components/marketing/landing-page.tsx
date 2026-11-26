import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Bug,
  Check,
  CircleCheck,
  ClipboardCheck,
  Code2,
  Layers3,
  ListChecks,
  Play,
  ShieldCheck,
  UsersRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { product } from "@/lib/product"

const capabilities = [
  { icon: ListChecks, title: "Casos por suite", body: "Documenta precondiciones y pasos. Relaciona cada caso con sus requisitos y sprints." },
  { icon: Play, title: "Corridas", body: "Arma una corrida desde un plan o elige casos para una ejecución puntual. Guarda el resultado de cada caso." },
  { icon: Bug, title: "Defectos", body: "Registra fallas encontradas durante una corrida o hallazgos exploratorios que no tenían un caso previo." },
  { icon: BarChart3, title: "Resumen del proyecto", body: "Consulta resultados, pendientes y defectos sin reconstruir el avance a mano." },
  { icon: UsersRound, title: "Acceso por proyecto", body: "Invita miembros a tu organización y asigna quién puede trabajar en cada proyecto." },
  { icon: Code2, title: "Exportación a Playwright", body: "Lleva los casos al repositorio, completa selectores y lógica, y devuelve el reporte a una corrida." },
]

const flow = [
  { number: "01", title: "Prepara los casos", body: "Crea suites por módulo y escribe los pasos que el equipo debe seguir." },
  { number: "02", title: "Corre las pruebas", body: "Reutiliza un plan para cada revisión o inicia una corrida puntual con los casos que necesites." },
  { number: "03", title: "Registra qué pasó", body: "Marca resultados, adjunta evidencia y relaciona los defectos con la prueba que falló." },
]

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

export function LandingPage() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#f8faff] text-slate-950">
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label={`${product.name}, inicio`} className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-700 text-lg font-bold text-white shadow-lg shadow-blue-900/15">C</span>
          <span className="min-w-0"><span className="block truncate text-base font-bold tracking-tight">{product.name}</span><span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quality workspace</span></span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
          <button type="button" onClick={() => scrollToSection("plataforma")} className="hover:text-blue-700">Qué incluye</button>
          <button type="button" onClick={() => scrollToSection("flujo")} className="hover:text-blue-700">Cómo se usa</button>
          <button type="button" onClick={() => scrollToSection("automatizacion")} className="hover:text-blue-700">Playwright</button>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link href="/ingresar">Iniciar sesión</Link></Button>
          <Button asChild className="shadow-md shadow-blue-900/15"><Link href="/registro">Crear cuenta<ArrowRight /></Link></Button>
        </div>
      </header>

      <section className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 md:pt-16 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:pb-24 lg:pt-20">
        <div className="relative z-[1]">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-blue-800 shadow-sm"><span className="size-1.5 rounded-full bg-emerald-500" />Pruebas y seguimiento para tu producto</p>
          <h1 className="mt-6 max-w-2xl text-[clamp(2.6rem,6vw,4.6rem)] font-semibold leading-[1.02] tracking-[-0.055em] text-slate-950">Casos, corridas y defectos, <span className="text-blue-700">en un mismo lugar.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">Documenta qué probar, ejecuta los casos por plan o cuando lo necesites y guarda los resultados. Si algo falla, registra el defecto con su contexto.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 w-full px-5 text-sm shadow-lg shadow-blue-900/15 sm:w-auto"><Link href="/registro">Crear mi espacio<ArrowRight /></Link></Button>
            <Button type="button" size="lg" variant="outline" className="h-11 w-full px-5 text-sm sm:w-auto" onClick={() => scrollToSection("plataforma")}>Ver qué incluye<ArrowRight /></Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500"><span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-emerald-600" />Ejecución manual y automatizada</span><span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-emerald-600" />Casos reutilizables por proyecto</span></div>
        </div>

        <div className="relative mx-auto w-full max-w-[620px] lg:ml-auto">
          <div className="absolute -inset-8 rounded-[3rem] bg-blue-200/50 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_35px_90px_-35px_rgba(30,64,175,0.36)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-blue-600" /><span className="text-xs font-semibold text-slate-800">Resumen del proyecto</span></div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">Vista de ejemplo</span>
            </div>
            <div className="grid gap-4 p-4 sm:gap-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-medium text-slate-500">PROYECTO ACTIVO</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Tienda en línea</h2></div><span className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-[11px] font-semibold text-slate-600">SHOP</span></div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[{ label: "Casos", value: "128", icon: ClipboardCheck }, { label: "Pasaron", value: "94", icon: CircleCheck }, { label: "Corridas", value: "12", icon: Play }, { label: "Defectos", value: "7", icon: Bug }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"><Icon className="size-4 text-blue-700" /><p className="mt-3 text-xl font-semibold tracking-tight text-slate-900">{value}</p><p className="mt-0.5 text-[10px] font-medium text-slate-500 sm:text-xs">{label}</p></div>)}
              </div>
              <div className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-slate-800">Cobertura de la corrida</p><p className="mt-1 text-[11px] text-slate-500">Regresión · Stage · Build 2.4.18</p></div><span className="text-lg font-semibold text-blue-700">82%</span></div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[82%] rounded-full bg-gradient-to-r from-blue-700 to-cyan-500" /></div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500"><span><i className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />94 pasaron</span><span><i className="mr-1 inline-block size-1.5 rounded-full bg-rose-500" />8 fallaron</span><span><i className="mr-1 inline-block size-1.5 rounded-full bg-slate-300" />26 pendientes</span></div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl bg-blue-50/80 p-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-blue-700"><Layers3 className="size-4" /></span><span className="min-w-0"><span className="block text-xs font-semibold text-slate-800">Checkout</span><span className="block truncate text-[10px] text-slate-500">Suite · 18 casos</span></span><CircleCheck className="ml-auto size-4 shrink-0 text-emerald-600" /></div>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-blue-700"><Code2 className="size-4" /></span><span className="min-w-0"><span className="block text-xs font-semibold text-slate-800">Automatización</span><span className="block truncate text-[10px] text-slate-500">12 casos vinculados</span></span><span className="ml-auto size-2 shrink-0 rounded-full bg-blue-500" /></div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-3 hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:flex"><span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><ShieldCheck className="size-4" /></span><span><span className="block text-xs font-semibold text-slate-900">Equipo alineado</span><span className="block text-[10px] text-slate-500">Cada cambio tiene contexto</span></span></div>
        </div>
      </section>

      <section id="plataforma" className="scroll-mt-8 border-y border-slate-200/70 bg-white/75 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Para el trabajo diario</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Lo que necesitas para llevar un proyecto de pruebas</h2><p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">Casos, ejecuciones y defectos quedan ligados al mismo proyecto y conservan su historial.</p></div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-4">
            {capabilities.map(({ icon: Icon, title, body }) => <article key={title} className="group rounded-2xl border border-slate-200/80 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/[0.06] sm:p-6"><span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white"><Icon className="size-5" /></span><h3 className="mt-5 text-base font-semibold tracking-tight text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></article>)}
          </div>
        </div>
      </section>

      <section id="flujo" className="scroll-mt-8 mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20 lg:px-8">
        <div className="lg:sticky lg:top-20 lg:self-start"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">En cada proyecto</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Así se organiza una revisión.</h2><p className="mt-4 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">Prepara los casos una vez y vuelve a ejecutarlos en cada versión. El historial ayuda a saber qué se revisó y qué quedó pendiente.</p><Button asChild variant="outline" className="mt-6"><Link href="/registro">Crear un proyecto<ArrowRight /></Link></Button></div>
        <div className="grid gap-3 sm:gap-4">{flow.map((step, index) => <article key={step.number} className="relative grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-[4rem_1fr] sm:gap-5 sm:p-6"><span className="font-mono text-sm font-semibold text-blue-700">{step.number}</span><div><h3 className="text-lg font-semibold text-slate-900">{step.title}</h3><p className="mt-1.5 max-w-lg text-sm leading-6 text-slate-600">{step.body}</p></div>{index < flow.length - 1 ? <span className="absolute -bottom-4 left-8 z-[1] hidden h-4 w-px bg-blue-200 sm:block" /> : null}</article>)}</div>
      </section>

      <section id="automatizacion" className="scroll-mt-8 bg-slate-950 py-16 text-white sm:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div><p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-blue-200"><Code2 className="size-3.5" />Exportación a Playwright</p><h2 className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Pasa los casos a tu repositorio cuando estés listo.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Exporta el paquete con los IDs y referencias de los casos. Completa selectores y lógica en tu código; después importa el reporte Playwright a una corrida para guardar los resultados.</p><Button asChild className="mt-7 bg-white text-slate-950 hover:bg-blue-50"><Link href="/registro">Ver el flujo de pruebas<ArrowRight /></Link></Button></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:p-6"><div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4"><span className="text-sm font-semibold">Camino de automatización</span><span className="rounded-md bg-blue-400/15 px-2 py-1 text-[10px] font-semibold text-blue-200">Playwright</span></div><div className="mt-4 grid gap-3">{[{ name: "Agregar al carrito", status: "Automatizado", color: "text-emerald-300" }, { name: "Validar dirección", status: "Candidato", color: "text-amber-200" }, { name: "Pago con tarjeta", status: "Planeado", color: "text-blue-200" }].map((item, index) => <div key={item.name} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-3 sm:p-4"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 font-mono text-[10px] text-slate-300">0{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm text-slate-100">{item.name}</span><span className={`shrink-0 text-[10px] font-medium sm:text-xs ${item.color}`}>{item.status}</span></div>)}</div><p className="mt-4 text-xs leading-5 text-slate-400">Conserva IDs y referencias para conectar los resultados de ejecución con tus casos.</p></div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8"><div className="relative overflow-hidden rounded-3xl bg-blue-700 px-5 py-10 text-center text-white sm:px-10 sm:py-14"><div className="absolute -right-16 -top-24 size-64 rounded-full border-[40px] border-white/10" /><div className="relative mx-auto max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">Empieza con tu proyecto</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Prepara tu siguiente corrida.</h2><p className="mt-3 text-sm leading-6 text-blue-100 sm:text-base">Crea una cuenta, agrega a tu equipo y registra los casos que necesitas revisar.</p><Button asChild size="lg" className="mt-6 h-11 bg-white px-5 text-blue-800 hover:bg-blue-50"><Link href="/registro">Crear cuenta<ArrowRight /></Link></Button></div></div></section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><Link href="/" className="font-semibold text-slate-700">{product.name} <span className="font-normal text-slate-400">· QA</span></Link><p>Casos, corridas y defectos para proyectos de software.</p><div className="flex gap-4"><Link href="/ingresar" className="hover:text-blue-700">Iniciar sesión</Link><Link href="/registro" className="hover:text-blue-700">Crear cuenta</Link></div></div>
      </footer>
    </main>
  )
}
