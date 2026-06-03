'use client'
import { useAuth } from '../context/AuthContext'

export const useCredits = () => {
  const { profile, refreshProfile, ensureProfileLoaded } = useAuth()

  const hasCredits = (required = 1) => {
    return profile != null && profile.credits >= required
  }

  const getCredits = () => {
    return profile?.credits || 0
  }

  // Async so a not-yet-loaded profile doesn't read as "no credits". If profile is
  // null (slow/blocked storage on mobile), load it and retry a few times before
  // concluding the user is actually out of credits.
  const hasEnoughCredits = async (n: number): Promise<boolean> => {
    if (profile != null) return profile.credits >= n
    for (let attempt = 0; attempt < 3; attempt++) {
      const loaded = await ensureProfileLoaded()
      if (loaded != null) return loaded.credits >= n
      await new Promise(resolve => setTimeout(resolve, 400))
    }
    return false
  }

  const deductCredit = async () => {
    if (!profile) return false
    try {
      await refreshProfile()
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'deepvortex-credits-updated' }, 'https://deepvortexai.com')
      }
      return true
    } catch (error) {
      console.error('Error deducting credit:', error)
      return false
    }
  }

  return {
    credits: getCredits(),
    hasCredits: hasCredits(),
    hasEnoughCredits,
    deductCredit,
    refreshProfile,
  }
}
