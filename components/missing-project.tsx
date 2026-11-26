"use client"

import Link from "next/link"
import { EmptyState } from "@/components/bits"
import { Button } from "@/components/ui/button"

export function MissingProject() {
  return (
    <div className="p-4 md:p-6">
      <EmptyState
        title="No encontramos este proyecto"
        body="Puede que lo hayas eliminado en este navegador."
        action={
          <Button asChild>
            <Link href="/">Ver proyectos</Link>
          </Button>
        }
      />
    </div>
  )
}
