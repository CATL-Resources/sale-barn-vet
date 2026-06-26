'use client'

import { useEffect, useState } from 'react'
import type { BatchInfo, CaptureBootstrap } from '@/lib/capture/types'
import type { CapturedAnimal } from '@/lib/capture/save-animal'
import type { PenFieldDefaults } from '@/lib/capture/fields'
import { useCapture } from '@/lib/capture/use-capture'
import { unlockAudio } from '@/lib/capture/feedback'
import { StartBatch } from './start-batch'
import { CaptureForm } from './capture-form'
import { CloseOutSheet } from './close-out-sheet'
import { AnimalListSheet } from './animal-list-sheet'
import { AnimalEditSheet, type EditTarget } from './animal-edit-sheet'
import { CaptureToast } from './toast'
import { SaveConfirmBurst } from './save-confirm'
import { OptionPicker, type Option } from './sheets'

export function CaptureScreen({
  bootstrap,
  userId,
  initialBatch,
  penDefaults,
}: {
  bootstrap: CaptureBootstrap
  userId: string | null
  initialBatch?: { batch: BatchInfo; worked: number }
  penDefaults?: PenFieldDefaults
}) {
  const api = useCapture(bootstrap, userId, initialBatch, penDefaults)
  const [closeOutOpen, setCloseOutOpen] = useState(false)
  const [sortSheetOpen, setSortSheetOpen] = useState(false)
  const [animalsOpen, setAnimalsOpen] = useState(false)
  const [editing, setEditing] = useState<EditTarget | null>(null)
  // Bumped after a save/remove so the open animal list re-fetches.
  const [reloadKey, setReloadKey] = useState(0)

  // Unlock audio on the FIRST real tap or scan of the capture session. iOS only
  // lets web audio play if the shared AudioContext is created/resumed inside a
  // user gesture, so we build it here once and reuse it for every later beep.
  // (A wand scan arrives as keydown; a finger tap as pointerdown.)
  useEffect(() => {
    let done = false
    const unlock = () => {
      if (done) return
      done = true
      unlockAudio()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // Sort tap: toggle off when already sorted; quiet for 0–1 open pens; pick when many.
  function onTapSort() {
    if (api.draft.sortPenId) {
      api.clearSort()
      return
    }
    if (api.sortPens.length === 0) {
      void api.createSortPen('')
      return
    }
    if (api.sortPens.length === 1) {
      api.chooseSortPen(api.sortPens[0].id)
      return
    }
    setSortSheetOpen(true)
  }

  const sortOptions: Option[] = api.sortPens.map((p) => ({
    id: p.id,
    label: `Sort pen ${p.pen_number}`,
    sub: `${p.count} head so far`,
  }))

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {api.step === 'start' ? (
        <StartBatch bootstrap={bootstrap} onStart={api.startBatch} saving={api.saving} />
      ) : (
        <CaptureForm
          api={api}
          onOpenCloseOut={() => setCloseOutOpen(true)}
          onOpenAnimals={() => setAnimalsOpen(true)}
          onTapSort={onTapSort}
        />
      )}

      <CaptureToast toast={api.toast} onDismiss={api.dismissToast} />

      {/* The strong "Saved" burst. Keyed by the save id so it replays on every
          save, including rapid back-to-back ones. */}
      <SaveConfirmBurst key={api.saveConfirm?.id} confirm={api.saveConfirm} />

      {closeOutOpen && api.step === 'capture' && <CloseOutSheet api={api} onClose={() => setCloseOutOpen(false)} />}

      {api.step === 'capture' && (
        <AnimalListSheet
          api={api}
          open={animalsOpen}
          reloadKey={reloadKey}
          onClose={() => setAnimalsOpen(false)}
          onEdit={(animal: CapturedAnimal | null) => setEditing(animal ? { mode: 'edit', animal } : { mode: 'add' })}
        />
      )}

      {api.step === 'capture' && editing && (
        <AnimalEditSheet
          api={api}
          target={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            setReloadKey((k) => k + 1)
          }}
        />
      )}

      <OptionPicker
        open={sortSheetOpen}
        title="Sort Into Pen"
        options={sortOptions}
        selectedId={api.draft.sortPenId}
        searchable
        createLabel="New Pen"
        onCreate={(text) => {
          void api.createSortPen(text)
          setSortSheetOpen(false)
        }}
        onPick={(id) => {
          api.chooseSortPen(id)
          setSortSheetOpen(false)
        }}
        onClose={() => setSortSheetOpen(false)}
      />
    </div>
  )
}
