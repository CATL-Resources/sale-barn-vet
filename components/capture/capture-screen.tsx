'use client'

import { useState } from 'react'
import type { BatchInfo, CaptureBootstrap } from '@/lib/capture/types'
import { useCapture } from '@/lib/capture/use-capture'
import { StartBatch } from './start-batch'
import { CaptureForm } from './capture-form'
import { CloseOutSheet } from './close-out-sheet'
import { CaptureToast } from './toast'
import { OptionPicker, type Option } from './sheets'

export function CaptureScreen({
  bootstrap,
  userId,
  initialBatch,
}: {
  bootstrap: CaptureBootstrap
  userId: string | null
  initialBatch?: { batch: BatchInfo; worked: number }
}) {
  const api = useCapture(bootstrap, userId, initialBatch)
  const [closeOutOpen, setCloseOutOpen] = useState(false)
  const [sortSheetOpen, setSortSheetOpen] = useState(false)

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
        <CaptureForm api={api} onOpenCloseOut={() => setCloseOutOpen(true)} onTapSort={onTapSort} />
      )}

      <CaptureToast toast={api.toast} onDismiss={api.dismissToast} />

      {closeOutOpen && api.step === 'capture' && <CloseOutSheet api={api} onClose={() => setCloseOutOpen(false)} />}

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
