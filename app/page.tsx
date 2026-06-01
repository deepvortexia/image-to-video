'use client'
import { useState, useEffect, useRef } from 'react'
import Header from '../components/Header'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { AuthModal } from '../components/AuthModal'
import { PricingModal } from '../components/PricingModal'
import { Notification } from '../components/Notification'
import { useCredits } from '../hooks/useCredits'
import { supabase } from '../lib/supabase'
import { VideoGallery } from '../components/VideoGallery'

const COST_CREDITS = 2
const CREDIT_REFRESH_ERROR = 'Payment successful, but there was a temporary issue syncing your credits. Please refresh the page to see your updated balance.'
const PENDING_STRIPE_SESSION_KEY = 'pending_stripe_session'

const cleanUrlParams = () => window.history.replaceState({}, '', window.location.pathname)

function AppContent() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState('')
  const [motionPrompt, setMotionPrompt] = useState('')
  const [resultVideo, setResultVideo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [toast, setToast] = useState<{ title: string; message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [favRefreshKey, setFavRefreshKey] = useState(0)
  const [favSaving, setFavSaving] = useState(false)
  const [favSaved, setFavSaved] = useState(false)
  const [loadingStage, setLoadingStage] = useState<0 | 1 | 2 | 3>(0)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const { user, session, loading } = useAuth()
  const { hasEnoughCredits, refreshProfile } = useCredits()

  const processedSessionIdRef = useRef<string | null>(null)
  const processedPendingSessionRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { setIsLoaded(true) }, [])

  // Handle Stripe return
  useEffect(() => {
    const handleStripeReturn = async () => {
      const params = new URLSearchParams(window.location.search)
      const sessionId = params.get('session_id')
      if (!sessionId) return
      if (processedSessionIdRef.current === sessionId) return
      if (loading) return
      processedSessionIdRef.current = sessionId
      if (user) {
        try { await refreshProfile(); setShowNotification(true); cleanUrlParams() }
        catch { setToast({ title: 'Credit Sync Issue', message: CREDIT_REFRESH_ERROR, type: 'warning' }) }
      } else {
        localStorage.setItem(PENDING_STRIPE_SESSION_KEY, sessionId)
        cleanUrlParams()
      }
    }
    handleStripeReturn()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user])

  useEffect(() => {
    const processPending = async () => {
      if (!user) { processedPendingSessionRef.current = false; return }
      if (processedPendingSessionRef.current) return
      const pendingSession = localStorage.getItem(PENDING_STRIPE_SESSION_KEY)
      if (pendingSession) {
        processedPendingSessionRef.current = true
        try { await refreshProfile(); localStorage.removeItem(PENDING_STRIPE_SESSION_KEY); setShowNotification(true) }
        catch { processedPendingSessionRef.current = false }
      }
    }
    processPending()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleFileSelect = (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setToast({ title: 'Invalid File', message: 'Please upload a JPG, PNG, or WEBP image.', type: 'error' })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setToast({ title: 'File Too Large', message: 'Maximum file size is 10MB.', type: 'error' })
      return
    }
    setResultVideo('')
    setUploadedFile(file)
    if (uploadedImageUrl) URL.revokeObjectURL(uploadedImageUrl)
    setUploadedImageUrl(URL.createObjectURL(file))
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }

  const uploadInputImage = async (file: File, userId: string): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${userId}/${Date.now()}-input.${ext}`
    const { error } = await supabase.storage
      .from('video-inputs')
      .upload(fileName, file, { contentType: file.type, upsert: false })
    if (error) throw new Error(`Upload failed: ${error.message}`)
    const { data: { publicUrl } } = supabase.storage.from('video-inputs').getPublicUrl(fileName)
    return publicUrl
  }

  const generateVideo = async () => {
    if (!uploadedFile) {
      setToast({ title: 'No Image', message: 'Please upload an image first.', type: 'warning' })
      return
    }
    if (!user) {
      setIsAuthModalOpen(true)
      return
    }
    if (!hasEnoughCredits(COST_CREDITS)) {
      setToast({ title: 'Insufficient Credits', message: `Video generation costs ${COST_CREDITS} credits. Please purchase more.`, type: 'warning' })
      setIsPricingModalOpen(true)
      return
    }

    const clearIntervals = () => {
      if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null }
      if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null }
    }

    setIsLoading(true)
    setResultVideo('')
    setToast(null)
    setLoadingStage(1)
    setLoadingProgress(0)
    setElapsedSeconds(0)

    // Elapsed timer — ticks every second
    elapsedIntervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)

    try {
      // Stage 1: Upload image (0 → 10%)
      setLoadingProgress(4)
      const imageUrl = await uploadInputImage(uploadedFile, user.id)
      setLoadingProgress(10)

        // Stage 2: Submit job to API
      setLoadingStage(2)

      const token = session?.access_token

      const postRes = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ imageUrl, motionPrompt }),
      })

      if (!postRes.ok) {
        clearIntervals()
        const data = await postRes.json().catch(() => ({}))
        switch (postRes.status) {
          case 401:
            setToast({ title: 'Session Expired', message: 'Please refresh and sign in again. No credits were deducted.', type: 'error' })
            break
          case 402:
            setToast({ title: 'Insufficient Credits', message: "You don't have enough credits. Purchase more to continue.", type: 'warning' })
            setIsPricingModalOpen(true)
            break
          case 429:
            setToast({ title: 'Too Many Requests', message: 'Please wait before trying again. No credits were deducted.', type: 'warning' })
            break
          default:
            setToast({ title: 'Generation Failed', message: (data.error || 'An unexpected error occurred') + '. No credits were deducted.', type: 'error' })
        }
        return
      }

      const { id } = await postRes.json()

      // Asymptotic progress drift while polling (10 → 85%)
      progressIntervalRef.current = setInterval(() => {
        setLoadingProgress(prev => {
          const gap = 85 - prev
          return gap < 0.05 ? prev : prev + gap * 0.003
        })
      }, 100)

      // Poll GET /api/generate-video?id= every 3 seconds
      const pollStart = Date.now()
      let videoUrl = ''
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 3000))

        if (Date.now() - pollStart > 270_000) {
          throw new Error('Video generation timed out after 4.5 minutes')
        }

        const pollRes = await fetch(`/api/generate-video?id=${encodeURIComponent(id)}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })

        if (!pollRes.ok) {
          const data = await pollRes.json().catch(() => ({}))
          throw new Error(data.error || `Polling failed (${pollRes.status})`)
        }

        const pollData = await pollRes.json()

        if (pollData.status === 'succeeded') {
          videoUrl = pollData.video
          break
        }
        if (pollData.status === 'failed') {
          throw new Error(pollData.error || 'Video generation failed')
        }
        // 'starting' | 'processing' — keep polling
      }

      if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null }

      // Stage 3: Finalizing (85 → 100%)
      setLoadingStage(3)
      setLoadingProgress(85)
      await new Promise<void>(resolve => {
        let p = 85
        const finalize = setInterval(() => {
          p += 3
          setLoadingProgress(Math.min(p, 100))
          if (p >= 100) { clearInterval(finalize); resolve() }
        }, 40)
      })

      setResultVideo(videoUrl)
      setFavSaved(false)
      await refreshProfile()
    } catch (err: unknown) {
      setToast({ title: 'Generation Failed', message: err instanceof Error ? err.message : 'An unexpected error occurred.', type: 'error' })
    } finally {
      clearIntervals()
      setIsLoading(false)
      setLoadingStage(0)
      setLoadingProgress(0)
    }
  }

  const downloadVideo = async () => {
    if (!resultVideo) return
    const filename = `ai-video-${Date.now()}.mp4`
    try {
      const response = await fetch(resultVideo)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      window.open(resultVideo, '_blank')
    }
  }

  const resetAll = () => {
    setResultVideo('')
    setUploadedFile(null)
    if (uploadedImageUrl) URL.revokeObjectURL(uploadedImageUrl)
    setUploadedImageUrl('')
    setMotionPrompt('')
    setFavSaved(false)
  }

  const saveFavorite = async () => {
    if (!resultVideo || !session?.access_token) return
    setFavSaving(true)
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ result_url: resultVideo }),
      })
      if (res.ok) {
        setFavSaved(true)
        setFavRefreshKey(k => k + 1)
      } else {
        setToast({ title: 'Save Failed', message: 'Could not save to favorites.', type: 'error' })
      }
    } catch {
      setToast({ title: 'Save Failed', message: 'Could not save to favorites.', type: 'error' })
    } finally {
      setFavSaving(false)
    }
  }

  return (
    <div className={`app ${isLoaded ? 'fade-in' : ''}`}>
      <Header />

      <div className="app-container">
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((left, i) => (
          <div key={i} className="particle" style={{ left: `${left}%`, animationDelay: `${i * 0.5}s` }} />
        ))}
      </div>

      <div className="main-content">
        <div className="prompt-section-wrapper">
          <h3 className="prompt-section-title"><span className="title-icon">🖼️</span>Upload Your Image</h3>

          <div
            className={`upload-zone${isDragging ? ' upload-zone-dragging' : ''}${uploadedImageUrl ? ' upload-zone-has-image' : ''}`}
            onClick={() => !uploadedImageUrl && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {uploadedImageUrl ? (
              <div className="upload-zone-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploadedImageUrl} alt="Uploaded" className="upload-preview-img" />
                <button className="upload-change-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
                  Change Image
                </button>
              </div>
            ) : (
              <div className="upload-zone-placeholder">
                <span className="upload-icon">📁</span>
                <p className="upload-text">Drop your image here or <span className="upload-link">browse</span></p>
                <p className="upload-hint">JPG, PNG, WEBP · Max 10MB</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />

          <div className="extra-inputs">
            <div>
              <label className="input-label">Motion Prompt <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <textarea
                className="motion-prompt-textarea"
                placeholder="Describe the motion... e.g. 'gentle breeze blowing through hair, camera slowly zooming in'"
                value={motionPrompt}
                onChange={(e) => setMotionPrompt(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>

            </div>

          <button
            className="generate-btn-enhanced"
            onClick={generateVideo}
            disabled={isLoading || !uploadedFile}
          >
            {isLoading ? (
              <><span className="spinner" /><span className="btn-text">Generating Video...</span></>
            ) : (
              <><span className="btn-icon">🎬</span><span className="btn-text">Generate Video</span></>
            )}
          </button>
          <p className="credit-note">2 credits per generation</p>
        </div>

        {isLoading && (
          <div className="loading-section">
            <div className="progress-stages">
              <div className={`progress-stage${loadingStage === 1 ? ' stage-active' : loadingStage > 1 ? ' stage-done' : ''}`}>
                <div className="stage-dot" />
                <span>Uploading image...</span>
              </div>
              <div className={`progress-stage${loadingStage === 2 ? ' stage-active' : loadingStage > 2 ? ' stage-done' : ''}`}>
                <div className="stage-dot" />
                <span>AI is animating your image...</span>
              </div>
              <div className={`progress-stage${loadingStage === 3 ? ' stage-active' : ''}`}>
                <div className="stage-dot" />
                <span>Finalizing video...</span>
              </div>
            </div>

            <div className="progress-bar-wrapper">
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${loadingProgress}%` }} />
              </div>
              {loadingProgress > 0 && (
                <div className="progress-bar-tip" style={{ left: `${loadingProgress}%` }} />
              )}
            </div>

            <div className="progress-footer">
              <span className="progress-percent">{Math.round(loadingProgress)}%</span>
              <span className="progress-elapsed">{elapsedSeconds}s...</span>
            </div>
          </div>
        )}

        {resultVideo && !isLoading && (
          <div className="result-section slide-up">
            <h2 className="result-title">Video Generated ✨</h2>
            <div className="video-result-container">
              <video
                src={resultVideo}
                className="result-video"
                controls
                autoPlay
                loop
                playsInline
              />
            </div>
            <div className="action-buttons">
              <button onClick={downloadVideo} className="action-btn download-btn">
                <span>📥</span> Download MP4
              </button>
              {user && (
                <button
                  onClick={saveFavorite}
                  className="action-btn"
                  disabled={favSaving || favSaved}
                  style={{ background: favSaved ? 'linear-gradient(135deg, #2a5c2a, #3a7c3a)' : undefined }}
                >
                  <span>{favSaved ? '✅' : '❤️'}</span> {favSaved ? 'Saved!' : favSaving ? 'Saving...' : 'Save to Favorites'}
                </button>
              )}
              <button onClick={resetAll} className="action-btn regenerate-btn">
                <span>🔄</span> New Video
              </button>
            </div>
          </div>
        )}
      </div>

      <VideoGallery refreshKey={favRefreshKey} />

      <section className="ecosystem-section">
        <h2 className="ecosystem-heading">Complete AI Ecosystem</h2>
        <div className="ecosystem-grid">
          {[ // ecosystem updated
            { name: 'Image Editor',  icon: '✏️', desc: 'Edit any image with AI',        status: 'Available Now', isActive: true,  href: 'https://image-editor.deepvortexai.com', isCurrent: false },
            { name: 'Emoticons',     icon: '😃', desc: 'Custom emoji creation',         status: 'Available Now', isActive: true,  href: 'https://emoticons.deepvortexai.com',  isCurrent: false },
            { name: 'Image Gen',     icon: '🎨', desc: 'AI artwork',                    status: 'Available Now', isActive: true,  href: 'https://images.deepvortexai.com',     isCurrent: false },
            { name: 'Logo Gen',      icon: '🛡️', desc: 'AI logo creation',             status: 'Available Now', isActive: true,  href: 'https://logo.deepvortexai.com',       isCurrent: false },
            { name: 'Avatar Gen',    icon: '🎭', desc: 'AI portrait styles',            status: 'Available Now', isActive: true,  href: 'https://avatar.deepvortexai.com',     isCurrent: false },
            { name: 'Remove BG',     icon: '✂️', desc: 'Remove backgrounds instantly',  status: 'Available Now', isActive: true,  href: 'https://bgremover.deepvortexai.com',  isCurrent: false },
            { name: 'Upscaler',      icon: '🔍', desc: 'Upscale images up to 4x',       status: 'Available Now', isActive: true,  href: 'https://upscaler.deepvortexai.com',   isCurrent: false },
            { name: '3D Generator',  icon: '🧊', desc: 'Image to 3D model',             status: 'Available Now', isActive: true,  href: 'https://3d.deepvortexai.com',         isCurrent: false },
            { name: 'Image → Video', icon: '🎬', desc: 'Animate images with AI',        status: 'Available Now', isActive: true,  href: 'https://video.deepvortexai.com',      isCurrent: true  },
            { name: 'Voice Gen',     icon: '🎙️', desc: 'AI Voice Generator',            status: 'Available Now', isActive: true,  href: 'https://voice.deepvortexai.com',      isCurrent: false },
          ].map((tool, idx) => (
            <div
              key={idx}
              className={`ecosystem-card ${tool.isActive ? 'eco-card-active' : 'eco-card-inactive'}${tool.isCurrent ? ' eco-glow' : ''}`}
              onClick={() => { if (tool.isActive && !tool.isCurrent) window.location.href = tool.href }}
              role={tool.isActive && !tool.isCurrent ? 'button' : 'presentation'}
              style={{ cursor: tool.isActive && !tool.isCurrent ? 'pointer' : 'default' }}
            >
              <div className="eco-icon">{tool.icon}</div>
              <h3 className="eco-title">{tool.name}</h3>
              <p className="eco-desc">{tool.desc}</p>
              <div className="eco-status-container">
                <span className={`eco-status-badge ${tool.isActive ? 'eco-badge-active' : 'eco-badge-upcoming'}`}>
                  {tool.status}
                </span>
                {tool.isCurrent && <div className="eco-current-label">CURRENT TOOL</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <a href="https://deepvortexai.com" className="footer-tagline footer-tagline-link">
          Deep Vortex AI - Building the complete AI creative ecosystem
        </a>
        <div className="footer-social">
          <a href="https://www.tiktok.com/@deepvortexai" target="_blank" rel="noopener noreferrer" className="footer-social-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z"/>
            </svg>
            TikTok
          </a>
          <a href="https://x.com/deepvortexart" target="_blank" rel="noopener noreferrer" className="footer-social-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            X
          </a>
          <a href="mailto:admin@deepvortexai.com" className="footer-contact-btn">Contact Us</a>
        </div>
      </footer>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
      {showNotification && (
        <Notification title="Payment Successful!" message="Your credits have been added." onClose={() => setShowNotification(false)} />
      )}
      {toast && (
        <Notification title={toast.title} message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}

export default function Home() {
  return (
    <>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      <a href="https://deepvortexai.com/game" target="_blank" rel="noopener noreferrer" className="play-earn-fab">⚡ Play & Earn</a>
    </>
  )
}
