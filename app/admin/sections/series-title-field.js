'use client'
import { I, LB } from '../ui'

export function SeriesTitleField({ enabled, name, onChange }) {
  return <div style={{ margin: '16px 0', display: 'grid', gap: 12 }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input type="checkbox" checked={enabled} onChange={e => onChange({ unvan_ekle: e.target.checked })} />
      Bu seriye özel ünvan ekle
    </label>
    {enabled && <label style={LB}>Ünvan Adı
      <input required maxLength={80} value={name} onChange={e => onChange({ unvan_adi: e.target.value })} style={I} />
    </label>}
  </div>
}
