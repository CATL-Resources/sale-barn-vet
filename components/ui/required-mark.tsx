/**
 * The one "this field is required" marker: a small gold star.
 * Used by the chute capture screen and by Barn Settings, so the two agree.
 * This is display only — it does not decide whether a field is required.
 */
export function RequiredMark() {
  return (
    <span
      role="img"
      aria-label="required"
      title="Required"
      style={{ color: '#F3D12A', fontSize: 12, fontWeight: 800, lineHeight: 1 }}
    >
      ★
    </span>
  )
}
