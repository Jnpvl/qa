import type { Metadata } from "next"
import { RunPlayer } from "@/components/runs/run-player"

export const metadata: Metadata = { title: "Corrida" }

export default function RunPage() {
  return <RunPlayer />
}
