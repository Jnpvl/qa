import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="text-lg font-semibold">Esta página no existe</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        El enlace no corresponde a un proyecto, un caso o una corrida.
      </p>
      <Link href="/" className={`${buttonVariants()} mt-4`}>
        Volver a proyectos
      </Link>
    </div>
  )
}
