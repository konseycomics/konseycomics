import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600'] })

export const metadata = {
  title: {
    default: 'KonseyComics — Çizgi Roman & Manga Okuma Platformu',
    template: '%s | KonseyComics',
  },
  description: 'Türkçe çizgi roman, manga ve webtoon okuma platformu.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet" />
      </head>
      <body className={dmSans.className}>
        {children}
      </body>
    </html>
  )
}