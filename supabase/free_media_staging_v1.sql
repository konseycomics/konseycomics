begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('konsey-media-free', 'konsey-media-free', true, 4194304, array['image/jpeg','image/webp'])
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'konsey-media-free'
    and public and file_size_limit = 4194304
    and allowed_mime_types @> array['image/jpeg','image/webp']::text[])
  then raise exception 'Existing staging bucket settings require review.'; end if;
end $$;

create table if not exists public.konsey_free_media_budget (
  id boolean primary key default true check (id),
  allocated_bytes bigint not null default 0 check (allocated_bytes >= 0),
  max_bytes bigint not null default 262144000 check (max_bytes between 1 and 262144000)
);
create table if not exists public.konsey_free_media_objects (
  object_key text primary key,
  size_bytes integer not null check (size_bytes between 1 and 4194304),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  ready boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.konsey_free_media_budget enable row level security;
alter table public.konsey_free_media_objects enable row level security;
revoke all on public.konsey_free_media_budget, public.konsey_free_media_objects from public, anon, authenticated;
grant select, insert, update on public.konsey_free_media_budget, public.konsey_free_media_objects to service_role;
insert into public.konsey_free_media_budget (id) values (true) on conflict do nothing;

create or replace view public.konsey_public_free_media with (security_barrier = true) as
select object_key, size_bytes, sha256 from public.konsey_free_media_objects where ready;
revoke all on public.konsey_public_free_media from public, anon, authenticated;
grant select on public.konsey_public_free_media to anon, authenticated, service_role;

create or replace function public.konsey_reserve_free_media(p_key text, p_size integer, p_sha256 text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare budget public.konsey_free_media_budget%rowtype;
begin
  if p_key is null or p_key !~ '^free-uploads/[a-f0-9-]{36}\.(webp|jpg)$'
    or p_size is null or p_size not between 1 and 4194304
    or p_sha256 is null or p_sha256 !~ '^[a-f0-9]{64}$'
  then raise exception 'Invalid media reservation.'; end if;
  select * into budget from public.konsey_free_media_budget where id for update;
  if budget.id is null or budget.allocated_bytes + p_size > budget.max_bytes then return false; end if;
  insert into public.konsey_free_media_objects (object_key, size_bytes, sha256) values (p_key, p_size, p_sha256);
  update public.konsey_free_media_budget set allocated_bytes = allocated_bytes + p_size where id;
  return true;
end $$;

create or replace function public.konsey_finish_free_media(p_key text)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  update public.konsey_free_media_objects set ready = true where object_key = p_key and not ready;
  if not found then return false; end if;
  update public.konsey_preview_rebuild set revision = revision + 1, requested_at = now(),
    status = case when lease_until > now() then status else 'pending' end where id;
  return true;
end $$;
revoke all on function public.konsey_reserve_free_media(text, integer, text) from public, anon, authenticated;
revoke all on function public.konsey_finish_free_media(text) from public, anon, authenticated;
grant execute on function public.konsey_reserve_free_media(text, integer, text) to service_role;
grant execute on function public.konsey_finish_free_media(text) to service_role;

select 'Free media staging ready' as result;
commit;
