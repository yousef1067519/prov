import { redirect } from 'next/navigation'

// ENTERPRISE (§8.1): the trial paywall is gone. Old links land on the demo flow.
export default function TrialEndedRedirect() {
  redirect('/demo')
}
