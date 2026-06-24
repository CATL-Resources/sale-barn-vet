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

// The office line-status lifecycle, layered on top of the chute work status.
// 'clean' and 'needs_resolution' are DERIVED from the counts (a worked count
// that differs from the ordered/expected count needs resolution; a match is
// clean) — a soft to-do, never a block. 'resolved' and 'billed' are sticky
// stored states that win over the derived flag. 'open'/'worked' are the
// pre-resolution stored states (e.g. before an expected count is set).
export type LineStatus = 'open' | 'worked' | 'clean' | 'needs_resolution' | 'resolved' | 'billed'

export function deriveLineStatus(pw: {
  line_status: string
  head_worked: number | null
  head_expected: number | null
}): LineStatus {
  if (pw.line_status === 'resolved' || pw.line_status === 'billed') return pw.line_status
  const w = pw.head_worked
  const e = pw.head_expected
  if (w != null && e != null) return w === e ? 'clean' : 'needs_resolution'
  return (pw.line_status as LineStatus) || 'open'
}

export const LINE_STATUS_LABEL: Record<LineStatus, string> = {
  open: 'Open',
  worked: 'Worked',
  clean: 'Clean',
  needs_resolution: 'Needs Resolution',
  resolved: 'Resolved',
  billed: 'Billed',
}
