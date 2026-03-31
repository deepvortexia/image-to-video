import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Use the AI Image to Video Tool | Deep Vortex AI',
  description: 'Step-by-step guide to converting images into AI-generated videos with Deep Vortex AI. Upload your image and animate it in seconds.',
  alternates: { canonical: 'https://video.deepvortexai.com/how-to-use' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
