'use client'

// Workflows home — build and manage guided routines. Running one hands off to
// the Performance Tracker, which hosts the step runner.

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardShell from '../DashboardShell'
import WorkflowsTab, { type Workflow } from '../performance/WorkflowsTab'

export default function WorkflowsPage() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<Workflow[]>([])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/performance/workflows')
      const d = await res.json()
      if (Array.isArray(d.workflows)) setWorkflows(d.workflows)
    } catch { /* table may not exist yet */ }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <DashboardShell active="workflows">
      <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
        <div style={{ padding: '32px 24px', maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f5f5f5' }}>Workflows</h1>
            <p style={{ color: '#666', fontSize: '0.9375rem', marginTop: 4 }}>
              Your repeatable routines — each one walks you step by step through logging results, building proof, and getting it in front of brands.
            </p>
          </div>
          <WorkflowsTab
            workflows={workflows}
            reload={load}
            onRun={w => router.push(`/dashboard/performance?workflow=${w.id}`)}
          />
        </div>
      </div>
    </DashboardShell>
  )
}
