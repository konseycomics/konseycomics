import { DM_Sans } from 'next/font/google'
import './globals.css'
import ZiyaretTracker from './components/ZiyaretTracker'

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
})

export const metadata = {
  metadataBase: new URL('https://konseycomics.vercel.app'),
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
    url: 'https://konseycomics.vercel.app',
    siteName: 'KonseyComics',
    title: 'KonseyComics – Türkçe Çizgi Roman & Manga Okuma Platformu',
    description: 'Türkçe çizgi roman, manga ve webtoon okuma platformu. Marvel, DC, bağımsız seriler ve daha fazlası.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'KonseyComics' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KonseyComics – Türkçe Çizgi Roman & Manga',
    description: 'Türkçe çizgi roman, manga ve webtoon okuma platformu.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: { icon: '/favicon.ico', shortcut: '/favicon.ico' },
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
      </body>
    </html>
  )
}
