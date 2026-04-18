function getTurkeyDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(date)
  const get = (type) => parts.find((item) => item.type === type)?.value

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
  }
}

function getTurkeyDayKey(date = new Date()) {
  const { year, month, day } = getTurkeyDateParts(date)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getTurkeyWeekKey(date = new Date()) {
  const { year, month, day } = getTurkeyDateParts(date)
  const utcDate = new Date(Date.UTC(year, month - 1, day))
  const weekday = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() - (weekday - 1))

  return `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth() + 1).padStart(2, '0')}-${String(utcDate.getUTCDate()).padStart(2, '0')}`
}

function pickWinner(rows, minimumReads = 1) {
  const winner = (rows || []).find((item) => Number(item?.okumaSayisi || 0) >= minimumReads)
  return winner || null
}

async function fetchDefinitionMap(adminClient, tableName, codes) {
  const { data, error } = await adminClient
    .from(tableName)
    .select('id, kod')
    .in('kod', codes)

  if (error) return new Map()
  return new Map((data || []).map((item) => [item.kod, item.id]))
}

async function hasExistingRow(adminClient, tableName, filters) {
  let query = adminClient.from(tableName).select('id').limit(1)
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value)
  })

  const { data, error } = await query.maybeSingle()
  if (error) return false
  return Boolean(data?.id)
}

async function insertLeaderboardLog(adminClient, payload) {
  const exists = await hasExistingRow(adminClient, 'okuyucu_liderlik_odulleri', {
    donem_tipi: payload.donem_tipi,
    donem_anahtari: payload.donem_anahtari,
  })

  if (exists) return false

  const { error } = await adminClient
    .from('okuyucu_liderlik_odulleri')
    .insert(payload)

  return !error
}

async function ensureUserBadge(adminClient, { userId, badgeId, reason }) {
  if (!userId || !badgeId) return false

  const exists = await hasExistingRow(adminClient, 'kullanici_rozetleri', {
    kullanici_id: userId,
    rozet_id: badgeId,
  })

  if (exists) return false

  const { error } = await adminClient
    .from('kullanici_rozetleri')
    .insert({
      kullanici_id: userId,
      rozet_id: badgeId,
      acilma_nedeni: reason,
    })

  return !error
}

async function ensureUserTitle(adminClient, { userId, titleId, reason }) {
  if (!userId || !titleId) return false

  const exists = await hasExistingRow(adminClient, 'kullanici_unvanlari', {
    kullanici_id: userId,
    unvan_id: titleId,
  })

  if (exists) return false

  const activeTitleExists = await hasExistingRow(adminClient, 'kullanici_unvanlari', {
    kullanici_id: userId,
    one_cikarildi: true,
  })

  const { error } = await adminClient
    .from('kullanici_unvanlari')
    .insert({
      kullanici_id: userId,
      unvan_id: titleId,
      acilma_nedeni: reason,
      one_cikarildi: !activeTitleExists,
    })

  return !error
}

async function createNotification(adminClient, { userId, title, message }) {
  if (!userId || !title) return false

  const { error } = await adminClient
    .from('bildirimler')
    .insert({
      alici_id: userId,
      gonderen_id: null,
      tip: 'rozet_kazanildi',
      baslik: title,
      mesaj: message || '',
      okundu: false,
    })

  return !error
}

