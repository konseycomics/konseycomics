begin;

alter table public.seriler
  add column if not exists eser_sahibi_id uuid references public.profiller(id) on delete set null;

create index if not exists idx_seriler_eser_sahibi
  on public.seriler (eser_sahibi_id)
  where eser_sahibi_id is not null;

commit;
