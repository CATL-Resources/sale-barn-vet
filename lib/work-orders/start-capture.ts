'use client'

import { startWorkOrder } from '@/app/(office)/work-list/actions'

/**
 * The shared "Work Cows" / "Start working" path, used by both the office Work
 * Orders screen and the chute Barn Work List: mark the order started (so it
 * reads In progress), then open Capture bound to that exact pen_work so animals
 * record into it. Same behavior in both places.
 */
export async function startCapture(penWorkId: string, navigate: (href: string) => void): Promise<void> {
  await startWorkOrder(penWorkId)
  navigate(`/capture?penWork=${penWorkId}`)
}
