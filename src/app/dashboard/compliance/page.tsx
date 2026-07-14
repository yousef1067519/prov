import DashboardShell from '../DashboardShell'
import ComplianceClient from './ComplianceClient'

// FTC compliance (§4.6): disclosure tracking, proof storage, exposure flags.
export default function CompliancePage() {
  return (
    <DashboardShell active="compliance">
      <ComplianceClient />
    </DashboardShell>
  )
}
