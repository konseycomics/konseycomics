-- KonseyComics phase 2 RLS lockdown
-- Bu adim, uygulama public profil verisini public_profiller view'u uzerinden okuduktan sonra calistirilmalidir.

begin;

-- Profiller: herkese acik tablo okumayi kapat, kullanici kendi kaydini okuyabilsin.
drop policy if exists "herkes profil okuyabilir" on public.profiller;

create policy "kullanici kendi profilini okur"
on public.profiller
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profil guncelleme" on public.profiller;
create policy "kullanici kendi profilini gunceller"
on public.profiller
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profil olusturma" on public.profiller;
create policy "kullanici kendi profilini olusturur"
on public.profiller
for insert
to authenticated
with check (auth.uid() = id);

-- Takipler: sosyal grafik public olmasin.
drop policy if exists "herkes takip okur" on public.takipler;
create policy "kullanici ilgili takip kayitlarini okur"
on public.takipler
for select
to authenticated
using (auth.uid() = takip_eden or auth.uid() = takip_edilen);

-- Yorum begenileri: sadece sahip oldugu begenileri gorebilsin.
drop policy if exists "herkes begeni okur" on public.yorum_begenileri;
create policy "kullanici kendi begenilerini okur"
on public.yorum_begenileri
for select
to authenticated
using (auth.uid() = kullanici_id);

-- Site ayarlari: varsayilan olarak RLS acik olsun, publice acik kalmasin.
alter table if exists public.site_ayarlari enable row level security;

commit;
