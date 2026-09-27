-- Witness: clear out abandoned demo workspaces.
--
-- Every "Enter the demo workspace" click signs in anonymously and mints a
-- tenant (seeded with demo findings since 2026-09-27). Nobody can come back to
-- an anonymous session once its cookie is gone, so those tenants only grow the
-- database. This deletes tenants whose every member is an anonymous user older
-- than p_age, children first, and returns how many tenants went.
--
-- Review before applying: the delete order follows the tables the app uses
-- (see README, "The data model"). A table added later that references tenants
-- without ON DELETE CASCADE will make the tenant delete fail loudly, which is
-- the safe failure. Originals in the witness-originals bucket are not removed
-- here; Supabase requires the Storage API for that, not SQL.

create or replace function witness.purge_anonymous_tenants(p_age interval default interval '7 days')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  doomed uuid[];
begin
  select coalesce(array_agg(t.id), '{}')
    into doomed
    from witness.tenants t
   where exists (select 1 from witness.memberships m where m.tenant_id = t.id)
     and not exists (
       select 1
         from witness.memberships m
         join auth.users u on u.id = m.user_id
        where m.tenant_id = t.id
          and (u.is_anonymous is not true or u.created_at > now() - p_age)
     );

  if cardinality(doomed) = 0 then
    return 0;
  end if;

  delete from witness.finding_batch fb
   using witness.findings f
   where fb.finding_id = f.id and f.tenant_id = any (doomed);
  delete from witness.findings where tenant_id = any (doomed);
  delete from witness.assets where tenant_id = any (doomed);
  delete from witness.enrolments e
   using witness.part_families pf
   where e.part_family_id = pf.id and pf.tenant_id = any (doomed);
  delete from witness.part_families where tenant_id = any (doomed);
  delete from witness.batches where tenant_id = any (doomed);
  delete from witness.audit_events where tenant_id = any (doomed);
  delete from witness.memberships where tenant_id = any (doomed);
  delete from witness.tenants where id = any (doomed);

  return cardinality(doomed);
end;
$$;

-- Only the scheduler (or an operator in the SQL editor) runs this.
revoke all on function witness.purge_anonymous_tenants(interval) from public;
revoke all on function witness.purge_anonymous_tenants(interval) from anon, authenticated;

-- Nightly at 03:17 UTC, when pg_cron is enabled on the project. Without it,
-- run `select witness.purge_anonymous_tenants();` by hand.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'witness-purge-anonymous';
    perform cron.schedule(
      'witness-purge-anonymous',
      '17 3 * * *',
      'select witness.purge_anonymous_tenants()'
    );
  end if;
end;
$$;
