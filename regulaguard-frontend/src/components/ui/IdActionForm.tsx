import { useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Input } from './Input'

/** For agent actions whose target has no list endpoint yet: paste the record ID from another screen or the API. */
export function IdActionForm({
  label, placeholder, buttonLabel, onSubmit, pending, extra, hint,
}: {
  label: string
  placeholder?: string
  buttonLabel: string
  onSubmit: (id: string) => void
  pending?: boolean
  extra?: ReactNode
  hint?: string
}) {
  const [id, setId] = useState('')
  const valid = /^[0-9a-fA-F-]{36}$/.test(id.trim())
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-80 max-w-full">
        <Input label={label} placeholder={placeholder ?? '00000000-0000-0000-0000-000000000000'} value={id} onChange={(e) => setId(e.target.value)} hint={hint} error={id && !valid ? 'Enter a full record ID' : undefined} />
      </div>
      {extra}
      <Button disabled={!valid} isLoading={pending} onClick={() => onSubmit(id.trim())}>{buttonLabel}</Button>
    </div>
  )
}
