const PASSWORD_POLICY = {
  minLength: 10,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
}

export function normalizeAuthIdentifier(value) {
  return String(value || '').trim()
}

export function normalizeEmail(value) {
  return normalizeAuthIdentifier(value).toLowerCase()
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeAuthIdentifier(value))
}

export function validateUsername(value) {
  const username = normalizeAuthIdentifier(value)

  if (username.length < 3) {
    return 'Kullanıcı adı en az 3 karakter olmalı.'
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Kullanıcı adı sadece harf, rakam ve _ içerebilir.'
  }

  return ''
}

export function getPasswordChecks(password) {
  const value = String(password || '')

  return {
    minLength: value.length >= PASSWORD_POLICY.minLength,
    uppercase: /[A-ZÇĞİÖŞÜ]/.test(value),
    lowercase: /[a-zçğıöşü]/.test(value),
    number: /\d/.test(value),
  }
}

export function validatePassword(password) {
  const checks = getPasswordChecks(password)

  if (!checks.minLength) {
    return `Şifre en az ${PASSWORD_POLICY.minLength} karakter olmalı.`
  }

  if (!checks.uppercase) {
    return 'Şifre en az 1 büyük harf içermeli.'
  }

  if (!checks.lowercase) {
    return 'Şifre en az 1 küçük harf içermeli.'
  }

  if (!checks.number) {
    return 'Şifre en az 1 rakam içermeli.'
  }

  return ''
}

export function isCaptchaEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
}

export function getCaptchaErrorMessage() {
  return 'Lütfen güvenlik doğrulamasını tamamla.'
}

export function mapAuthError(error, context = 'generic') {
  const rawMessage = typeof error === 'string' ? error : error?.message || 'Bilinmeyen hata'
  const message = rawMessage.toLowerCase()

  if (message.includes('email rate limit exceeded') || message.includes('over_email_send_rate_limit')) {
    return 'Çok kısa sürede fazla sayıda e-posta gönderildi. Lütfen biraz bekleyip tekrar dene.'
  }

  if (message.includes('rate limit')) {
    return 'Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar dene.'
  }

  if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
    return context === 'password-check'
      ? 'Mevcut şifre yanlış.'
      : 'Kullanıcı adı, e-posta veya şifre hatalı.'
  }

  if (message.includes('email not confirmed')) {
    return 'Bu hesap için e-posta doğrulaması henüz tamamlanmamış.'
  }

  if (message.includes('user already registered') || message.includes('already registered')) {
    return 'Bu e-posta adresi zaten kayıtlı.'
  }

  if (message.includes('weak_password') || message.includes('password should')) {
    return 'Şifre güvenlik kurallarını karşılamıyor. Daha güçlü bir şifre seç.'
  }

  if (message.includes('captcha')) {
    return 'Güvenlik doğrulaması tamamlanamadı. Lütfen tekrar dene.'
  }

  if (message.includes('same password')) {
    return 'Yeni şifre mevcut şifreyle aynı olamaz.'
  }

  if (message.includes('email address') && message.includes('invalid')) {
    return 'Geçerli bir e-posta adresi gir.'
  }

  if (context === 'email-update') {
    return 'E-posta güncelleme işlemi başlatılamadı. Lütfen tekrar dene.'
  }

  if (context === 'password-update') {
    return 'Şifre güncellenemedi. Lütfen tekrar dene.'
  }

  if (context === 'reset-password') {
    return 'Şifre sıfırlama bağlantısı gönderilemedi. Lütfen tekrar dene.'
  }

  if (context === 'signup') {
    return 'Kayıt işlemi tamamlanamadı. Bilgileri kontrol edip tekrar dene.'
  }

  if (context === 'login') {
    return 'Giriş yapılamadı. Bilgilerini kontrol edip tekrar dene.'
  }

  return rawMessage
}
