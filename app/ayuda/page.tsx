import type { Metadata } from "next"
import { PageHeader } from "@/components/bits"
import { GlossaryContent } from "@/components/glossary-content"

export const metadata: Metadata = {
  title: "Ayuda",
}

export default function HelpPage() {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5 p-4 md:p-6">
      <PageHeader
        title="Ayuda"
        description="Qué es cada pieza del seguimiento y cómo se relacionan."
      />
      <GlossaryContent />
    </div>
  )
}
