export const dynamic = "force-dynamic"

const tools = [
  { name: 'AI Chat',       icon: '💬', desc: 'Intelligent AI conversations',    href: 'https://chat.deepvortexai.art' },
  { name: 'Emoticons',     icon: '😃', desc: 'Custom emoji creation',            href: 'https://emoticons.deepvortexai.art' },
  { name: 'Image Gen',     icon: '🎨', desc: 'AI artwork & image generation',    href: 'https://images.deepvortexai.art' },
  { name: 'Remove BG',     icon: '✂️', desc: 'Remove backgrounds instantly',     href: 'https://bgremover.deepvortexai.art' },
  { name: 'Upscaler',      icon: '🔍', desc: 'Upscale images up to 4x',          href: 'https://upscaler.deepvortexai.art' },
  { name: '3D Generator',  icon: '🧊', desc: 'Convert images to 3D models',      href: 'https://3d.deepvortexai.art' },
  { name: 'Voice Gen',     icon: '🎙️', desc: 'AI voice generation',              href: 'https://voice.deepvortexai.art' },
  { name: 'Deep Vortex Hub', icon: '🌀', desc: 'Explore the full AI ecosystem', href: 'https://deepvortexai.art' },
]

const steps = [
  {
    number: 1,
    title: 'Upload Your Image',
    description: 'Upload any photo or AI-generated image to animate. Supports JPG, PNG, and WEBP formats up to 10MB.',
  },
  {
    number: 2,
    title: 'AI Animates It',
    description: 'Our AI brings your image to life with smooth, natural motion. Optionally describe the motion you want for more control.',
  },
  {
    number: 3,
    title: 'Download Your Video',
    description: 'Download your MP4 video ready to share anywhere — social media, presentations, or your creative projects.',
  },
]

export default function HowToUsePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#ffffff',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem 1rem 1rem',
        position: 'relative',
      }}>
        <a
          href="/"
          style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.5)',
            color: '#D4AF37',
            borderRadius: '8px',
            padding: '0.4rem 1rem',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.9rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          ← Back to Tool
        </a>

        <div style={{ height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
          <img
            src="/logotinyreal.webp"
            alt="Deep Vortex"
            style={{ height: '180px', width: 'auto', objectFit: 'contain' }}
          />
        </div>

        <h1 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 'clamp(1.4rem, 4vw, 2.4rem)',
          fontWeight: 900,
          margin: '1rem 0 0.5rem',
          background: 'linear-gradient(135deg, #E8C87C 0%, #D4AF37 50%, #B8960C 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '2px',
          textAlign: 'center',
          lineHeight: 1.3,
        }}>
          How to Use the AI Image to Video Generator
        </h1>

        <p style={{ color: '#D4AF37', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          🎬 Animate any image in seconds
        </p>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem 4rem' }}>

        {/* Steps */}
        <section style={{ marginTop: '2.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {steps.map((step) => (
              <div
                key={step.number}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1.25rem',
                  background: 'rgba(26,26,26,0.8)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                }}
              >
                {/* Gold numbered circle */}
                <div style={{
                  flexShrink: 0,
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #E8C87C 0%, #D4AF37 50%, #B8960C 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Orbitron', sans-serif",
                  fontWeight: 900,
                  fontSize: '1.3rem',
                  color: '#0a0a0a',
                  boxShadow: '0 0 16px rgba(212,175,55,0.4)',
                }}>
                  {step.number}
                </div>

                <div>
                  <h2 style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#E8C87C',
                    margin: '0 0 0.5rem',
                    letterSpacing: '1px',
                  }}>
                    {step.title}
                  </h2>
                  <p style={{
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                    margin: 0,
                  }}>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pro Tip */}
        <section style={{
          marginTop: '2rem',
          background: 'rgba(212,175,55,0.08)',
          border: '1px solid rgba(212,175,55,0.35)',
          borderRadius: '16px',
          padding: '1.5rem',
        }}>
          <p style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#D4AF37',
            letterSpacing: '2px',
            margin: '0 0 0.6rem',
            textTransform: 'uppercase',
          }}>
            ✨ Pro Tip
          </p>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '0.95rem',
            lineHeight: 1.65,
            margin: 0,
          }}>
            Images with clear subjects and simple backgrounds produce the best animations. Portrait and landscape orientations both work great.
          </p>
        </section>

        {/* Other Tools */}
        <section style={{ marginTop: '3rem' }}>
          <h2 style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '1.15rem',
            fontWeight: 800,
            color: '#D4AF37',
            letterSpacing: '2px',
            textAlign: 'center',
            marginBottom: '1.5rem',
            textTransform: 'uppercase',
          }}>
            Explore Our Other AI Tools
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '1rem',
          }}>
            {tools.map((tool) => (
              <a
                key={tool.name}
                href={tool.href}
                target={tool.href.startsWith('http') ? '_blank' : undefined}
                rel={tool.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(26,26,26,0.8)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  borderRadius: '12px',
                  padding: '1.25rem 1rem',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s, background 0.2s, transform 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.borderColor = 'rgba(212,175,55,0.6)'
                  el.style.background = 'rgba(212,175,55,0.08)'
                  el.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.borderColor = 'rgba(212,175,55,0.2)'
                  el.style.background = 'rgba(26,26,26,0.8)'
                  el.style.transform = 'translateY(0)'
                }}
              >
                <span style={{ fontSize: '2rem', lineHeight: 1 }}>{tool.icon}</span>
                <span style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#E8C87C',
                  textAlign: 'center',
                  letterSpacing: '0.5px',
                }}>
                  {tool.name}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.55)',
                  textAlign: 'center',
                  lineHeight: 1.4,
                }}>
                  {tool.desc}
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #E8C87C 0%, #D4AF37 50%, #B8960C 100%)',
              color: '#0a0a0a',
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 700,
              fontSize: '0.95rem',
              letterSpacing: '1px',
              padding: '0.85rem 2rem',
              borderRadius: '50px',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
            }}
          >
            🎬 Start Creating Now
          </a>
        </div>
      </main>
    </div>
  )
}
