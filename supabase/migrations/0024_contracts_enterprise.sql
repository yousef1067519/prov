-- ══════════════════════════════════════════════════════════════════════
-- 0024 CONTRACTS MODULE (§5 / §8.5)
-- Lifecycle (draft → internal approval → sent → signed → executed),
-- version history, clause library (12 stock blocks seeded below),
-- BYO workspace templates, merge fields from deal records.
--
-- Storage: create a PRIVATE bucket named 'contracts' (uploads + executed
-- PDFs). Access only via signed URLs from the API.
-- ══════════════════════════════════════════════════════════════════════

-- ── Extend contracts for the enterprise lifecycle ────────────────────
alter table contracts add column if not exists deal_id uuid references deals(id) on delete set null;
alter table contracts add column if not exists version int not null default 1;
alter table contracts add column if not exists parent_contract_id uuid references contracts(id) on delete set null;
alter table contracts add column if not exists approved_by uuid;
alter table contracts add column if not exists approved_at timestamptz;
alter table contracts add column if not exists executed_pdf_path text;
alter table contracts add column if not exists merge_data jsonb not null default '{}';
alter table contracts add column if not exists title text;

-- Widen the status lifecycle (old check only knew draft/sent/signed).
alter table contracts drop constraint if exists contracts_status_check;
alter table contracts add constraint contracts_status_check
  check (status in ('draft','internal_approval','sent','signed','executed','void'));

create index if not exists idx_contracts_ws on contracts (workspace_id, status);
create index if not exists idx_contracts_deal on contracts (deal_id);

-- Workspace-scoped RLS replaces the single-user policy once 0020 is in.
drop policy if exists "own contracts" on contracts;
create policy contracts_read on contracts for select
  using (workspace_id in (select member_workspace_ids())
         or auth.uid() = user_id); -- legacy rows not yet stamped
create policy contracts_write on contracts for all
  using (role_in_workspace(workspace_id) in ('owner','admin','account_manager')
         or (workspace_id is null and auth.uid() = user_id))
  with check (role_in_workspace(workspace_id) in ('owner','admin','account_manager')
         or (workspace_id is null and auth.uid() = user_id));

-- ── Clause library ───────────────────────────────────────────────────
-- workspace_id null = Prov stock clause (readable by everyone, service-role
-- managed); workspace rows are the agency's own editable copies.
create table if not exists contract_clauses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  key text not null,
  title text not null,
  body_md text not null,
  sort int not null default 100,
  created_at timestamptz default now()
);
-- NULL workspace_id rows (stock clauses) must dedupe too — plain UNIQUE
-- treats NULLs as distinct, so use partial unique indexes instead.
create unique index if not exists uq_clauses_stock on contract_clauses (key) where workspace_id is null;
create unique index if not exists uq_clauses_ws on contract_clauses (workspace_id, key) where workspace_id is not null;
alter table contract_clauses enable row level security;
create policy clauses_read on contract_clauses for select
  using (workspace_id is null or workspace_id in (select member_workspace_ids()));
create policy clauses_write on contract_clauses for all
  using (workspace_id is not null and role_in_workspace(workspace_id) in ('owner','admin','account_manager'))
  with check (workspace_id is not null and role_in_workspace(workspace_id) in ('owner','admin','account_manager'));

-- ── BYO workspace templates ──────────────────────────────────────────
create table if not exists workspace_contract_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  kind text not null default 'prov' check (kind in ('prov','uploaded')),
  body_md text,           -- prov-kind templates: markdown with {{merge_fields}}
  file_path text,         -- uploaded-kind: .docx/.pdf object in 'contracts' bucket
  merge_fields jsonb not null default '[]',
  clause_keys jsonb not null default '[]',  -- which clause blocks compose it
  created_at timestamptz default now()
);
alter table workspace_contract_templates enable row level security;
create policy wct_read on workspace_contract_templates for select
  using (workspace_id in (select member_workspace_ids()));
create policy wct_write on workspace_contract_templates for all
  using (role_in_workspace(workspace_id) in ('owner','admin','account_manager'))
  with check (role_in_workspace(workspace_id) in ('owner','admin','account_manager'));

