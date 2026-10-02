import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Hammer } from 'lucide-react'

/** Shown for areas whose backend read endpoints do not exist yet, instead of drawing screens with invented data. */
export default function NotAvailablePage({ title, missing }: { title: string; missing: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <EmptyState icon={<Hammer className="size-6" />} title="Waiting on a backend endpoint" description={missing} />
    </div>
  )
}
