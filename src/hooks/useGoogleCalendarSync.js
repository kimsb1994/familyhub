import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || ''
const SCOPE            = 'https://www.googleapis.com/auth/calendar'
const POLL_MS          = 5 * 60 * 1000 // refrescar Google Calendar cada 5 minutos

export function useGoogleCalendarSync() {
  const [connected,  setConnected]  = useState(false)
  const [checking,   setChecking]   = useState(true)
  const [gcalEvents, setGcalEvents] = useState([])
  const monthRef   = useRef({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 })
  const pollRef    = useRef(null)

  // ── Obtener access token válido (Edge Function refresca si es necesario) ──────
  const getToken = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('gcal-token')
    if (error || !data?.connected) return null
    return data.access_token
  }, [])

  // ── Cargar eventos de Google Calendar para el mes dado ────────────────────────
  const fetchGcalEvents = useCallback(async (year, month) => {
    const token = await getToken()
    if (!token) return

    const timeMin = new Date(year, month - 1, 1).toISOString()
    const timeMax = new Date(year, month, 0, 23, 59, 59).toISOString()
    const params  = new URLSearchParams({
      timeMin, timeMax,
      singleEvents: 'true',
      orderBy:      'startTime',
      maxResults:   '250',
    })

    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.status === 401) { setConnected(false); return }
      if (!res.ok) return

      const json = await res.json()
      setGcalEvents(
        (json.items || [])
          .filter(ev => ev.status !== 'cancelled')
          .map(ev => ({
            id:           `gcal_${ev.id}`,
            gcal_id:      ev.id,
            title:        ev.summary || '(Sense títol)',
            event_date:   (ev.start?.date || ev.start?.dateTime || '').slice(0, 10),
            event_time:   ev.start?.dateTime ? ev.start.dateTime.slice(11, 16) : null,
            color:        '#4285F4',
            description:  ev.description || '',
            is_urgent:    false,
            family_members: null,
            _isGoogle:    true,
          }))
      )
    } catch { /* red caída, ignorar silenciosamente */ }
  }, [getToken])

  // ── Iniciar/detener polling cuando cambia el estado de conexión ───────────────
  const startPolling = useCallback((year, month) => {
    if (pollRef.current) clearInterval(pollRef.current)
    fetchGcalEvents(year, month)
    pollRef.current = setInterval(() => {
      fetchGcalEvents(monthRef.current.year, monthRef.current.month)
    }, POLL_MS)
  }, [fetchGcalEvents])

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    setGcalEvents([])
  }, [])

  // ── Comprobar conexión al montar ──────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.functions.invoke('gcal-token')
      const isConnected = data?.connected === true
      setConnected(isConnected)
      setChecking(false)
      if (isConnected) startPolling(monthRef.current.year, monthRef.current.month)
    }
    init()
    return () => stopPolling()
  }, []) // solo al montar — intencionalmente sin deps

  // ── Escuchar mensaje del popup OAuth ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.origin !== window.location.origin) return
      if (e.data === 'gcal_connected') {
        setConnected(true)
        startPolling(monthRef.current.year, monthRef.current.month)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [startPolling])

  // ── API pública ───────────────────────────────────────────────────────────────

  const loadMonth = useCallback((year, month) => {
    monthRef.current = { year, month }
    if (connected) fetchGcalEvents(year, month)
  }, [connected, fetchGcalEvents])

  const connect = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('REACT_APP_GOOGLE_CLIENT_ID no configurado')
      return
    }
    const params = new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      redirect_uri:  window.location.origin,
      response_type: 'code',
      scope:         SCOPE,
      access_type:   'offline',
      prompt:        'consent',
      state:         'gcal_connect',
    })
    window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'gcal-auth',
      'width=520,height=640,scrollbars=yes,resizable=yes'
    )
  }, [])

  const disconnect = useCallback(async () => {
    stopPolling()
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('google_calendar_tokens').delete().eq('user_id', session.user.id)
    }
    setConnected(false)
  }, [stopPolling])

  // Empuja un evento de FamilyHub a Google Calendar
  // action: 'create' | 'update' | 'delete'
  // Devuelve { gcal_id } en creates, o null si no está conectado
  const pushEvent = useCallback(async (action, event, gcalEventId = null) => {
    if (!connected) return null
    try {
      const { data } = await supabase.functions.invoke('gcal-push', {
        body: { action, event, gcal_event_id: gcalEventId },
      })
      return data
    } catch { return null }
  }, [connected])

  return {
    connected,
    checking,
    gcalEvents,
    connect,
    disconnect,
    loadMonth,
    pushEvent,
  }
}
