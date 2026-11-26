# Casos

Seguimiento de pruebas para el trabajo diario de un equipo de QA. En un proyecto organizas sprints, suites anidadas y casos; armas planes y corridas; y ves el avance en un tablero.

La interfaz está en español de México. No hay backend: todo se guarda en `localStorage` del navegador. Se puede desplegar en Vercel sin variables de entorno.

## Cómo está organizado

- **Proyecto.** El sistema que pruebas. Su clave arma el identificador visible del caso (`DEMO-001`).
- **Suite.** Carpeta de casos. Puede tener secciones anidadas.
- **Caso.** Título, precondiciones, pasos con resultado esperado, prioridad, severidad, tipo, etiquetas, estado y tipo de ejecución (Manual, Automatizado o Ambos). Puede ligarse a uno o varios sprints.
- **Sprint.** Ventana de tiempo, también llamada milestone.
- **Plan.** Agrupa las corridas de un sprint.
- **Corrida.** Ejecución manual: Pasó, Falló, Bloqueado u Omitido, con comentario.

La ayuda dentro de la app lo explica con el mismo lenguaje.

## Datos de ejemplo

Al abrir la app, o al pulsar **Restablecer demo**, aparece el proyecto **Tienda en línea demo** (clave `DEMO`):

- Suites: Login (con Recuperación de acceso), Catálogo (con Búsqueda y Filtros), Carrito y Checkout.
- 20 casos.
- 2 sprints, 2 planes y 2 corridas, una cerrada y otra en progreso.

Los cambios que hagas se quedan en este navegador hasta que restablezcas la demo.

## Correr en local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). La app entra directo a la lista de proyectos.

```bash
npm run lint
npm run build
```

## Desplegar en Vercel

1. Importa este repositorio en Vercel.
2. El framework es Next.js. Deja el comando de build en `npm run build` y el de instalación en `npm install`.
3. No hace falta configurar variables de entorno.
4. Deploy.

## Renombrar el producto

El nombre visible está en `lib/product.ts`, en `name`. Cámbialo ahí y se actualiza en la interfaz, el título de la pestaña y la marca de la barra lateral.

## Dónde conectaría un API

Los componentes no leen `localStorage` directo. La frontera está en:

- `lib/storage.ts`: leer y escribir el estado.
- `lib/store.tsx`: las operaciones (crear caso, cerrar corrida, restablecer).

Para un backend, sustituye esas dos piezas por llamadas HTTP y deja las pantallas igual. `lib/types.ts` es el modelo.
