-- Bolumler tablosuna ayri PDF ve CBR indirme alanlari ekler.
-- SQL Editor'de bir kez calistir.

begin;

alter table if exists public.bolumler
  add column if not exists pdf_indirme_link text;

alter table if exists public.bolumler
  add column if not exists cbr_indirme_link text;

update public.bolumler
set pdf_indirme_link = indirme_link
where pdf_indirme_link is null
  and indirme_link is not null;

commit;
