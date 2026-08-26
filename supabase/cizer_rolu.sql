-- PostgreSQL enum degerleri transaction blogu disinda eklenmelidir.
alter type public.kullanici_rol add value if not exists 'cizer';
