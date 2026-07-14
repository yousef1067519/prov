-- ══════════════════════════════════════════════════════════════════════
-- 0026 FTC COMPLIANCE MODULE (§4.6 / §8.7)
-- Disclosure requirements per deal deliverable, proof-of-disclosure
-- storage, missing-disclosure flags, and an approval trail. FTC penalties
-- run tens of thousands per violation and agency + creator share
-- liability — this module is the audit surface that protects the agency.
--
-- Storage: create a PRIVATE bucket named 'compliance-proofs' in the
-- Supabase dashboard (Storage → New bucket → private). Uploads go through
-- signed upload URLs from /api/compliance/upload-url; reads through
-- signed GET URLs — the bucket must never be public.
-- ══════════════════════════════════════════════════════════════════════

create table if not exists deliverable_disclosures (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  deal_id uuid not null references deals(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  -- Which deliverable this covers (mirrors deals.deliverables[] by label).
  deliverable_label text not null,
  platform text,
  required_language text not null default '#ad in the first line of the caption',
  placement text not null default 'caption_first_line'
    check (placement in ('caption_first_line','video_first_frame','paid_partnership_tag','audio_disclosure','stream_overlay')),
  status text not null default 'pending'
    check (status in ('pending','live_unverified','verified','flagged')),
  posted_url text,
  proof_path text,          -- Storage object in compliance-proofs (screenshot/capture)
  notes text,
  verified_by uuid,         -- auth user who approved — the audit trail cares who and when
  verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_disclosures_ws_status on deliverable_disclosures (workspace_id, status);
create index if not exists idx_disclosures_deal on deliverable_disclosures (deal_id);

alter table deliverable_disclosures enable row level security;

-- Read: workspace members, client-scoped for client_viewers (same pattern as deals).
create policy disclosures_read on deliverable_disclosures for select
  using (workspace_id in (select member_workspace_ids())
         and (client_id is null and role_in_workspace(workspace_id) <> 'client_viewer'
              or client_id in (select visible_client_ids(workspace_id))));
-- Write: working roles only.
create policy disclosures_write on deliverable_disclosures for all
  using (role_in_workspace(workspace_id) in ('owner','admin','account_manager'))
  with check (role_in_workspace(workspace_id) in ('owner','admin','account_manager'));
