# Casos

Seguimiento de pruebas para el trabajo diario de un equipo de QA. En un proyecto organizas sprints, suites anidadas y casos; armas planes y corridas; y ves el avance en un tablero.

La interfaz está en español de México. El frontend Next.js vive en este repositorio; la API NestJS y PostgreSQL están separados en la carpeta hermana `qa-api`. En desarrollo, el primer arranque importa al backend el espacio que ya estaba guardado en el navegador.

## Cómo está organizado

- **Proyecto.** El sistema que pruebas. Su clave arma el identificador visible del caso (`QA-001`).
- **Suite.** Carpeta de casos. Puede tener secciones anidadas.
- **Caso.** Título, precondiciones, pasos con resultado esperado, prioridad, severidad, tipo, etiquetas, estado y tipo de ejecución (Manual, Automatizado o Ambos). Puede ligarse a uno o varios sprints.
- **Sprint.** Ventana de tiempo, también llamada milestone.
- **Plan.** Agrupa las corridas de un sprint.
- **Corrida.** Ejecución manual: Pasó, Falló, Bloqueado u Omitido, con comentario.
- **Prueba rápida.** Crea una corrida independiente de un caso, sin plan ni sprint, conservando entorno, build y resultado.
- **Defecto independiente.** Se puede registrar desde Defectos con o sin caso asociado e indicar si viene de exploración, soporte, producción u otro origen.
- **Requisito.** Historia o elemento de trabajo, con ID y URL externos, relacionable con casos.
- **Trazabilidad.** Cada corrida conserva una instantánea de título, precondiciones, pasos y clasificación del caso al momento de crearla.
- **Automatización.** Cada caso puede marcarse como candidato, planeado, automatizado o no aplicable, y guardar la ruta de su test Playwright.
- **Cierre.** Una corrida con pendientes queda marcada como parcial; una corrida completa requiere que todos los casos tengan resultado.
- **Defectos.** Incluyen descripción, reproducción, esperado/actual, prioridad, responsable, entorno, build e ID/enlace externo.

La ayuda dentro de la app lo explica con el mismo lenguaje.

## Datos

El espacio inicia vacío. Los proyectos, casos, corridas y defectos que crees se guardan en PostgreSQL.

## Límites actuales del flujo

Los requisitos y defectos pueden guardar referencias a Azure DevOps, pero no existe sincronización con Azure ni notificaciones de Teams todavía. Los vínculos a Playwright son referencias documentales; no generan código ni importan resultados de CI. Las corridas nuevas congelan el contenido del caso.

## Flujo de automatización Playwright

1. Abre **Configuración** en el sidebar del proyecto y configura las URLs de desarrollo/local, Stage y Producción.
2. En **Casos**, descarga **Paquete Playwright**. El Markdown contiene el manifiesto de casos y las instrucciones para el agente del editor.
3. El agente inspecciona el sitio, implementa cada caso con selectores reales y conserva su ID en una anotación `qa-case`.
4. El agente añade `qa-results-reporter.mjs` al repositorio de pruebas. Ejecuta Playwright con `QA_PROJECT_KEY`, `QA_ENVIRONMENT` y `QA_BASE_URL`; el reporter genera `qa-results.json`.
5. Abre la corrida en la app e importa `qa-results.json`. Los resultados coincidentes se marcan Pasó/Falló/Omitido, y los IDs anotados actualizan el estado de automatización y la referencia al spec. Los casos no ejecutados siguen pendientes.

La integración con Playwright sigue funcionando mediante archivos. Las URLs y los casos ahora se respaldan en el backend. No almacena credenciales de los sitios: usa secretos de entorno en local/CI y guarda `storageState` fuera de Git (agrega `.auth/` al `.gitignore`).

## Correr en local

PostgreSQL debe estar disponible en `127.0.0.1:5433`. El backend ya tiene configurada la conexión en `../qa-api/.env` y la base `qa_workspace`.

En una terminal, inicia la API:

```bash
cd ../qa-api
npm install
npm run db:deploy
npm run dev
```

En otra terminal, inicia el frontend:

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). En desarrollo, Next reenvía las llamadas a la API local en el puerto 4000. Regístrate con nombre, correo y contraseña; el nombre de la organización es opcional. Cada registro crea un espacio aislado. También puedes unirte a una organización con un enlace de invitación. PostgreSQL conserva un hash de la contraseña y la sesión se firma con un secreto privado del backend.

### Compartir una vista temporal

Inicia también `qa-api` y, desde la vista **Ports** de VS Code, reenvía el puerto `3000`. Comparte la URL que VS Code genera para ese puerto; el frontend usará su proxy para comunicarse con la API local, así que no hace falta publicar el puerto `4000`. El túnel y ambos servidores deben permanecer activos. Para que alguien sin tu cuenta de Microsoft/GitHub pueda abrirlo, cambia la visibilidad del puerto a **Public**. Para ver una organización privada, esa persona debe registrarse con tu enlace de invitación.

```bash
npm run lint
npm run build
```

## Desplegar en Vercel

1. Importa este repositorio en Vercel.
2. El framework es Next.js. Deja el comando de build en `npm run build` y el de instalación en `npm install`.
3. El frontend usa por defecto `https://qa-api.161-35-59-139.sslip.io` en producción. Configura `NEXT_PUBLIC_QA_API_URL` solo si quieres sobrescribir ese destino.
4. Despliega `qa-api` por separado y configura su CORS para el dominio de Vercel. Los secretos de base de datos y de sesión viven solo en el backend.
5. Deploy.

## Renombrar el producto

El nombre visible está en `lib/product.ts`, en `name`. Cámbialo ahí y se actualiza en la interfaz, el título de la pestaña y la marca de la barra lateral.

## API separada

El backend NestJS está en `../qa-api`. Su contrato actual está versionado bajo `/api/v1`; el frontend no importa código interno de la API. PostgreSQL conserva el espacio inicial como documento JSON con control de revisión para facilitar la migración del estado previo. Antes de habilitar edición concurrente para el equipo, se debe normalizar a tablas y operaciones por recurso.
