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
  description: 'Transform any image into a stunning AI-generated video with motion and life. Animate your photos and artwork instantly. Part of the Deep Vortex AI creative ecosystem.',
  keywords: ['image to video', 'AI video generator', 'animate image', 'AI animation', 'photo to video', 'Deep Vortex AI', 'hailuo', 'minimax', 'AI creative tools'],
  authors: [{ name: 'Deep Vortex AI' }],
  creator: 'Deep Vortex AI',
  publisher: 'Deep Vortex AI',
  robots: 'index, follow, max-image-preview:large',
  verification: {
    google: '76BAsq1e-Ol7tA8HmVLi9LgMDXpjyBIQvdAx6bZXF7Q',
  },
  metadataBase: new URL('https://video.deepvortexai.com'),
  alternates: {
    canonical: 'https://video.deepvortexai.com',
  },
  openGraph: {
    type: 'website',
    url: 'https://video.deepvortexai.com',
    title: 'AI Image to Video — Deep Vortex AI',
    description: 'Transform any image into a stunning AI-generated video with motion and life. Animate your photos instantly.',
    siteName: 'Deep Vortex AI',
    locale: 'en_US',
    images: [{ url: 'https://video.deepvortexai.com/deepgoldremoveetiny.png', width: 512, height: 512, alt: 'Deep Vortex AI Image to Video' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@deepvortexart',
    creator: '@deepvortexart',
    title: 'AI Image to Video — Deep Vortex AI',
    description: 'Transform any image into a stunning AI-generated video with motion and life.',
    images: ['https://video.deepvortexai.com/deepgoldremoveetiny.png'],
  },
  icons: {
    icon: [
      { url: 'https://video.deepvortexai.com/favicon.ico?v=4', sizes: 'any' },
    ],
    apple: 'https://video.deepvortexai.com/apple-touch-icon.png?v=4',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-title': 'Deep Vortex AI',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'application-name': 'Deep Vortex AI Image to Video',
    'ai-content-declaration': 'AI-powered creative tools',
    'perplexity-verification': 'deepvortexai',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#D4AF37',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="llms" href="/llms.txt" type="text/plain" />
        <meta name="revisit-after" content="3 days" />
        <link rel="dns-prefetch" href="https://api-inference.huggingface.co" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Deep Vortex AI Image to Video',
              description: 'Transform any image into a stunning AI-generated video with motion and life.',
              url: 'https://video.deepvortexai.com',
              images: 'https://video.deepvortexai.com/deepgoldremoveetiny.png',
              applicationCategory: 'MultimediaApplication',
              operatingSystem: 'All',
              offers: {
                '@type': 'AggregateOffer',
                priceCurrency: 'USD',
                lowPrice: '4.99',
                highPrice: '99.99',
                offerCount: '5',
              },
              creator: {
                '@type': 'Organization',
                name: 'Deep Vortex AI',
                url: 'https://deepvortexai.com',
                sameAs: [
                  'https://www.tiktok.com/@deepvortexai',
                  'https://x.com/deepvortexart',
                ],
              },
              featureList: [
                'Image to Video Generation',
                'AI-Powered Animation',
                'Multiple Video Styles',
                'Instant Download',
                'Credits System',
              ],
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
