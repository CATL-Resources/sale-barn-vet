// How a pen_work's status is derived — shared so the office Work Orders screen
// and the chute Barn Work List agree.
//
//   complete     — work_complete is true
//   in_progress  — not complete, but some work has started (head_started or
//                  head_worked > 0)
//   not_started  — not complete and nothing worked yet

export type WorkStatus = 'not_started' | 'in_progress' | 'complete'

export function deriveStatus(pw: {
  work_complete: boolean
  head_started: number | null
  head_worked: number | null
}): WorkStatus {
  if (pw.work_complete) return 'complete'
  if ((pw.head_worked ?? 0) > 0 || (pw.head_started ?? 0) > 0) return 'in_progress'
  return 'not_started'
}

export const STATUS_LABEL: Record<WorkStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete: 'Complete',
}
