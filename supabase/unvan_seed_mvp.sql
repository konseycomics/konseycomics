-- Konsey Comics - Unvan Sistemi MVP Seed
-- Bu dosya mevcut seriler icin character_group ve ilk unvan/rule kayitlarini olusturur.

begin;

-- 1) Character group atamalari
update public.seriler
set character_group = 'daredevil'
where lower(baslik) like '%daredevil%';

update public.seriler
set character_group = 'spider-man'
where lower(baslik) like '%spider-man%'
   or lower(baslik) like '%spider punk%'
   or lower(baslik) like '%spider-punk%';

update public.seriler
set character_group = 'thor'
where lower(baslik) like '%thor%';

update public.seriler
set character_group = 'ghost-rider'
where lower(baslik) like '%ghost rider%';

update public.seriler
set character_group = 'deathstroke'
where lower(baslik) like '%deathstroke%';

update public.seriler
set character_group = 'punisher'
where lower(baslik) like '%punisher%';

update public.seriler
set character_group = 'jessica-jones'
where lower(baslik) like '%jessica jones%';

-- 2) Ilk unvan tanimlari
insert into public.unvan_tanimlari (kod, isim, aciklama, seri_id, character_group, kategori, nadirlik, siralama)
select 'dd_hells_kitchen_seytani', 'Hell''s Kitchen Seytani', 'Daredevil evreninde ilk serini tamamladin.', null, 'daredevil', 'mastery', 'rare', 10
where not exists (select 1 from public.unvan_tanimlari where kod = 'dd_hells_kitchen_seytani');

insert into public.unvan_tanimlari (kod, isim, aciklama, seri_id, character_group, kategori, nadirlik, siralama)
select 'dd_korkusu_olmayan_adam', 'Korkusu Olmayan Adam', 'Daredevil (2022) serisini tamamen bitirdin.', s.id, 'daredevil', 'progress', 'legendary', 20
from public.seriler s
where lower(s.baslik) = lower('Daredevil (2022)')
  and not exists (select 1 from public.unvan_tanimlari where kod = 'dd_korkusu_olmayan_adam');

insert into public.unvan_tanimlari (kod, isim, aciklama, seri_id, character_group, kategori, nadirlik, siralama)
select 'gr_alevlerin_hakimi', 'Alevlerin Hakimi', 'Ghost Rider serisinde ilk buyuk esigi gectin.', s.id, 'ghost-rider', 'progress', 'rare', 30
from public.seriler s
where lower(s.baslik) = lower('Ghost Rider: Return Of Vengeance')
  and not exists (select 1 from public.unvan_tanimlari where kod = 'gr_alevlerin_hakimi');

insert into public.unvan_tanimlari (kod, isim, aciklama, seri_id, character_group, kategori, nadirlik, siralama)
select 'gr_gunahlarin_yargici', 'Gunahlarin Yargici', 'Ghost Rider serisini tamamen bitirdin.', s.id, 'ghost-rider', 'progress', 'epic', 40
from public.seriler s
where lower(s.baslik) = lower('Ghost Rider: Return Of Vengeance')
  and not exists (select 1 from public.unvan_tanimlari where kod = 'gr_gunahlarin_yargici');

insert into public.unvan_tanimlari (kod, isim, aciklama, seri_id, character_group, kategori, nadirlik, siralama)
select 'thor_odinin_oglu', 'Odin''in Oglu', 'Thor serisinde ilk esigi gectin.', s.id, 'thor', 'progress', 'common', 50
from public.seriler s
where lower(s.baslik) = lower('Thor: Lightning and Lament')
  and not exists (select 1 from public.unvan_tanimlari where kod = 'thor_odinin_oglu');

insert into public.unvan_tanimlari (kod, isim, aciklama, seri_id, character_group, kategori, nadirlik, siralama)
select 'thor_gok_gurultusu_tanrisi', 'Gok Gurultusu Tanrisi', 'Thor serisinde ust duzey ilerleme sagladin.', s.id, 'thor', 'progress', 'epic', 60
from public.seriler s
where lower(s.baslik) = lower('Thor: Lightning and Lament')
  and not exists (select 1 from public.unvan_tanimlari where kod = 'thor_gok_gurultusu_tanrisi');

insert into public.unvan_tanimlari (kod, isim, aciklama, seri_id, character_group, kategori, nadirlik, siralama)
select 'thor_kirilma_noktasi', 'Kirilma Noktasi', 'Thor serisini tamamen bitirdin.', s.id, 'thor', 'progress', 'legendary', 70
from public.seriler s
where lower(s.baslik) = lower('Thor: Lightning and Lament')
  and not exists (select 1 from public.unvan_tanimlari where kod = 'thor_kirilma_noktasi');

