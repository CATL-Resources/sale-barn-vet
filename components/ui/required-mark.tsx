import { colors } from './tokens'

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

/**
 * The left accent for a required field, so the crew can see at a glance what's
 * still to fill: a thin bar that's amber while the field is empty and green once
 * it's answered. Drop it in as the first child of a field's flex row (it stretches
 * to the row's height). Display only — it does not decide whether a field is
 * required; the caller shows it only for fields that are.
 */
export function RequiredAccent({ filled }: { filled: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: 4,
        alignSelf: 'stretch',
        flexShrink: 0,
        borderRadius: 999,
        background: filled ? colors.success : colors.warning,
      }}
    />
  )
}
