'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import './VideoGallery.css'

interface FavoriteItem {
  id: string
  resultUrl: string
  createdAt: number
}

interface VideoGalleryProps {
  refreshKey?: number
}

export function VideoGallery({ refreshKey }: VideoGalleryProps) {
  const { session } = useAuth()
  const token = session?.access_token

  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(false)
  const [brokenVideos, setBrokenVideos] = useState<Set<string>>(new Set())
  const [isOpen, setIsOpen] = useState(false)

  const loadFavorites = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setFavorites((data.favorites || []).map((f: { id: string; result_url: string; created_at: string }) => ({
          id: f.id,
          resultUrl: f.result_url,
          createdAt: new Date(f.created_at).getTime(),
        })))
      }
    } catch {}
    finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadFavorites()
  }, [loadFavorites, refreshKey])

  const handleDelete = async (id: string) => {
    if (!token) return
    try {
      await fetch(`/api/favorites?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setFavorites(prev => prev.filter(f => f.id !== id))
    } catch {}
  }

  const handleDownload = async (resultUrl: string, id: string) => {
    try {
      const res = await fetch(resultUrl, { mode: 'cors' })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ai-video-${id.slice(0, 8)}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      window.open(resultUrl, '_blank')
    }
  }

  if (!token) return null

  return (
    <div className="favorites-wrapper">
      <div className="favorites-btn-row">
        <button
          className={`gallery-toggle${isOpen ? ' gallery-toggle-active' : ''}`}
          onClick={() => setIsOpen(o => !o)}
        >
          ⭐ Favorites{favorites.length > 0 ? ` (${favorites.length})` : ''}
        </button>
      </div>
      {isOpen && (
        <section className="favorites-section">
          <h2 className="favorites-heading">⭐ Saved Videos</h2>
          {loading ? (
            <p className="favorites-loading">Loading...</p>
          ) : favorites.length === 0 ? (
            <p className="favorites-loading">No favorites saved yet.</p>
          ) : (
            <div className="gallery-grid">
              {favorites.map((item) => (
                <div key={item.id} className="gallery-item">
                  {brokenVideos.has(item.id) ? (
                    <div className="image-placeholder-broken">
                      <span className="placeholder-icon">😕</span>
                      <p className="placeholder-text">Video unavailable</p>
                    </div>
                  ) : (
                    <video
                      src={item.resultUrl}
                      className="gallery-item-video"
                      controls
                      playsInline
                      preload="metadata"
                      onError={() => setBrokenVideos(prev => new Set(prev).add(item.id))}
                    />
                  )}
                  <div className="gallery-item-info">
                    <p className="gallery-date">{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    className="gallery-download-btn"
                    onClick={(e) => { e.stopPropagation(); handleDownload(item.resultUrl, item.id) }}
                    disabled={brokenVideos.has(item.id)}
                    title="Download"
                    aria-label="Download video"
                  >💾</button>
                  <button
                    className="gallery-delete-btn"
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                    title="Remove from favorites"
                    aria-label="Remove from favorites"
                  >🗑️</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
