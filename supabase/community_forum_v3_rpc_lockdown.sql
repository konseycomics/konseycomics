-- V3 ilk kez calistirildiktan sonra RPC'yi yalnizca sunucu rolune kapatir.
revoke all on function public.register_topluluk_view(uuid, text) from public;
revoke execute on function public.register_topluluk_view(uuid, text) from anon, authenticated;
