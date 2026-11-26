"use client"

import { Button } from "@/components/ui/button"

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="text-lg font-semibold">Algo salió mal</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Recarga la vista o vuelve a intentarlo. Si el problema continúa, contacta al administrador.
      </p>
      <Button className="mt-4" onClick={reset}>
        Reintentar
      </Button>
    </div>
  )
}
