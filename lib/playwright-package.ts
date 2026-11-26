import { downloadText } from "@/lib/csv"
import { caseCode } from "@/lib/text"
import type { Project, Suite, TestCase } from "@/lib/types"

function safeEnvironmentUrl(value: string) {
  if (!value) return ""
  try {
    const url = new URL(value)
    url.username = ""
    url.password = ""
    url.search = ""
    url.hash = ""
    return url.toString()
  } catch {
    return value.trim()
  }
}

export function downloadPlaywrightAgentPackage(project: Project, cases: TestCase[], suites: Suite[]) {
  const environments = {
    local: safeEnvironmentUrl(project.environments.local),
    stage: safeEnvironmentUrl(project.environments.stage),
    production: safeEnvironmentUrl(project.environments.production),
  }
  const manifest = {
    schema: "qa-case-manifest/v1",
    project: { key: project.key, name: project.name, description: project.description, environments },
    cases: cases.map((item) => ({
      caseId: caseCode(project.key, item.number),
      title: item.title,
      suite: suites.find((suite) => suite.id === item.suiteId)?.name ?? "",
      preconditions: item.preconditions,
      steps: item.steps.map(({ action, expected }) => ({ action, expected })),
      priority: item.priority,
      kind: item.kind,
      executionType: item.executionType,
      automationStatus: item.automationStatus,
      automationRef: item.automationRef,
      tags: item.tags,
    })),
  }

  const reporter = [
    "import fs from 'node:fs/promises';",
    "import path from 'node:path';",
    "",
    "export default class QaResultsReporter {",
    "  coverage = [];",
    "  results = [];",
    "  onBegin(config, suite) {",
    "    this.coverage = suite.allTests().flatMap(test => {",
    "      const annotation = test.annotations.find(item => item.type === 'qa-case');",
    "      return annotation?.description ? [{ caseId: annotation.description, spec: path.relative(process.cwd(), test.location.file) }] : [];",
    "    });",
    "  }",
    "  onTestEnd(test, result) {",
    "    const annotation = test.annotations.find(item => item.type === 'qa-case');",
    "    if (!annotation?.description) return;",
    "    const status = result.status === 'passed' ? 'passed' : result.status === 'skipped' ? 'skipped' : 'failed';",
    "    this.results.push({ caseId: annotation.description, status, durationMs: result.duration, error: result.error?.message ?? result.errors?.map(item => item.message).filter(Boolean).join('\\n') ?? '', spec: path.relative(process.cwd(), test.location.file) });",
    "  }",
    "  async onEnd() {",
    "    const report = { schema: 'qa-results/v1', projectKey: process.env.QA_PROJECT_KEY ?? '', environment: process.env.QA_ENVIRONMENT ?? '', build: process.env.QA_BUILD ?? process.env.GITHUB_SHA ?? process.env.BUILD_SOURCEVERSION ?? '', generatedAt: new Date().toISOString(), coverage: this.coverage, results: this.results };",
    "    await fs.writeFile(process.env.QA_RESULTS_PATH ?? 'qa-results.json', JSON.stringify(report, null, 2));",
    "  }",
    "}",
  ].join("\n")

  const markdown = [
    `# Paquete de automatización Playwright — ${project.name}`,
    "",
    "Entrega este documento al agente del editor junto con el repositorio del sitio que se va a probar.",
    "",
    "## Instrucciones para el agente",
    "",
    "1. Inspecciona el repositorio y abre el ambiente indicado antes de escribir pruebas. No inventes selectores; usa getByRole, getByLabel o test IDs estables.",
    `2. Conserva cada ID de caso en una anotación Playwright: test("título", { annotation: { type: "qa-case", description: "${project.key}-001" } }, async ({ page }) => { ... }).`,
    "3. Usa process.env.QA_BASE_URL como baseURL. Escribe pruebas por caso que puedan ejecutarse solas y en conjunto; no marques automatizado un caso si no tiene una prueba real.",
    "4. Añade el reporter de abajo como qa-results-reporter.mjs y configúralo junto con el reporter habitual. Genera qa-results.json al final de cada ejecución.",
    "5. Si una prueba requiere autenticación, usa secretos en variables de entorno/CI y guarda storageState en .auth. Añade .auth/ a .gitignore antes de guardar el archivo. Nunca escribas contraseñas, tokens o cookies en specs, reportes o el manifiesto.",
    "",
    "## URLs por ambiente",
    "",
    `- Local: ${environments.local || "(sin configurar)"}`,
    `- Stage: ${environments.stage || "(sin configurar)"}`,
    `- Producción: ${environments.production || "(sin configurar)"}`,
    "",
    "Configura QA_BASE_URL con la URL que quieras probar. Las URLs se exportan sin usuario/contraseña, query string ni fragmento; guarda secretos aparte en variables de entorno.",
    "",
    "## Reporter qa-results-reporter.mjs",
    "",
    "```js",
    reporter,
    "```",
    "",
    "En playwright.config.ts conserva los reporters actuales y agrega ['./qa-results-reporter.mjs']. Corre, por ejemplo: QA_PROJECT_KEY=" + project.key + " QA_ENVIRONMENT=stage QA_BASE_URL=<url-stage> npx playwright test.",
    "",
    "## Importar resultados",
    "",
    "Abre la corrida que vas a actualizar en Casos, pulsa Importar resultados Playwright y selecciona qa-results.json. Se actualizan los IDs coincidentes de esa corrida. Los no ejecutados quedan pendientes; los casos anotados se marcan automatizados y se guarda su spec.",
    "",
    "## Manifiesto",
    "",
    "```json",
    JSON.stringify(manifest, null, 2),
    "```",
    "",
  ].join("\n")

  downloadText(`${project.key.toLowerCase()}-playwright-agent.md`, markdown, "text/markdown;charset=utf-8")
}
