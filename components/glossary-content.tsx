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
          Un escenario que se puede verificar: título, precondiciones, pasos reordenables y el resultado esperado de cada paso. También tiene prioridad, severidad, tipo, etiquetas, estado (borrador, activo u obsoleto), tipo de ejecución (Manual, Automatizado o Ambos) y adjuntos pequeños. Puedes clonarlo. Cada guardado queda en el historial del caso, junto con sus ejecuciones y defectos.
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
          El paquete reutilizable. Agrupa suites o casos y, desde ahí, creas una corrida con ese conjunto.
        </p>
      </section>

      <section className="grid gap-2">
        <h2 className="font-medium">Corrida</h2>
        <p className="text-muted-foreground">
          La ejecución. Eliges casos (de un plan, un sprint, una suite o a mano) y registras el resultado de cada uno y de cada paso: Pasó, Falló, Bloqueado u Omitido, con comentario, adjunto, minutos y responsable. Puedes anotar el entorno y la versión. Si avanzas automáticamente, al marcar pasas al siguiente caso que sigue pendiente. Al cerrarla queda como historial; puedes reabrirla o crear otra solo con los fallidos y bloqueados. El reporte se exporta a CSV o se imprime.
        </p>
      </section>

      <section className="grid gap-2">
        <h2 className="font-medium">Defectos y equipo</h2>
        <p className="text-muted-foreground">
          Un defecto nace de un resultado fallido: título, severidad, estado (abierto, en progreso, resuelto o cerrado) y un enlace opcional a Jira o GitHub. El equipo es una lista de nombres y roles para asignar responsables. No hay cuentas ni contraseñas.
        </p>
      </section>

      <section className="grid gap-2">
        <h2 className="font-medium">Datos</h2>
        <p className="text-muted-foreground">
          Desde Casos exportas CSV o JSON e importas un CSV después de mapear las columnas. En Proyectos, Respaldar descarga todo el espacio de trabajo. Restaurar reemplaza todo lo que hay ahora por el contenido del archivo; antes de confirmar puedes descargar el respaldo actual. Si el archivo es de una versión anterior, se completa solo.
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
