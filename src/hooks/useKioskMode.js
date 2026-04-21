import { useEffect, useState, useCallback, useRef } from 'react'

export function useKioskMode(enabled = true) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const wakeLockRef = useRef(null)
  const supportsFullscreen = !!(
    document.documentElement.requestFullscreen ||
    document.documentElement.webkitRequestFullscreen
  )

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator) || wakeLockRef.current) return
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
      wakeLockRef.current.addEventListener('release', () => {
        wakeLockRef.current = null
      })
    } catch {
      // no disponible o denegat
    }
  }, [])

  const enterFullscreen = useCallback(async () => {
    if (!supportsFullscreen) return
    try {
      const el = document.documentElement
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
    } catch {
      // l'usuari ho va denegar
    }
    await requestWakeLock()
  }, [supportsFullscreen, requestWakeLock])

  // Detectar canvis d'estat de pantalla completa
  useEffect(() => {
    if (!enabled) return

    const onFSChange = () => {
      const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement)
      setIsFullscreen(isFull)
    }

    document.addEventListener('fullscreenchange', onFSChange)
    document.addEventListener('webkitfullscreenchange', onFSChange)

    // Comprovar estat inicial (útil si ja és PWA fullscreen)
    onFSChange()

    return () => {
      document.removeEventListener('fullscreenchange', onFSChange)
      document.removeEventListener('webkitfullscreenchange', onFSChange)
    }
  }, [enabled])

  // Re-adquirir wake lock quan la pàgina torna a ser visible
  useEffect(() => {
    if (!enabled) return
    const onVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock()
    }
    document.addEventListener('visibilitychange', onVisibility)
    requestWakeLock()
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [enabled, requestWakeLock])

  // Bloquejar orientació a landscape
  useEffect(() => {
    if (!enabled) return
    try {
      screen.orientation?.lock('landscape').catch(() => {})
    } catch {}
  }, [enabled])

  return {
    isFullscreen,
    enterFullscreen,
    supportsFullscreen,
  }
}
