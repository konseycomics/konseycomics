begin;

create or replace function public.konsey_preview_chapter_draft(
  p_id uuid, p_seri_id uuid, p_sayi integer, p_baslik text,
  p_kapak_url text, p_sayfalar text[]
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  chapter public.bolumler%rowtype;
  image_pattern constant text := '^https://cdn[.]konseycomics[.]com/preview-uploads/[a-f0-9-]+[.](webp|jpg)$';
begin
  if not exists (select 1 from public.profiller where id = auth.uid()
    and rol::text in ('kurucu', 'yonetici') and coalesce(askiya_alindi, false) = false)
  then raise exception 'Aktif kurucu veya yonetici hesabi gerekli.'; end if;
  if p_id is null or p_seri_id is null or p_sayi is null or p_sayi < 1 or p_sayi > 9999
    or p_baslik is null or length(trim(p_baslik)) not between 1 and 120
    or coalesce(cardinality(p_sayfalar), 0) not between 1 and 50
  then raise exception 'Test bolumu bilgileri gecersiz.'; end if;
  if (coalesce(p_kapak_url, '') <> '' and p_kapak_url !~ image_pattern)
    or exists (select 1 from unnest(p_sayfalar) u(url) where url is null or url !~ image_pattern)
  then raise exception 'Yalnizca test klasorundeki gorseller kullanilabilir.'; end if;

  perform id from public.seriler where id = p_seri_id and yayin_durumu = 'taslak'
    and slug ~ '^preview-test-[a-f0-9-]{36}$' and baslik like '[TEST] %' for update;
  if not found then raise exception 'Yalnizca yeni test serisine bolum eklenebilir.'; end if;
  select * into chapter from public.bolumler where id = p_id;
  if found then
    if chapter.seri_id <> p_seri_id or chapter.sayi <> p_sayi or chapter.yayin_durumu <> 'taslak'
    then raise exception 'Bu istek baska bir kayda ait.'; end if;
    return jsonb_build_object('id', chapter.id, 'baslik', chapter.baslik, 'yayin_durumu', chapter.yayin_durumu);
  end if;
  if exists (select 1 from public.bolumler where seri_id = p_seri_id and sayi = p_sayi)
  then raise exception 'Bu test bolum numarasi zaten var.'; end if;

  insert into public.bolumler (id, seri_id, sayi, baslik, kapak_url, yayin_durumu, yayin_tarihi)
    values (p_id, p_seri_id, p_sayi, '[TEST] ' || trim(p_baslik), coalesce(p_kapak_url, ''), 'taslak', null)
    returning * into chapter;
  insert into public.bolum_sayfalari (bolum_id, sira, gorsel_url)
    select chapter.id, position::integer, url
    from unnest(p_sayfalar) with ordinality u(url, position);
  return jsonb_build_object('id', chapter.id, 'baslik', chapter.baslik, 'yayin_durumu', chapter.yayin_durumu);
end;
$$;

revoke all on function public.konsey_preview_chapter_draft(uuid, uuid, integer, text, text, text[]) from public, anon;
grant execute on function public.konsey_preview_chapter_draft(uuid, uuid, integer, text, text, text[]) to authenticated;
commit;
