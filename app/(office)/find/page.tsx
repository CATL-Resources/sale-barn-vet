import type { Metadata } from 'next'
import { FindAnimal } from '@/components/find/find-animal'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Find animal' }

// Dedicated "find animal" screen at /find. Reachable by URL now; a header entry
// point can be added once the overall navigation is settled. The (office) layout
// guards auth and gives it a responsive full-width container.
export default function FindPage() {
  return <FindAnimal />
}