insert into public.unvan_tanimlari (kod, isim, aciklama, seri_id, character_group, kategori, nadirlik, siralama)
select 'spiderman_orumcek', 'Orumcek', 'Ilk Spider-Man serine basladin.', null, 'spider-man', 'progress', 'common', 80
where not exists (select 1 from public.unvan_tanimlari where kod = 'spiderman_orumcek');

insert into public.unvan_tanimlari (kod, isim, aciklama, seri_id, character_group, kategori, nadirlik, siralama)
select 'spiderman_spidey', 'Spidey', 'Ilk Spider-Man serini tamamladin.', null, 'spider-man', 'mastery', 'rare', 90
where not exists (select 1 from public.unvan_tanimlari where kod = 'spiderman_spidey');

insert into public.unvan_tanimlari (kod, isim, aciklama, seri_id, character_group, kategori, nadirlik, siralama)
select 'spiderman_ag_kafa', 'Ag Kafa', 'Spider-Man evreninde puanlariyla iz biraktin.', null, 'spider-man', 'engagement', 'epic', 100
where not exists (select 1 from public.unvan_tanimlari where kod = 'spiderman_ag_kafa');

insert into public.unvan_tanimlari (kod, isim, aciklama, seri_id, character_group, kategori, nadirlik, siralama)
select 'spiderman_mahallenizin_dostu', 'Mahallenizin Dostu Orumcek Adam', 'Spider-Man evreninde gercek bir arsiv kurdun.', null, 'spider-man', 'mastery', 'legendary', 110
where not exists (select 1 from public.unvan_tanimlari where kod = 'spiderman_mahallenizin_dostu');

insert into public.unvan_tanimlari (kod, isim, aciklama, seri_id, character_group, kategori, nadirlik, siralama)
select 'pp_merhametsiz', 'Merhametsiz', 'Punisher vs. Bullseye serisinde ilk buyuk esigi gectin.', s.id, 'punisher', 'progress', 'rare', 120
from public.seriler s
where lower(s.baslik) = lower('Punisher vs. Bullseye')
  and not exists (select 1 from public.unvan_tanimlari where kod = 'pp_merhametsiz');

insert into public.unvan_tanimlari (kod, isim, aciklama, seri_id, character_group, kategori, nadirlik, siralama)
select 'pp_intikamin_kendisi', 'Intikamin Kendisi', 'Punisher vs. Bullseye serisini tamamen bitirdin.', s.id, 'punisher', 'progress', 'legendary', 130
from public.seriler s
where lower(s.baslik) = lower('Punisher vs. Bullseye')
  and not exists (select 1 from public.unvan_tanimlari where kod = 'pp_intikamin_kendisi');

-- 3) Ilk kurallar
insert into public.unvan_kurallari (unvan_id, event_tipi, kural_tipi, kural_config, oncelik)
select ut.id, 'SERIES_COMPLETED', 'character_series_completed_count', jsonb_build_object('character_group', 'daredevil', 'min_completed_series', 1), 10
from public.unvan_tanimlari ut
where ut.kod = 'dd_hells_kitchen_seytani'
  and not exists (
    select 1 from public.unvan_kurallari uk
    where uk.unvan_id = ut.id and uk.kural_tipi = 'character_series_completed_count'
  );

insert into public.unvan_kurallari (unvan_id, event_tipi, kural_tipi, kural_config, oncelik)
select ut.id, 'SERIES_PROGRESS_UPDATED', 'series_progress', jsonb_build_object('series_id', ut.seri_id, 'min_progress_percent', 100), 20
from public.unvan_tanimlari ut
where ut.kod = 'dd_korkusu_olmayan_adam'
  and ut.seri_id is not null
  and not exists (
    select 1 from public.unvan_kurallari uk
    where uk.unvan_id = ut.id and uk.kural_tipi = 'series_progress'
  );

insert into public.unvan_kurallari (unvan_id, event_tipi, kural_tipi, kural_config, oncelik)
select ut.id, 'SERIES_PROGRESS_UPDATED', 'series_progress', jsonb_build_object('series_id', ut.seri_id, 'min_progress_percent', 50), 30
from public.unvan_tanimlari ut
where ut.kod = 'gr_alevlerin_hakimi'
  and ut.seri_id is not null
  and not exists (
    select 1 from public.unvan_kurallari uk
    where uk.unvan_id = ut.id and uk.kural_tipi = 'series_progress'
  );

insert into public.unvan_kurallari (unvan_id, event_tipi, kural_tipi, kural_config, oncelik)
select ut.id, 'SERIES_COMPLETED', 'series_completed', jsonb_build_object('series_id', ut.seri_id), 40
from public.unvan_tanimlari ut
where ut.kod = 'gr_gunahlarin_yargici'
  and ut.seri_id is not null
  and not exists (
    select 1 from public.unvan_kurallari uk
    where uk.unvan_id = ut.id and uk.kural_tipi = 'series_completed'
  );

