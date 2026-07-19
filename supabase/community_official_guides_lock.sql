-- Resmi sistem profillerinin konularini kalici olarak yorumlara kapatir.
-- Tekrar calistirilabilir.

begin;

update public.topluluk_konulari
set kilitli = true,
    updated_at = now()
where sistem_profil_id is not null;

commit;
