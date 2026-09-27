-- Witness: cases. A case is one returned part as the quality desk sees it: an
-- RMA number, who sent it back and why, how long it ran, the findings its
-- photographs produced, and the disposition the plant decided. Findings and
-- assets gain a nullable case_id; nothing existing changes meaning.

create table if not exists witness.cases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references witness.tenants (id) on delete cascade,
  rma text not null check (length(rma) between 1 and 64),
  customer text,
  part_serial text,
  part_family_id uuid references witness.part_families (id) on delete set null,
  run_hours integer check (run_hours >= 0),
  return_reason text,
  status text not null default 'open' check (status in ('open', 'inspecting', 'closed')),
  disposition text check (
    disposition in ('warranty_accepted', 'warranty_rejected', 'repair', 'scrap', 'return_to_supplier')
  ),
  notes text,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (tenant_id, rma)
);

create index if not exists cases_tenant_created_idx on witness.cases (tenant_id, created_at desc);

alter table witness.cases enable row level security;

drop policy if exists "cases: members read" on witness.cases;
create policy "cases: members read" on witness.cases
  for select to authenticated using (witness.is_member(tenant_id));

drop policy if exists "cases: members insert" on witness.cases;
create policy "cases: members insert" on witness.cases
  for insert to authenticated with check (witness.is_member(tenant_id));

drop policy if exists "cases: members update" on witness.cases;
create policy "cases: members update" on witness.cases
  for update to authenticated
  using (witness.is_member(tenant_id))
  with check (witness.is_member(tenant_id));

-- No delete policy: a case is part of the warranty record. Close it instead.

grant select, insert, update on witness.cases to authenticated;

alter table witness.findings
  add column if not exists case_id uuid references witness.cases (id) on delete set null;
alter table witness.assets
  add column if not exists case_id uuid references witness.cases (id) on delete set null;

create index if not exists findings_case_idx on witness.findings (case_id);
create index if not exists assets_case_idx on witness.assets (case_id);
