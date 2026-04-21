// src/hooks/usePWA.js
import { useEffect, useState } from 'react'

export function usePWA() {
  const [installPrompt,   setInstallPrompt]   = useState(null)
  const [isInstalled,     setIsInstalled]     = useState(false)
  const [isOnline,        setIsOnline]        = useState(navigator.onLine)
  const [swRegistration,  setSwRegistration]  = useState(null)
  const [notifPermission, setNotifPermission] = useState(Notification?.permission || 'default')

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        setSwRegistration(reg)
        console.log('✅ Service Worker registrat')
      }).catch(err => console.warn('SW error:', err))
    }
  }, [])

  // Detect if already installed (standalone mode)
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    setIsInstalled(mq.matches || window.navigator.standalone === true)
    mq.addEventListener('change', e => setIsInstalled(e.matches))
  }, [])

  // Capture install prompt
  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Online/offline
  useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Install app
  async function promptInstall() {
    if (!installPrompt) return false
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') { setIsInstalled(true); setInstallPrompt(null) }
    return outcome === 'accepted'
  }

  // Request push notifications
  async function requestNotifications() {
    if (!('Notification' in window)) return false
    const permission = await Notification.requestPermission()
    setNotifPermission(permission)
    return permission === 'granted'
  }

  // Send a local notification (for reminders)
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

  return { installPrompt, isInstalled, isOnline, notifPermission, promptInstall, requestNotifications, notify }
}
