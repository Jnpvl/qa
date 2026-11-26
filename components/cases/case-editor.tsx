"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { FormField, PageHeader, reportError } from "@/components/bits"
import { EnumSelect } from "@/components/enum-select"
import { MissingProject } from "@/components/missing-project"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  caseStatuses,
  caseStatusLabel,
  executionLabel,
  executionTypes,
  kindLabel,
  kinds,
  priorities,
  priorityLabel,
  severities,
  severityLabel,
} from "@/lib/labels"
import { flattenSuites } from "@/lib/suites"
import { formatBytes, readAttachment } from "@/lib/attachments"
import { FilePicker } from "@/components/file-picker"
import { caseCode, createId, formatDateTime, normalize } from "@/lib/text"
import { defectStatusLabel } from "@/lib/labels"
import { ResultBadge } from "@/components/status-pills"
import { useRouteParam, useWorkspace } from "@/components/use-workspace"
import { product } from "@/lib/product"
import type { CaseDraft, TestCase } from "@/lib/types"

function toDraft(testCase: TestCase): CaseDraft {
  return {
    suiteId: testCase.suiteId,
    title: testCase.title,
    preconditions: testCase.preconditions,
    steps: testCase.steps.map((step) => ({ ...step })),
    priority: testCase.priority,
    severity: testCase.severity,
    kind: testCase.kind,
    executionType: testCase.executionType,
    tags: [...testCase.tags],
    status: testCase.status,
    sprintIds: [...testCase.sprintIds],
    requirementIds: [...(testCase.requirementIds ?? [])],
    automationStatus: testCase.automationStatus ?? "candidato",
    automationRef: testCase.automationRef ?? "",
  }
}

function blank(suiteId: string): CaseDraft {
  return {
    suiteId,
    title: "",
    preconditions: "",
    steps: [{ id: "st_draft", action: "", expected: "" }],
    priority: "media",
    severity: "mayor",
    kind: "funcional",
    executionType: "manual",
    tags: [],
    status: "borrador",
    sprintIds: [],
    requirementIds: [],
    automationStatus: "candidato",
    automationRef: "",
  }
}