insert into public.unvan_kurallari (unvan_id, event_tipi, kural_tipi, kural_config, oncelik)
select ut.id, 'SERIES_PROGRESS_UPDATED', 'series_progress', jsonb_build_object('series_id', ut.seri_id, 'min_progress_percent', 25), 50
from public.unvan_tanimlari ut
where ut.kod = 'thor_odinin_oglu'
  and ut.seri_id is not null
  and not exists (
    select 1 from public.unvan_kurallari uk
    where uk.unvan_id = ut.id and uk.kural_tipi = 'series_progress'
  );

insert into public.unvan_kurallari (unvan_id, event_tipi, kural_tipi, kural_config, oncelik)
select ut.id, 'SERIES_PROGRESS_UPDATED', 'series_progress', jsonb_build_object('series_id', ut.seri_id, 'min_progress_percent', 75), 60
from public.unvan_tanimlari ut
where ut.kod = 'thor_gok_gurultusu_tanrisi'
  and ut.seri_id is not null
  and not exists (
    select 1 from public.unvan_kurallari uk
    where uk.unvan_id = ut.id and uk.kural_tipi = 'series_progress'
  );

insert into public.unvan_kurallari (unvan_id, event_tipi, kural_tipi, kural_config, oncelik)
select ut.id, 'SERIES_COMPLETED', 'series_completed', jsonb_build_object('series_id', ut.seri_id), 70
from public.unvan_tanimlari ut
where ut.kod = 'thor_kirilma_noktasi'
  and ut.seri_id is not null
  and not exists (
    select 1 from public.unvan_kurallari uk
    where uk.unvan_id = ut.id and uk.kural_tipi = 'series_completed'
  );

insert into public.unvan_kurallari (unvan_id, event_tipi, kural_tipi, kural_config, oncelik)
select ut.id, 'SERIES_PROGRESS_UPDATED', 'character_series_completed_count', jsonb_build_object('character_group', 'spider-man', 'min_completed_series', 0), 80
from public.unvan_tanimlari ut
where ut.kod = 'spiderman_orumcek'
  and not exists (
    select 1 from public.unvan_kurallari uk
    where uk.unvan_id = ut.id and uk.kural_tipi = 'character_series_completed_count'
  );

insert into public.unvan_kurallari (unvan_id, event_tipi, kural_tipi, kural_config, oncelik)
select ut.id, 'SERIES_COMPLETED', 'character_series_completed_count', jsonb_build_object('character_group', 'spider-man', 'min_completed_series', 1), 90
from public.unvan_tanimlari ut
where ut.kod = 'spiderman_spidey'
  and not exists (
    select 1 from public.unvan_kurallari uk
    where uk.unvan_id = ut.id and uk.kural_tipi = 'character_series_completed_count'
  );

insert into public.unvan_kurallari (unvan_id, event_tipi, kural_tipi, kural_config, oncelik)
select ut.id, 'SERIES_RATED', 'rate_count_in_group', jsonb_build_object('character_group', 'spider-man', 'min_ratings_count', 3), 100
from public.unvan_tanimlari ut
where ut.kod = 'spiderman_ag_kafa'
  and not exists (
    select 1 from public.unvan_kurallari uk
    where uk.unvan_id = ut.id and uk.kural_tipi = 'rate_count_in_group'
  );

insert into public.unvan_kurallari (unvan_id, event_tipi, kural_tipi, kural_config, oncelik)
select ut.id, 'SERIES_COMPLETED', 'character_series_completed_count', jsonb_build_object('character_group', 'spider-man', 'min_completed_series', 3), 110
from public.unvan_tanimlari ut
where ut.kod = 'spiderman_mahallenizin_dostu'
  and not exists (
    select 1 from public.unvan_kurallari uk
    where uk.unvan_id = ut.id and uk.kural_tipi = 'character_series_completed_count'
  );

insert into public.unvan_kurallari (unvan_id, event_tipi, kural_tipi, kural_config, oncelik)
select ut.id, 'SERIES_PROGRESS_UPDATED', 'series_progress', jsonb_build_object('series_id', ut.seri_id, 'min_progress_percent', 50), 120
from public.unvan_tanimlari ut
where ut.kod = 'pp_merhametsiz'
  and ut.seri_id is not null
  and not exists (
    select 1 from public.unvan_kurallari uk
    where uk.unvan_id = ut.id and uk.kural_tipi = 'series_progress'
  );

insert into public.unvan_kurallari (unvan_id, event_tipi, kural_tipi, kural_config, oncelik)
select ut.id, 'SERIES_COMPLETED', 'series_completed', jsonb_build_object('series_id', ut.seri_id), 130
from public.unvan_tanimlari ut
where ut.kod = 'pp_intikamin_kendisi'
  and ut.seri_id is not null
  and not exists (
    select 1 from public.unvan_kurallari uk
    where uk.unvan_id = ut.id and uk.kural_tipi = 'series_completed'
  );

commit;