-- ── Seed: 12 stock clause blocks ─────────────────────────────────────
-- Professional starting points, not legal advice. {{fields}} merge from deals.
insert into contract_clauses (workspace_id, key, title, body_md, sort) values
(null, 'parties_scope', 'Parties & Scope',
'This Influencer Marketing Agreement ("Agreement") is entered into as of {{effective_date}} between {{agency_name}}, acting on behalf of {{brand}} ("Brand"), and {{creator_name}} ("Creator").

The Creator agrees to produce and publish the sponsored content described in this Agreement, and only that content. Work outside the Deliverables section — additional posts, appearances, usage, or exclusivity — requires a written amendment signed by both parties.', 10),

(null, 'deliverables', 'Deliverables',
'Creator will produce and publish the following deliverables:

{{deliverables}}

For each deliverable, the platform, format, quantity, minimum duration or dimensions, publish date or window, required tags and hashtags, and key messaging are as specified above. A deliverable is complete only when published as specified and remaining live for the minimum period stated. Draft content is due to Brand no later than five (5) business days before the scheduled publish date unless stated otherwise.', 20),

(null, 'compensation', 'Compensation',
'Brand will pay Creator a total fee of {{deal_value}} ({{currency}}), structured as: fifty percent (50%) within seven (7) days of both parties signing this Agreement, and fifty percent (50%) within fifteen (15) days of completion of all Deliverables.

Payment is by {{payment_method}}. Late payments accrue interest at 1.5% per month or the maximum permitted by law, whichever is lower. Fees stated are inclusive of all Creator costs unless an expense budget is itemized in this Agreement.', 30),

(null, 'usage_ip', 'Usage & Intellectual Property',
'Creator retains ownership of the content. Creator grants Brand a non-exclusive, non-transferable license to repost and share the published content on Brand''s own social channels, with attribution, for twelve (12) months from publication, in {{territory}}.

Paid amplification (allowlisting/boosting), use in other advertising, website, or email marketing, and any modification of the content each require separate written permission and may carry additional fees. Creator will keep the content live on their feed for a minimum of ninety (90) days.', 40),

(null, 'exclusivity', 'Exclusivity',
'For {{exclusivity_days}} days following the final publish date, Creator will not create sponsored content within the following product category: {{exclusivity_category}}.

Exclusivity is limited to that named category — not to a list of competitor brands, and not to organic (unpaid) mentions. Broader or longer exclusivity requires additional compensation agreed in writing.', 50),

(null, 'ftc_disclosure', 'FTC Disclosure',
'All published deliverables must include a clear and conspicuous material-connection disclosure compliant with the FTC''s Endorsement Guides (16 CFR Part 255): "#ad" or "Paid partnership" must appear in the first line of the caption before any "more" fold; video deliverables must include a verbal or on-screen disclosure within the first frame or opening statement; platform-native paid-partnership tags must be enabled where available.

Creator will not publish any deliverable missing the required disclosure. Each party is responsible for its own compliance; Creator indemnifies Brand for disclosures Creator omits after written instruction, and Brand indemnifies Creator for disclosure language Brand instructed in writing. Both parties acknowledge that regulators may hold agency, brand, and creator jointly responsible.', 60),

(null, 'approval_revisions', 'Content Approval & Revisions',
'Creator will submit each draft deliverable via {{submission_method}}. Brand has three (3) business days from receipt to approve in writing or request revisions; silence is NOT approval — a deliverable may only be published after written approval.

The fee includes up to two (2) rounds of revisions per deliverable, limited to conformity with the brief and this Agreement. Revisions that change the approved creative direction are new work, billed separately at Creator''s standard rate.', 70),

(null, 'kill_fee', 'Cancellation & Kill Fee',
'If Brand cancels after brief approval but before draft delivery, Brand will pay fifty percent (50%) of the total fee. If Brand cancels after Creator has delivered a draft, Brand will pay one hundred percent (100%) of the total fee. Amounts already paid count toward the kill fee.

If Creator cancels other than for Brand''s breach or a Force Majeure event, Creator will refund all amounts paid for undelivered deliverables within fifteen (15) days.', 80),

(null, 'ai_synthetic_media', 'AI & Synthetic Media',
'Creator warrants that deliverables will not contain fabricated endorsements, undisclosed AI-generated performances, or synthetic ("deepfake") depictions of any person. If generative-AI tools materially contribute to the visible or audible content of a deliverable, Creator will disclose that use to Brand in writing before submission, and in the published content where required by platform policy or applicable law.

Brand will not use AI tools to alter Creator''s likeness, voice, or statements beyond ordinary editing without Creator''s prior written consent.', 90),

(null, 'morals_termination', 'Conduct & Termination',
'Either party may terminate for material breach uncured within ten (10) days of written notice. Brand may terminate immediately if Creator commits a criminal act, or publishes statements that are hateful, discriminatory, or fraudulent, such that continued association is reasonably likely to materially damage Brand''s reputation — this clause applies to specific conduct, not to lawful personal opinions unrelated to the engagement.

Either party may terminate without cause on thirty (30) days'' written notice; the kill-fee schedule then applies. If a contracted platform materially ceases operating or bans the content category, the affected deliverables will be replaced with equivalents on a mutually agreed platform, or refunded pro-rata.', 100),

(null, 'dispute_law', 'Dispute Resolution & Governing Law',
'The parties will first attempt to resolve any dispute through good-faith negotiation for thirty (30) days, then through mediation before a mutually agreed mediator. Any dispute not resolved in mediation will be settled by binding arbitration under the rules of the American Arbitration Association, seated in {{jurisdiction}}, and judgment may be entered in any court of competent jurisdiction.

This Agreement is governed by the laws of {{jurisdiction}}, without regard to conflict-of-law rules. The prevailing party in arbitration may recover reasonable fees and costs.', 110),

(null, 'original_content_warranty', 'Original Content Warranty',
'Creator warrants that all deliverables are Creator''s original work or properly licensed, including music, footage, fonts, and imagery; that the deliverables do not infringe any third party''s intellectual-property, privacy, or publicity rights; and that Creator has and will maintain all releases needed for any person appearing in the content.

Creator will promptly replace any deliverable that a platform removes for rights violations, at no additional cost to Brand.', 120)
on conflict do nothing;
