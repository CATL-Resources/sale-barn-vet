// Multi-sensory "saved" feedback for the chute capture loop: a short beep and a
// short buzz. Both are best-effort and fire-and-forget — they must never throw
// and never block the next scan. The big on-screen confirmation is the only
// guaranteed channel (see components/capture/save-confirm.tsx); sound and buzz
// are extras that can be silently unavailable (the iOS mute switch silences web
// audio, iPhones have no Vibration API, some browsers have no Web Audio).

// One AudioContext is shared for the whole capture session. iOS only lets sound
// play if the context was created and resumed inside a real user gesture, so we
// build it on the first tap or scan (unlockAudio) and reuse it for every later
// beep.
let audioCtx: AudioContext | null = null
// Once we know audio can't work here, stop trying — don't rebuild it every save.
let audioBlocked = false

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

function getAudioContext(): AudioContext | null {
  if (audioBlocked) return null
  if (audioCtx) return audioCtx
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
  if (!Ctor) {
    audioBlocked = true
    return null
  }
  try {
    audioCtx = new Ctor()
    return audioCtx
  } catch {
    audioBlocked = true
    return null
  }
}

// Tie the shared AudioContext to a real user gesture. Call this from the first
// tap or scan of the capture session — iOS refuses to start audio outside a
// gesture. Safe to call more than once: it just resumes a suspended context.
export function unlockAudio(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {})
  }
}

// A short crisp beep (~100 ms) for a good save. Needs the device ringer on (the
// iOS mute switch silences web audio). Never throws; does nothing if audio
// couldn't initialize.
export function beepSaved(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    // If the context drifted back to suspended (e.g. tab refocus), nudge it.
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(920, now)
    // ~100 ms note with a fast attack and a quick decay so it reads as a clean
    // "tick" that cuts through barn noise, not a click or a drone.
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.4, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.12)
  } catch {
    // Best-effort only — a bad save is never worth an exception.
  }
}

// A short buzz for a good save. No-ops where the browser has no Vibration API
// (notably iPhone). Never throws and returns immediately, so it never slows the
// next scan.
const SAVED_BUZZ = [35]
export function buzzSaved(): void {
  try {
    if (typeof navigator === 'undefined') return
    if (typeof navigator.vibrate !== 'function') return
    navigator.vibrate(SAVED_BUZZ)
  } catch {
    // Best-effort only.
  }
}
