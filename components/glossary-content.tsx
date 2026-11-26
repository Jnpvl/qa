"use client"

import { Kbd } from "@/components/bits"
import { product } from "@/lib/product"

export function GlossaryContent() {
  return (
    <div className="grid gap-6 text-sm leading-6">
      <div className="rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-5">
        <p>Proyecto</p>
        <p className="pl-4">├─ Sprint</p>
        <p className="pl-4">├─ Suite</p>
        <p className="pl-8">└─ Suite (sección)</p>
        <p className="pl-12">└─ Caso</p>
        <p className="pl-4">└─ Plan</p>
        <p className="pl-8">└─ Corrida</p>
      </div>

      <section className="grid gap-2">
        <h2 className="font-medium">Proyecto</h2>
        <p className="text-muted-foreground">
          El producto o sistema que pruebas. Ahí viven las suites, los sprints, los planes y las corridas. La clave del proyecto arma el identificador visible del caso: en la tienda de ejemplo, la clave DEMO produce DEMO-001.
        </p>
      </section>

      <section className="grid gap-2">
        <h2 className="font-medium">Suite</h2>
        <p className="text-muted-foreground">
          Carpeta de casos. Puede tener secciones anidadas. En la tienda, Login contiene Recuperación de acceso, y Catálogo contiene Búsqueda y Filtros. Al elegir una suite ves también los casos de sus secciones.
        </p>
      </section>

      <section className="grid gap-2">
        <h2 className="font-medium">Caso</h2>
        <p className="text-muted-foreground">
          Un escenario que se puede verificar: título, precondiciones, pasos y el resultado esperado de cada paso. También tiene prioridad, severidad, tipo, etiquetas, estado (borrador, listo u obsoleto) y tipo de ejecución: Manual, Automatizado o Ambos. Un caso puede ligarse a uno o varios sprints, y puedes moverlo de suite.
        </p>
      </section>

      <section className="grid gap-2">
        <h2 className="font-medium">Sprint</h2>
        <p className="text-muted-foreground">
          También se le llama milestone. Es una ventana de tiempo con un objetivo, por ejemplo «cerrar el checkout». No ejecuta nada por sí mismo: sirve para saber qué casos entran en ese tramo y para leer el avance en el tablero.
        </p>
      </section>

      <section className="grid gap-2">
        <h2 className="font-medium">Plan</h2>
        <p className="text-muted-foreground">
          El paquete de trabajo de un sprint. Agrupa las corridas que vas a ejecutar, por ejemplo un humo y una regresión. No es un caso ni una corrida: es la forma de decir «esto es lo que vamos a correr».
        </p>
      </section>

      <section className="grid gap-2">
        <h2 className="font-medium">Corrida</h2>
        <p className="text-muted-foreground">
          La ejecución. Eliges casos (de un sprint, de una suite o a mano) y registras el resultado de cada uno: Pasó (Passed), Falló (Failed), Bloqueado (Blocked) u Omitido (Skipped), con un comentario. La barra muestra cuántos ya tienen resultado. Al cerrarla queda como historial; puedes reabrirla.
        </p>
      </section>

      <section className="grid gap-2">
        <h2 className="font-medium">Atajos</h2>
        <ul className="grid gap-1.5 text-muted-foreground">
          <li className="flex items-center gap-2">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
            <span>Búsqueda rápida de pantallas y casos.</span>
          </li>
          <li className="flex items-center gap-2">
            <Kbd>/</Kbd>
            <span>Enfoca el buscador de la pantalla.</span>
          </li>
          <li className="flex items-center gap-2">
            <Kbd>C</Kbd>
            <span>Nuevo caso, si estás en la lista.</span>
          </li>
          <li className="flex items-center gap-2">
            <Kbd>?</Kbd>
            <span>Abre esta ayuda.</span>
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <Kbd>J</Kbd>
            <Kbd>K</Kbd>
            <span>En una corrida, caso siguiente o anterior.</span>
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <Kbd>P</Kbd>
            <Kbd>F</Kbd>
            <Kbd>B</Kbd>
            <Kbd>O</Kbd>
            <span>Pasó, falló, bloqueado, omitido.</span>
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Los atajos de letras no corren mientras escribes en un campo. {product.name} guarda todo en este navegador.
        </p>
      </section>
    </div>
  )
}
