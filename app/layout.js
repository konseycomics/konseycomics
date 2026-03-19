import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600'] })

export const metadata = {
  title: 'KonseyComics',
  description: 'Çizgi roman ve manga okuma platformu',
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className={dmSans.className}>
        {children}
      </body>
    </html>
  )
}