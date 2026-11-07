begin;

create table if not exists public.konsey_preview_rebuild (
  id boolean primary key default true check (id),
  revision bigint not null default 1,
  deployed_revision bigint not null default 0,
  requested_at timestamptz not null default now(),
  schedule_checked_at timestamptz not null default now(),
  lease_id uuid,
  lease_until timestamptz,
  attempts_day date not null default current_date,
  attempts integer not null default 0,
  status text not null default 'pending',
  last_run_id bigint,
  last_error text
);
alter table public.konsey_preview_rebuild enable row level security;
revoke all on public.konsey_preview_rebuild from public, anon, authenticated;
grant select, insert, update on public.konsey_preview_rebuild to service_role;
insert into public.konsey_preview_rebuild (id) values (true) on conflict do nothing;

create or replace function public.konsey_preview_revision()
returns text language sql stable security definer set search_path = ''
as $$ select revision::text from public.konsey_preview_rebuild where id $$;
revoke all on function public.konsey_preview_revision() from public;
grant execute on function public.konsey_preview_revision() to anon, authenticated, service_role;

create or replace function public.konsey_preview_content_changed()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare old_data jsonb; new_data jsonb;
begin
  if tg_op <> 'INSERT' then old_data := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then new_data := to_jsonb(new); end if;
  if tg_table_name in ('seriler', 'bolumler') then
    if coalesce(old_data->>'yayin_durumu', 'taslak') = 'taslak'
      and coalesce(new_data->>'yayin_durumu', 'taslak') = 'taslak' then return null; end if;
    if tg_op = 'UPDATE' and
      (old_data - array['goruntuleme_sayisi','ortalama_puan','puan_sayisi','updated_at','guncellendi_at']) =
      (new_data - array['goruntuleme_sayisi','ortalama_puan','puan_sayisi','updated_at','guncellendi_at'])
    then return null; end if;
  elsif tg_table_name = 'bolum_sayfalari' then
    if not exists (select 1 from public.bolumler b
      where b.id = coalesce((new_data->>'bolum_id')::uuid, (old_data->>'bolum_id')::uuid)
      and b.yayin_durumu <> 'taslak') then return null; end if;
  elsif tg_table_name = 'site_ayarlari' then
    if coalesce(new_data->>'anahtar', old_data->>'anahtar') not in
      ('anasayfa_hero_slider','meta_baslik','meta_aciklama','anahtar_kelimeler','seri_detay_vitrin')
    then return null; end if;
    if tg_op = 'UPDATE' and old_data->'deger' = new_data->'deger' then return null; end if;
  end if;
  update public.konsey_preview_rebuild set revision = revision + 1, requested_at = now(),
    status = case when lease_until > now() then status else 'pending' end where id;
  return null;
end;
$$;
revoke all on function public.konsey_preview_content_changed() from public, anon, authenticated;

drop trigger if exists konsey_preview_content_changed on public.seriler;
create trigger konsey_preview_content_changed after insert or update or delete on public.seriler
for each row execute function public.konsey_preview_content_changed();
drop trigger if exists konsey_preview_content_changed on public.bolumler;
create trigger konsey_preview_content_changed after insert or update or delete on public.bolumler
for each row execute function public.konsey_preview_content_changed();
drop trigger if exists konsey_preview_content_changed on public.bolum_sayfalari;
create trigger konsey_preview_content_changed after insert or update or delete on public.bolum_sayfalari
for each row execute function public.konsey_preview_content_changed();
drop trigger if exists konsey_preview_content_changed on public.site_ayarlari;
create trigger konsey_preview_content_changed after insert or update or delete on public.site_ayarlari
for each row execute function public.konsey_preview_content_changed();

create or replace function public.konsey_preview_request_rebuild()
returns text language plpgsql security definer set search_path = ''
as $$
declare result text;
begin
  if not exists (select 1 from public.profiller where id = auth.uid()
    and rol::text in ('kurucu','yonetici') and not coalesce(askiya_alindi,false))
  then raise exception 'Aktif kurucu veya yonetici gerekli.'; end if;
  update public.konsey_preview_rebuild set revision = revision + 1, requested_at = now(),
    status = case when lease_until > now() then status else 'pending' end
    where id returning revision::text into result;
  return result;
end;
$$;
revoke all on function public.konsey_preview_request_rebuild() from public, anon;
grant execute on function public.konsey_preview_request_rebuild() to authenticated;

create or replace function public.konsey_preview_claim_rebuild(p_deployed_revision bigint, p_force boolean default false)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare state public.konsey_preview_rebuild%rowtype; claim uuid;
begin
  select * into state from public.konsey_preview_rebuild where id for update;
  if exists (select 1 from public.seriler where yayin_durumu = 'planlandi'
      and yayin_tarihi > state.schedule_checked_at and yayin_tarihi <= now())
    or exists (select 1 from public.bolumler where yayin_durumu = 'planlandi'
      and yayin_tarihi > state.schedule_checked_at and yayin_tarihi <= now()) then
    update public.konsey_preview_rebuild set revision = revision + 1, requested_at = now() where id;
  end if;
  update public.konsey_preview_rebuild set schedule_checked_at = now() where id;
  select * into state from public.konsey_preview_rebuild where id;
  if p_deployed_revision = state.revision then
    update public.konsey_preview_rebuild set deployed_revision = p_deployed_revision,
      status = 'current', lease_id = null, lease_until = null, last_error = null where id;
    return null;
  end if;
  if state.lease_until > now() then return null; end if;
  if state.attempts_day <> current_date then
    update public.konsey_preview_rebuild set attempts_day = current_date, attempts = 0 where id;
    state.attempts := 0;
  end if;
  if state.attempts >= 6 then
    update public.konsey_preview_rebuild set status = 'daily_limit' where id;
    return null;
  end if;
  if not p_force and state.requested_at > now() - interval '2 minutes' then return null; end if;
  claim := gen_random_uuid();
  update public.konsey_preview_rebuild set lease_id = claim, lease_until = now() + interval '20 minutes',
    attempts = attempts + 1, status = 'starting', last_error = null where id;
  return jsonb_build_object('lease_id', claim, 'revision', state.revision::text);
end;
$$;
revoke all on function public.konsey_preview_claim_rebuild(bigint, boolean) from public, anon, authenticated;
grant execute on function public.konsey_preview_claim_rebuild(bigint, boolean) to service_role;

create or replace function public.konsey_preview_finish_rebuild(p_lease_id uuid, p_run_id bigint, p_result text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_result not in ('queued','busy','error') then raise exception 'Invalid result'; end if;
  update public.konsey_preview_rebuild set last_run_id = p_run_id,
    status = case p_result when 'error' then 'failed' when 'busy' then 'waiting' else 'queued' end,
    last_error = case when p_result = 'error' then 'Workflow request failed' else null end,
    lease_until = case when p_result = 'busy' then now() + interval '5 minutes' else lease_until end,
    attempts = case when p_result = 'busy' then greatest(0, attempts - 1) else attempts end
    where id and lease_id = p_lease_id;
end;
$$;
revoke all on function public.konsey_preview_finish_rebuild(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.konsey_preview_finish_rebuild(uuid, bigint, text) to service_role;
commit;
