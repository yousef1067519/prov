// Prov's real pipeline, in dot-notation. This is not decoration — these are
// the product's actual stages, so the landing animation is an honest demo.
export interface Stage {
  key: string        // dot-notation step name
  role: string       // sub-label: which part of the product runs it
  log: string        // one log line emitted while running
  detail: string     // hover / expanded description
}

export const STAGES: Stage[] = [
  {
    key: 'intake.brief',
    role: 'parsing / requirements',
    log: 'brief parsed — niche, budget, deliverables, window',
    detail: 'Reads the campaign brief and turns it into structured requirements.',
  },
  {
    key: 'research.creators',
    role: 'discovery / quality score',
    log: 'shortlist built — vetted, quality-scored, overlap-checked',
    detail: 'Curated discovery with vetting status, quality scores, and audience-overlap warnings.',
  },
  {
    key: 'match.sponsors',
    role: 'matching / fit analysis',
    log: 'sponsor fit ranked against past deal outcomes',
    detail: 'Aligns sponsor fit using what your agency has already learned in Intelligence.',
  },
  {
    key: 'draft.outreach',
    role: 'writing / approved sequence',
    log: 'sequence queued — workspace-approved messaging',
    detail: 'Every account manager sends from approved sequences, so quality never depends on who is working the account.',
  },
  {
    key: 'generate.contract',
    role: 'clauses / merge fields',
    log: 'agreement assembled — 12 clause blocks, deal terms merged',
    detail: 'Contracts composed from your clause library with deliverables, compensation, FTC disclosure, and kill fees filled from the deal.',
  },
  {
    key: 'track.deal',
    role: 'pipeline / stage control',
    log: 'deal moved: negotiating → contract → live',
    detail: 'A multi-stage pipeline with anti-collision guardrails — no double-pitching the same creator.',
  },
  {
    key: 'log.performance',
    role: 'intelligence / permanent record',
    log: 'outcome banked — owned by your agency, forever',
    detail: 'The completed deal becomes a permanent, searchable intelligence record that survives employee turnover.',
  },
]
