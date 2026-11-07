export async function prepareInteractiveImage(file, options) {
  if (typeof window === 'undefined' || process.env.NEXT_PUBLIC_PREVIEW_INTERACTIVE !== '1') return file
  return preparePreviewImage(file, { ...options, format: 'webp' })
}

export async function preparePreviewImage(file, { bucket, prefix, format }) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Test yuklemesinde JPEG, PNG veya WebP sec.')
  if (file.size > 10 * 1024 * 1024) throw new Error('Gorsel en fazla 10 MB olabilir.')
  const bitmap = await createImageBitmap(file)
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40000000) throw new Error('Gorsel boyutlari cok buyuk.')
    const width = bucket === 'site' ? 1920 : bucket === 'bolum-kapaklari' ? 900 : bucket === 'kapaklar' && prefix === 'sayfa' ? 1600 : 1100
    const scale = Math.min(1, width / bitmap.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Gorsel islenemedi.')
    if (format === 'jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height) }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, format === 'jpeg' ? 'image/jpeg' : 'image/webp', 0.8))
    canvas.width = canvas.height = 1
    if (!blob || !['image/jpeg', 'image/webp'].includes(blob.type)) throw new Error('Tarayici gorseli donusturemedi.')
    if (blob.size > 4 * 1024 * 1024) throw new Error('Gorsel kucultuldukten sonra da 4 MB sinirini asiyor.')
    return new File([blob], blob.type === 'image/webp' ? 'upload.webp' : 'upload.jpg', { type: blob.type })
  } finally { bitmap.close() }
}
