-- Witness: keep the model's call immutable, and keep the original photographs.
--
-- Additive only. Safe to run on the live project; the app works before and
-- after it (the trigger fills the new columns, the app never writes them).
--
-- 1. findings.model_* hold what Stage-2 proposed. A BEFORE trigger copies them
--    from the row on INSERT and pins them to their old values on every UPDATE,
--    so an inspector's correction can change iso_mode/severity but never erase
--    the suggestion. (model, human) pairs are then a SELECT away.
-- 2. reviewed_at is stamped by the same trigger when a review lands.
-- 3. A private storage bucket holds the uploaded originals under
--    <tenant_id>/<sha256>.<ext>. Members may read and insert inside their own
--    tenant folder. There is no update or delete policy: evidence is append-only.

alter table witness.findings
  add column if not exists model_mode text,
  add column if not exists model_severity smallint,
  add column if not exists model_confidence real,
  add column if not exists reviewed_at timestamptz;

-- Rows that were never corrected still carry the model's call. Corrected rows
-- lost it before this migration existed; they stay null rather than guessed.
update witness.findings
   set model_mode = iso_mode,
       model_severity = severity,
       model_confidence = confidence
 where model_mode is null
   and review_state <> 'corrected';

create or replace function witness.keep_model_suggestion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.model_mode := coalesce(new.model_mode, new.iso_mode);
    new.model_severity := coalesce(new.model_severity, new.severity);
    new.model_confidence := coalesce(new.model_confidence, new.confidence);
  else
    new.model_mode := old.model_mode;
    new.model_severity := old.model_severity;
    new.model_confidence := old.model_confidence;
    if new.review_state in ('confirmed', 'corrected')
       and (new.review_state, new.iso_mode, new.severity, new.attribution)
           is distinct from (old.review_state, old.iso_mode, old.severity, old.attribution) then
      new.reviewed_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists findings_keep_model_suggestion on witness.findings;
create trigger findings_keep_model_suggestion
  before insert or update on witness.findings
  for each row execute function witness.keep_model_suggestion();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'witness-originals',
  'witness-originals',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif', 'image/tiff']
)
on conflict (id) do nothing;

drop policy if exists "witness originals: members read" on storage.objects;
create policy "witness originals: members read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'witness-originals'
    and witness.is_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "witness originals: members insert" on storage.objects;
create policy "witness originals: members insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'witness-originals'
    and witness.is_member(((storage.foldername(name))[1])::uuid)
  );
