import type { Metadata, Viewport } from 'next'
import { Orbitron, Inter } from 'next/font/google'
import './globals.css'

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-orbitron',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AI Image to Video — Deep Vortex AI',
  description: 'Transform any image into a stunning AI-generated video with motion and life. Part of the Deep Vortex AI creative ecosystem.',
  keywords: ['image to video', 'AI video generator', 'animate image', 'Deep Vortex AI', 'hailuo', 'minimax'],
  authors: [{ name: 'Deep Vortex AI' }],
  openGraph: {
    type: 'website',
    title: 'AI Image to Video — Deep Vortex AI',
    description: 'Transform any image into a stunning AI-generated video.',
    siteName: 'Deep Vortex AI',
  },
}

export const viewport: Viewport = {
  themeColor: '#D4AF37',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  )
}
