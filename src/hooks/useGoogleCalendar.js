import { useState, useCallback, useEffect, useRef } from 'react'

const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
const TOKEN_KEY = 'gcal_access_token'

export function useGoogleCalendar(clientId) {
  const [connected,  setConnected]  = useState(() => !!sessionStorage.getItem(TOKEN_KEY))
  const [connecting, setConnecting] = useState(false)
  const tokenRef  = useRef(sessionStorage.getItem(TOKEN_KEY))
  const clientRef = useRef(null)

  useEffect(() => {
    if (!clientId) return

    const init = () => {
      clientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (resp) => {
          setConnecting(false)
          if (resp.access_token) {
            tokenRef.current = resp.access_token
            sessionStorage.setItem(TOKEN_KEY, resp.access_token)
            setConnected(true)
          }
        },
        error_callback: () => setConnecting(false),
      })
    }

    if (window.google?.accounts?.oauth2) {
      init()
    } else {
      const existing = document.querySelector('script[src*="accounts.google.com/gsi"]')
      if (existing) {
        existing.addEventListener('load', init)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = init
      document.head.appendChild(script)
    }
  }, [clientId])

  const connect = useCallback(() => {
    if (!clientRef.current) return
    setConnecting(true)
    clientRef.current.requestAccessToken()
  }, [])

  const disconnect = useCallback(() => {
    const t = tokenRef.current
    if (t) window.google?.accounts?.oauth2?.revoke(t, () => {})
    tokenRef.current = null
    sessionStorage.removeItem(TOKEN_KEY)
    setConnected(false)
  }, [])

  const fetchEvents = useCallback(async (year, month) => {
    const token = tokenRef.current
    if (!token) return []

    const timeMin = new Date(year, month - 1, 1).toISOString()
    const timeMax = new Date(year, month, 0, 23, 59, 59).toISOString()

    try {
      const params = new URLSearchParams({
        timeMin, timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '100',
      })
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.status === 401) {
        tokenRef.current = null
        sessionStorage.removeItem(TOKEN_KEY)
        setConnected(false)
        return []
      }
      if (!res.ok) return []
      const json = await res.json()
      return (json.items || []).map(ev => ({
        id: `gcal_${ev.id}`,
        title: ev.summary || '(Sense títol)',
        event_date: (ev.start?.date || ev.start?.dateTime || '').slice(0, 10),
        event_time: ev.start?.dateTime ? ev.start.dateTime.slice(11, 16) : null,
        color: '#4285F4',
        description: ev.description || '',
        is_urgent: false,
        family_members: null,
        _isGoogle: true,
      }))
    } catch {
      return []
    }
  }, [])

  return { connected, connecting, connect, disconnect, fetchEvents }
}
