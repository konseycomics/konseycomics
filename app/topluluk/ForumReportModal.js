'use client'

import { Flag, X } from 'lucide-react'

const REASONS = [
  ['spam', 'Spam veya reklam'],
  ['hakaret', 'Hakaret veya taciz'],
  ['spoiler', 'İşaretlenmemiş spoiler'],
  ['yanlis_bolum', 'Yanlış forum bölümü'],
  ['yasadisi', 'Yasa dışı içerik'],
  ['diger', 'Diğer'],
]

export default function ForumReportModal({ open, onClose, onSubmit, submitting = false }) {
  if (!open) return null
  return (
    <div className="forum-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="forum-modal forum-report-modal" onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        onSubmit({ neden: form.get('neden'), aciklama: form.get('aciklama') })
      }} role="dialog" aria-modal="true" aria-labelledby="forum-report-title">
        <button className="forum-modal-close" type="button" onClick={onClose} aria-label="Pencereyi kapat"><X size={18} /></button>
        <div className="forum-modal-icon report"><Flag size={21} /></div>
        <span className="forum-modal-eyebrow">MODERASYON</span>
        <h2 id="forum-report-title">İçeriği bildir</h2>
        <p>Ekibin doğru değerlendirme yapabilmesi için en uygun nedeni seç.</p>
        <div className="forum-report-reasons">
          {REASONS.map(([value, label], index) => <label key={value}><input type="radio" name="neden" value={value} defaultChecked={index === 0} /><span>{label}</span></label>)}
        </div>
        <label className="forum-report-note"><span>Ek açıklama <small>isteğe bağlı</small></span><textarea name="aciklama" rows={4} maxLength={500} placeholder="Kısaca ne olduğunu anlat..." /></label>
        <div className="forum-modal-actions"><button className="primary" type="submit" disabled={submitting}>{submitting ? 'Gönderiliyor...' : 'Bildirimi Gönder'}</button><button type="button" onClick={onClose}>Vazgeç</button></div>
      </form>
    </div>
  )
}