export async function syncLeaderboardAwards({ adminClient, leaderboards }) {
  if (!adminClient || !leaderboards) return

  try {
    const badgeCodes = [
      'gunun_en_iyi_okuyucusu',
      'haftanin_en_iyi_okuyucusu',
      'tum_zamanlarin_en_iyi_okuyucusu',
    ]
    const titleCodes = ['konsey_maratoncusu', 'konsey_efsanesi']

    const [badgeMap, titleMap] = await Promise.all([
      fetchDefinitionMap(adminClient, 'rozet_tanimlari', badgeCodes),
      fetchDefinitionMap(adminClient, 'unvan_tanimlari', titleCodes),
    ])

    const nowIso = new Date().toISOString()
    const gunlukKazanan = pickWinner(leaderboards.gunluk, 2)
    const haftalikKazanan = pickWinner(leaderboards.haftalik, 5)
    const tumZamanlarKazanan = pickWinner(leaderboards.tum, 1)

    if (gunlukKazanan && badgeMap.get('gunun_en_iyi_okuyucusu')) {
      const reason = {
        kaynak: 'liderlik_tablosu',
        donem_tipi: 'gunluk',
        donem_anahtari: getTurkeyDayKey(),
        okuma_sayisi: gunlukKazanan.okumaSayisi,
      }

      const logged = await insertLeaderboardLog(adminClient, {
        donem_tipi: 'gunluk',
        donem_anahtari: getTurkeyDayKey(),
        kullanici_id: gunlukKazanan.id,
        okuma_sayisi: gunlukKazanan.okumaSayisi,
        rozet_id: badgeMap.get('gunun_en_iyi_okuyucusu'),
        created_at: nowIso,
      })

      if (logged) {
        await ensureUserBadge(adminClient, {
          userId: gunlukKazanan.id,
          badgeId: badgeMap.get('gunun_en_iyi_okuyucusu'),
          reason,
        })
        await createNotification(adminClient, {
          userId: gunlukKazanan.id,
          title: 'Günün En İyi Okuyucusu',
          message: `Bugünkü liderlik tablosunda ${gunlukKazanan.okumaSayisi} okuma ile zirveye çıktın.`,
        })
      }
    }

    if (haftalikKazanan && badgeMap.get('haftanin_en_iyi_okuyucusu')) {
      const reason = {
        kaynak: 'liderlik_tablosu',
        donem_tipi: 'haftalik',
        donem_anahtari: getTurkeyWeekKey(),
        okuma_sayisi: haftalikKazanan.okumaSayisi,
      }

      const logged = await insertLeaderboardLog(adminClient, {
        donem_tipi: 'haftalik',
        donem_anahtari: getTurkeyWeekKey(),
        kullanici_id: haftalikKazanan.id,
        okuma_sayisi: haftalikKazanan.okumaSayisi,
        rozet_id: badgeMap.get('haftanin_en_iyi_okuyucusu'),
        unvan_id: titleMap.get('konsey_maratoncusu') || null,
        created_at: nowIso,
      })

      if (logged) {
        await ensureUserBadge(adminClient, {
          userId: haftalikKazanan.id,
          badgeId: badgeMap.get('haftanin_en_iyi_okuyucusu'),
          reason,
        })
        if (titleMap.get('konsey_maratoncusu')) {
          await ensureUserTitle(adminClient, {
            userId: haftalikKazanan.id,
            titleId: titleMap.get('konsey_maratoncusu'),
            reason,
          })
        }
        await createNotification(adminClient, {
          userId: haftalikKazanan.id,
          title: 'Haftanın En İyi Okuyucusu',
          message: `Son 7 günde ${haftalikKazanan.okumaSayisi} okuma ile haftanın lideri oldun. Konsey Maratoncusu unvanı hesabına işlendi.`,
        })
      }
    }

    if (tumZamanlarKazanan) {
      const reason = {
        kaynak: 'liderlik_tablosu',
        donem_tipi: 'tum_zamanlar',
        donem_anahtari: 'global',
        okuma_sayisi: tumZamanlarKazanan.okumaSayisi,
      }

      if (badgeMap.get('tum_zamanlarin_en_iyi_okuyucusu')) {
        const badgeCreated = await ensureUserBadge(adminClient, {
          userId: tumZamanlarKazanan.id,
          badgeId: badgeMap.get('tum_zamanlarin_en_iyi_okuyucusu'),
          reason,
        })
        if (badgeCreated) {
          await createNotification(adminClient, {
            userId: tumZamanlarKazanan.id,
            title: 'Tüm Zamanların En İyi Okuyucusu',
            message: `Toplam ${tumZamanlarKazanan.okumaSayisi} okuma ile tüm zamanlar liderliğinde zirveye çıktın.`,
          })
        }
      }

      if (titleMap.get('konsey_efsanesi')) {
        await ensureUserTitle(adminClient, {
          userId: tumZamanlarKazanan.id,
          titleId: titleMap.get('konsey_efsanesi'),
          reason,
        })
      }
    }
  } catch {
    return
  }
}