export function CaseEditor() {
  const router = useRouter()
  const caseId = useRouteParam("caseId") ?? ""
  const { store, data, project } = useWorkspace()
  const isNew = caseId === "nuevo"
  const testCase =
    data && project && !isNew
      ? data.cases.find((item) => item.id === caseId && item.projectId === project.id)
      : undefined
  const suites = data && project ? data.suites.filter((item) => item.projectId === project.id) : []
  const sprints = data && project ? data.sprints.filter((item) => item.projectId === project.id) : []
  const flat = project ? flattenSuites(data?.suites ?? [], project.id) : []
  const loadKey = `${project?.id ?? ""}:${caseId}`
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<CaseDraft | null>(null)
  const [baseline, setBaseline] = useState("")
  const [tagDraft, setTagDraft] = useState("")
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [creatingSuite, setCreatingSuite] = useState(false)
  const [suiteName, setSuiteName] = useState("")

  if (project && loadedKey !== loadKey) {
    setLoadedKey(loadKey)
    if (isNew) {
      const preferred = suites.find((suite) => suite.id === store.preferredSuiteId)?.id ?? suites[0]?.id ?? ""
      const next = blank(preferred)
      setDraft(next)
      setBaseline(JSON.stringify(next))
    } else if (testCase) {
      const next = toDraft(testCase)
      setDraft(next)
      setBaseline(JSON.stringify(next))
    } else {
      setDraft(null)
      setBaseline("")
    }
  }

  const dirty = draft ? JSON.stringify(draft) !== baseline : false

  useEffect(() => {
    if (!project) return
    const code = testCase ? caseCode(project.key, testCase.number, testCase.idPrefix, testCase.customId) : "Nuevo caso"
    const title = draft?.title.trim() || "Sin título"
    document.title = `${isNew ? "Nuevo caso" : `${code} ${title}`} · ${product.name}`
  }, [project, testCase, draft?.title, isNew])

  useEffect(() => {
    if (!dirty) return
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", onLeave)
    return () => window.removeEventListener("beforeunload", onLeave)
  }, [dirty])

  if (!data || !project) return <MissingProject />

  if (!isNew && !testCase) {
    return (
      <div className="p-4 md:p-6">
        <EmptyCase
          title="No encontramos este caso"
          body="Puede que lo hayas eliminado."
          href={`/proyectos/${project.id}/casos`}
        />
      </div>
    )
  }

  if (isNew && suites.length === 0) {
    return (
      <div className="mx-auto grid w-full max-w-lg gap-4 p-4 md:p-6">
        <PageHeader
          title="Nuevo caso"
          description="Primero crea una suite para guardarlo."
        />
        <FormField label="Nombre de la suite" htmlFor="first-suite">
          <Input
            id="first-suite"
            value={suiteName}
            onChange={(event) => setSuiteName(event.target.value)}
            placeholder="Login"
          />
        </FormField>
        <Button
          disabled={creatingSuite}
          onClick={() => {
            try {
              const created = store.createSuite({
                projectId: project.id,
                parentId: null,
                name: suiteName,
                description: "",
              })
              store.setPreferredSuiteId(created.id)
              setCreatingSuite(true)
            } catch (error) {
              reportError(error)
            }
          }}
        >
          Crear suite y seguir
        </Button>
      </div>
    )
  }

  if (!draft) return null

  const code = testCase ? caseCode(project.key, testCase.number, testCase.idPrefix, testCase.customId) : "Nuevo"
  const knownTags = [...new Set(data.cases.filter((item) => item.projectId === project.id).flatMap((item) => item.tags))]

  function update(patch: Partial<CaseDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }

  function save() {
    if (!draft || !project) return
    const suiteId = draft.suiteId || flat[0]?.suite.id || ""
    const payload = { ...draft, suiteId }
    try {
      if (isNew) {
        const created = store.createCase(project.id, payload)
        toast.success("Caso creado")
        const next = toDraft(created)
        setDraft(next)
        setBaseline(JSON.stringify(next))
        router.replace(`/proyectos/${project.id}/casos/${created.id}`)
      } else {
        store.updateCase(caseId, payload)
        const saved = JSON.stringify(draft)
        setBaseline(saved)
        toast.success("Caso guardado")
      }
    } catch (error) {
      reportError(error)
    }
  }

  function addTag() {
    const tag = tagDraft.trim()
    if (!tag || !draft) return
    if (draft.tags.some((item) => normalize(item) === normalize(tag))) {
      setTagDraft("")
      return
    }
    update({ tags: [...draft.tags, tag] })
    setTagDraft("")
  }

  return (
    <form
      className="mx-auto my-3 grid w-full min-w-0 max-w-screen-2xl gap-5 rounded-2xl border border-border/80 bg-card p-4 shadow-lg shadow-slate-900/[0.035] sm:my-4 sm:p-5 md:my-5 md:p-7 xl:p-8"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault()
          save()
        }
      }}
    >
      <PageHeader
        title={isNew ? "Nuevo caso" : code}
        description={testCase ? `Actualizado ${formatDateTime(testCase.updatedAt)}` : "Todavía no está guardado."}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (dirty) setLeaveOpen(true)
                else router.push(`/proyectos/${project.id}/casos`)
              }}
            >
              Volver
            </Button>
            {!isNew ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  try {
                    const copy = store.duplicateCase(caseId)
                    router.push(`/proyectos/${project.id}/casos/${copy.id}`)
                  } catch (error) {
                    reportError(error)
                  }
                }}
              >
                Duplicar
              </Button>
            ) : null}
            {!isNew ? (
              <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
                Eliminar
              </Button>
            ) : null}
            <Button type="submit">{isNew ? "Crear caso" : "Guardar"}</Button>
          </>
        }
      />

      <FormField label="Título" htmlFor="case-title">
        <Input
          id="case-title"
          value={draft.title}
          autoFocus
          onChange={(event) => update({ title: event.target.value })}
          placeholder="Qué tiene que poder hacer la persona"
        />
      </FormField>

      <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
        <FormField label="Suite">
          <EnumSelect
            value={draft.suiteId || flat[0]?.suite.id || "missing"}
            onChange={(suiteId) => update({ suiteId })}
            options={flat.map((row) => ({
              value: row.suite.id,
              label: `${"— ".repeat(row.depth)}${row.suite.name}`,
            }))}
          />
        </FormField>
        <FormField label="Estado">
          <EnumSelect
            value={draft.status}
            onChange={(status) => update({ status })}
            options={caseStatuses.map((item) => ({ value: item, label: caseStatusLabel[item] }))}
          />
        </FormField>
        <FormField label="Prioridad">
          <EnumSelect
            value={draft.priority}
            onChange={(priority) => update({ priority })}
            options={priorities.map((item) => ({ value: item, label: priorityLabel[item] }))}
          />
        </FormField>
        <FormField label="Severidad">
          <EnumSelect
            value={draft.severity}
            onChange={(severity) => update({ severity })}
            options={severities.map((item) => ({ value: item, label: severityLabel[item] }))}
          />
        </FormField>
        <FormField label="Tipo">
          <EnumSelect
            value={draft.kind}
            onChange={(kind) => update({ kind })}
            options={kinds.map((item) => ({ value: item, label: kindLabel[item] }))}
          />
        </FormField>
        <FormField label="Ejecución" hint="Manual, automatizado o ambos. El tablero usa este dato para la cobertura.">
          <EnumSelect
            value={draft.executionType}
            onChange={(executionType) => update({ executionType })}
            options={executionTypes.map((item) => ({ value: item, label: executionLabel[item] }))}
          />
        </FormField>
      </div>

      <FormField label="Sprints" hint="Un caso puede entrar en más de un sprint.">
        {sprints.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este proyecto no tiene sprints.{" "}
            <Link href={`/proyectos/${project.id}/sprints`} className="text-primary underline-offset-2 hover:underline">
              Crear un sprint
            </Link>
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {sprints.map((sprint) => {
              const checked = draft.sprintIds.includes(sprint.id)
              return (
                <label key={sprint.id} className="flex items-start gap-2 rounded-lg border px-3 py-2">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      const on = value === true
                      update({
                        sprintIds: on
                          ? [...draft.sprintIds, sprint.id]
                          : draft.sprintIds.filter((id) => id !== sprint.id),
                      })
                    }}
                  />
                  <span>
                    <span className="block text-sm">{sprint.name}</span>
                    <span className="block text-xs text-muted-foreground">{sprint.goal}</span>
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </FormField>

      <section className="grid gap-3 rounded-xl border border-border/80 bg-muted/35 p-4">
        <h2 className="font-medium">Trazabilidad y automatización</h2>
        <FormField label="Requisitos / historias" hint="IDs de Azure DevOps u otros requisitos del proyecto.">
          <div className="grid gap-2">
            {(data.requirements ?? []).filter((item) => item.projectId === project.id).map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={draft.requirementIds.includes(item.id)} onCheckedChange={(value) => update({ requirementIds: value === true ? [...draft.requirementIds, item.id] : draft.requirementIds.filter((id) => id !== item.id) })} />
                <span>{item.key ? `${item.key} · ` : ""}{item.title}</span>
              </label>
            ))}
            {(data.requirements ?? []).filter((item) => item.projectId === project.id).length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay requisitos registrados.</p> : null}
          </div>
        </FormField>
        <FormField label="Estado de automatización">
          <EnumSelect value={draft.automationStatus} onChange={(automationStatus) => update({ automationStatus })} options={[{value:"candidato",label:"Candidato"},{value:"planeado",label:"Planeado"},{value:"automatizado",label:"Automatizado"},{value:"no_aplica",label:"No aplica"}]} />
        </FormField>
        <FormField label="Referencia de Playwright" hint="Ruta o nombre del test en el repositorio; por ejemplo tests/checkout.spec.ts.">
          <Input value={draft.automationRef} onChange={(event) => update({ automationRef: event.target.value })} placeholder="tests/checkout.spec.ts" />
        </FormField>
      </section>

      <FormField label="Etiquetas">
        <div className="flex flex-wrap gap-2">
          {draft.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                className="text-muted-foreground"
                aria-label={`Quitar ${tag}`}
                onClick={() => update({ tags: draft.tags.filter((item) => item !== tag) })}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagDraft}
            list="case-tags"
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                addTag()
              }
            }}
            placeholder="Agregar etiqueta y pulsar Enter"
            aria-label="Nueva etiqueta"
          />
          <Button type="button" variant="outline" onClick={addTag}>
            Agregar
          </Button>
        </div>
        <datalist id="case-tags">
          {knownTags.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      </FormField>

      <FormField label="Precondiciones" htmlFor="preconditions">
        <Textarea
          id="preconditions"
          value={draft.preconditions}
          onChange={(event) => update({ preconditions: event.target.value })}
          placeholder="En qué estado está el sistema antes del primer paso"
        />
      </FormField>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Pasos</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              update({
                steps: [...draft.steps, { id: createId("st"), action: "", expected: "" }],
              })
            }
          >
            <Plus />
            Agregar paso
          </Button>
        </div>
        {draft.steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este caso no tiene pasos.</p>
        ) : (
          draft.steps.map((step, index) => (
            <div key={step.id} className="grid gap-3 rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">Paso {index + 1}</p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Subir paso"
                    disabled={index === 0}
                    onClick={() => {
                      const steps = draft.steps.slice()
                      const [item] = steps.splice(index, 1)
                      steps.splice(index - 1, 0, item)
                      update({ steps })
                    }}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Bajar paso"
                    disabled={index === draft.steps.length - 1}
                    onClick={() => {
                      const steps = draft.steps.slice()
                      const [item] = steps.splice(index, 1)
                      steps.splice(index + 1, 0, item)
                      update({ steps })
                    }}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Eliminar paso"
                    onClick={() => update({ steps: draft.steps.filter((item) => item.id !== step.id) })}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <FormField label="Acción" htmlFor={`action-${step.id}`}>
                <Textarea
                  id={`action-${step.id}`}
                  value={step.action}
                  onChange={(event) =>
                    update({
                      steps: draft.steps.map((item) =>
                        item.id === step.id ? { ...item, action: event.target.value } : item,
                      ),
                    })
                  }
                />
              </FormField>
              <FormField label="Resultado esperado" htmlFor={`expected-${step.id}`}>
                <Textarea
                  id={`expected-${step.id}`}
                  value={step.expected}
                  onChange={(event) =>
                    update({
                      steps: draft.steps.map((item) =>
                        item.id === step.id ? { ...item, expected: event.target.value } : item,
                      ),
                    })
                  }
                />
              </FormField>
            </div>
          ))
        )}
      </div>

      <div className="grid gap-2">
        <h2 className="text-sm font-medium">Adjuntos</h2>
        <p className="text-xs text-muted-foreground">Imagen o archivo de hasta 350 KB. Se guarda con el caso.</p>
        {testCase ? (
          <>
            {testCase.attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Este caso no tiene adjuntos.</p>
            ) : (
              <ul className="grid gap-2">
                {testCase.attachments.map((file) => (
                  <li key={file.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <a className="break-all underline-offset-2 hover:underline" href={file.dataUrl} download={file.name}>
                      {file.name}
                    </a>
                    <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => store.removeCaseAttachment(testCase.id, file.id)}>
                      Quitar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <FilePicker
              label="Adjuntar archivo"
              onFile={(file) => {
                readAttachment(file)
                  .then((attachment) => store.addCaseAttachment(testCase.id, attachment))
                  .catch(reportError)
              }}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Guarda el caso para poder adjuntar archivos.</p>
        )}
      </div>

      {testCase ? (
        <div className="grid gap-4">
          <section className="grid gap-2">
            <h2 className="text-sm font-medium">Historial de cambios</h2>
            {testCase.changes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay cambios registrados.</p>
            ) : (
              <ul className="grid gap-2">
                {[...testCase.changes].reverse().map((change) => (
                  <li key={change.id} className="text-sm">
                    <span className="text-muted-foreground">{formatDateTime(change.at)} · </span>
                    {change.summary}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="grid gap-2">
            <h2 className="text-sm font-medium">Ejecuciones</h2>
            {data.runs.filter((run) => run.results.some((result) => result.caseId === testCase.id)).length === 0 ? (
              <p className="text-sm text-muted-foreground">Este caso todavía no entra en una corrida.</p>
            ) : (
              <ul className="grid gap-2">
                {data.runs
                  .filter((run) => run.projectId === project.id && run.results.some((result) => result.caseId === testCase.id))
                  .map((run) => {
                    const result = run.results.find((item) => item.caseId === testCase.id)
                    const who = data.members.find((item) => item.id === (result?.assigneeId ?? run.assigneeId))
                    if (!result) return null
                    return (
                      <li key={run.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{formatDateTime(run.createdAt)}</span>
                        <Link href={`/proyectos/${project.id}/corridas/${run.id}`} className="underline-offset-2 hover:underline">
                          {run.name}
                        </Link>
                        <ResultBadge status={result.status} />
                        <span className="text-muted-foreground">{who ? who.name : "Sin responsable"}</span>
                      </li>
                    )
                  })}
              </ul>
            )}
          </section>
          <section className="grid gap-2">
            <h2 className="text-sm font-medium">Defectos</h2>
            {data.defects.filter((item) => item.caseId === testCase.id).length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay defectos ligados a este caso.</p>
            ) : (
              <ul className="grid gap-2">
                {data.defects
                  .filter((item) => item.caseId === testCase.id)
                  .map((defect) => (
                    <li key={defect.id} className="text-sm">
                      {defect.title} · {defectStatusLabel[defect.status]}
                      {defect.externalUrl ? (
                        <>
                          {" · "}
                          <a className="underline-offset-2 hover:underline" href={defect.externalUrl} target="_blank" rel="noreferrer">
                            Enlace
                          </a>
                        </>
                      ) : null}
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <p className="min-w-0 text-xs text-muted-foreground">
          {dirty ? "Hay cambios sin guardar." : "Sin cambios pendientes."} Ctrl + Enter guarda.
        </p>
        <Button className="shrink-0" type="submit">{isNew ? "Crear caso" : "Guardar"}</Button>
      </div>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hay cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>Si sales ahora, se pierden los cambios de este caso.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push(`/proyectos/${project.id}/casos`)}>
              Salir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se quita de las corridas del proyecto. El número no se reutiliza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                store.deleteCases([caseId])
                router.push(`/proyectos/${project.id}/casos`)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}

function EmptyCase({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-card px-6 py-10 text-center">
      <h1 className="text-base font-medium">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <Button asChild className="mt-4">
        <Link href={href}>Volver a casos</Link>
      </Button>
    </div>
  )
}
