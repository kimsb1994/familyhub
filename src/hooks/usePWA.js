// src/hooks/usePWA.js
import { useEffect, useState } from 'react'

// iOS Safari no soporta beforeinstallprompt ni Push fuera de PWA instalada
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent))

export function usePWA() {
  const [installPrompt,   setInstallPrompt]   = useState(null)
  const [isInstalled,     setIsInstalled]     = useState(false)
  const [isOnline,        setIsOnline]        = useState(navigator.onLine)
  const [swRegistration,  setSwRegistration]  = useState(null)
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  )

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        setSwRegistration(reg)
      }).catch(err => console.warn('SW error:', err))
    }
  }, [])

  // Detect if already installed (standalone mode)
  useEffect(() => {
    const mq = globalThis.matchMedia('(display-mode: standalone)')
    setIsInstalled(mq.matches || navigator.standalone === true)
    mq.addEventListener('change', e => setIsInstalled(e.matches))
  }, [])

  // Capture install prompt (solo Chrome/Android, nunca en iOS)
  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e) }
    globalThis.addEventListener('beforeinstallprompt', handler)
    return () => globalThis.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Online/offline
  useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    globalThis.addEventListener('online',  on)
    globalThis.addEventListener('offline', off)
    return () => { globalThis.removeEventListener('online', on); globalThis.removeEventListener('offline', off) }
  }, [])

  // Install app (solo disponible en Chrome/Android)
  async function promptInstall() {
    if (!installPrompt) return false
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') { setIsInstalled(true); setInstallPrompt(null) }
    return outcome === 'accepted'
  }

  // Request push notifications.
  // En iOS Safari (no-PWA), Notification no existe o no funciona — saltamos.
  async function requestNotifications() {
    if (typeof Notification === 'undefined') return false
    // En iOS las notificaciones solo funcionan en PWA instalada (standalone)
    if (isIOS && !navigator.standalone) return false
    const permission = await Notification.requestPermission()
    setNotifPermission(permission)
    return permission === 'granted'
  }

  // Send a local notification via Service Worker (funciona en más contextos que new Notification())
  async function notify(title, body, url = '/') {
    if (notifPermission !== 'granted') return
    if (swRegistration) {
      swRegistration.showNotification(title, {
        body,
        icon:    '/icons/icon-192.png',
        badge:   '/icons/icon-72.png',
        vibrate: [200, 100, 200],
        data:    { url },
      })
    }
  }

  return { installPrompt, isInstalled, isOnline, isIOS, notifPermission, promptInstall, requestNotifications, notify }
}
