import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'

type Decision = 'approve' | 'reject' | 'modify'

/**
 * Explicit human-review controls. Every decision asks for confirmation and an
 * optional note, so no AI suggestion is accepted or rejected by a stray click.
 */
export function ReviewActions({
  onDecide,
  pending,
  allowModify,
  modifyInitialText,
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  disabled,
}: {
  onDecide: (decision: Decision, notes: string, modifiedText?: string) => void
  pending?: boolean
  allowModify?: boolean
  modifyInitialText?: string
  approveLabel?: string
  rejectLabel?: string
  disabled?: boolean
}) {
  const [decision, setDecision] = useState<Decision | null>(null)
  const [notes, setNotes] = useState('')
  const [text, setText] = useState(modifyInitialText ?? '')

  const close = () => { setDecision(null); setNotes('') }
  const titles: Record<Decision, string> = { approve: approveLabel, reject: rejectLabel, modify: 'Edit and record as modified' }

  return (
    <>
      <div className="flex gap-1.5">
        <Button size="sm" variant="secondary" disabled={disabled} onClick={() => setDecision('approve')}><Check className="size-3.5" /> {approveLabel}</Button>
        {allowModify && <Button size="sm" variant="ghost" disabled={disabled} onClick={() => { setText(modifyInitialText ?? ''); setDecision('modify') }}><Pencil className="size-3.5" /> Edit</Button>}
        <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setDecision('reject')}><X className="size-3.5" /> {rejectLabel}</Button>
      </div>
      <Modal
        open={decision !== null}
        onClose={close}
        title={decision ? titles[decision] : ''}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={close}>Cancel</Button>
            <Button
              size="sm"
              variant={decision === 'reject' ? 'danger' : 'primary'}
              isLoading={pending}
              disabled={decision === 'modify' && text.trim().length < 10}
              onClick={() => { if (decision) { onDecide(decision, notes, decision === 'modify' ? text : undefined); close() } }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Your name and the time are recorded in the audit trail with this decision.</p>
          {decision === 'modify' && (
            <label className="block text-sm font-medium text-ink-700">
              Corrected text
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="focus-ring mt-1 w-full rounded-[var(--radius-card)] border border-ink-100 p-2 text-sm font-normal" />
            </label>
          )}
          <label className="block text-sm font-medium text-ink-700">
            Note (optional)
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="focus-ring mt-1 w-full rounded-[var(--radius-card)] border border-ink-100 p-2 text-sm font-normal" />
          </label>
        </div>
      </Modal>
    </>
  )
}
