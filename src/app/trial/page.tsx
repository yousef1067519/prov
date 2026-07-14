import { redirect } from 'next/navigation'

// ENTERPRISE (§8.1): self-serve trial removed — sales-led demo flow instead.
// Route kept as a redirect so old links/ads don't 404.
export default function TrialRedirect() {
  redirect('/demo')
}
