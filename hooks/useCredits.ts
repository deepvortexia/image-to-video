'use client'
import { useAuth } from '../context/AuthContext'

export const useCredits = () => {
  const { profile, refreshProfile } = useAuth()

  const hasCredits = (required = 1) => {
    return profile != null && profile.credits >= required
  }

  const getCredits = () => {
    return profile?.credits || 0
  }

  const deductCredit = async () => {
    if (!profile) return false
    try {
      await refreshProfile()
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'deepvortex-credits-updated' }, 'https://deepvortexai.art')
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
    hasEnoughCredits: (n: number) => hasCredits(n),
    deductCredit,
    refreshProfile,
  }
}
