import { redirect } from 'next/navigation'
import { apiCtx } from '@/lib/apiUser'
import SequencesLibrary from '../SequencesLibrary'

// §8.4 — /dashboard/templates is now the workspace Sequences library:
// team-standardized outreach with a draft → approved → archived flow.
export default async function TemplatesPage() {
  const ctx = await apiCtx()
  if (!ctx) redirect('/login')
  return <SequencesLibrary email={ctx.email ?? ''} accessType="lifetime" daysLeft={null} wsRole={ctx.wsRole} />
}
