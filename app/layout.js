import { DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import ZiyaretTracker from './components/ZiyaretTracker'

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
})

function normalizeSiteUrl(value) {
  if (!value) return 'https://konseycomics.com'
  return value.startsWith('http') ? value : `https://${value}`
}

const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
)

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'KonseyComics – Türkçe Çizgi Roman & Manga Okuma Platformu',
    template: '%s | KonseyComics',
  },
  description: 'Türkçe çizgi roman, manga ve webtoon okuma platformu. Marvel, DC, bağımsız seriler ve daha fazlası.',
  keywords: ['çizgi roman', 'manga', 'webtoon', 'türkçe', 'okuma', 'marvel', 'dc', 'konseycomics'],
  authors: [{ name: 'KonseyComics' }],
  creator: 'KonseyComics',
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: SITE_URL,
    siteName: 'KonseyComics',
    title: 'KonseyComics – Türkçe Çizgi Roman & Manga Okuma Platformu',
    description: 'Türkçe çizgi roman, manga ve webtoon okuma platformu. Marvel, DC, bağımsız seriler ve daha fazlası.',
    images: [{ url: '/konseycomics.jpg', width: 883, height: 883, alt: 'KonseyComics' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KonseyComics – Türkçe Çizgi Roman & Manga',
    description: 'Türkçe çizgi roman, manga ve webtoon okuma platformu.',
    images: ['/konseycomics.jpg'],
  },
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: {
    icon: '/konseycomics.jpg',
    shortcut: '/konseycomics.jpg',
    apple: '/konseycomics.jpg',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={dmSans.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)", margin: 0, padding: 0, background: '#000' }}>
        <ZiyaretTracker />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
