import { io } from 'socket.io-client'

let socket = null

/**
 * Play a gentle double-chime notification sound using Web Audio API
 */
export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime)
    gain1.gain.setValueAtTime(0.15, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start()
    osc1.stop(ctx.currentTime + 0.3)

    // Tone 2: 880 Hz (A5)
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(880, ctx.currentTime)
        gain2.gain.setValueAtTime(0.2, ctx.currentTime)
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.start()
        osc2.stop(ctx.currentTime + 0.5)
      } catch (e) {}
    }, 120)
  } catch (err) {
    console.debug('Web Audio not allowed or failed:', err)
  }
}

/**
 * Show a native browser notification if granted
 */
export function showBrowserNotification(title, options) {
  if (!('Notification' in window)) return

  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico',
      ...options,
    })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, {
          icon: '/favicon.ico',
          ...options,
        })
      }
    })
  }
}

/**
 * Get or initialize the Socket.IO instance
 */
export function getSocket() {
  if (!socket) {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('smartprint_token')
    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
      : (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:5000')

    socket = io(socketUrl, {
      auth: { token },
      autoConnect: false,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })
  }
  return socket
}

/**
 * Connect socket and join shop room
 */
export function connectShopSocket(shopId, onNewOrder, onStatusChange) {
  const s = getSocket()
  const token = localStorage.getItem('smartprint_token')
  s.auth = { token }

  if (!s.connected) {
    s.connect()
  }

  s.emit('shop:join', { shopId }, (response) => {
    if (response?.success) {
      console.log(`Joined real-time room for shop ${shopId}`)
    } else {
      console.warn(`Failed to join shop room:`, response?.message)
    }
  })

  if (onNewOrder) {
    s.off('order:new')
    s.on('order:new', (order) => {
      playNotificationSound()
      showBrowserNotification('New Print Order Received!', {
        body: `Order #${order.orderNumber} - ₹${order.totalAmount} (${order.filesCount} file(s))`,
      })
      onNewOrder(order)
    })
  }

  if (onStatusChange) {
    s.off('order:status_changed')
    s.on('order:status_changed', onStatusChange)
  }

  return s
}

export function disconnectShopSocket(shopId) {
  if (socket) {
    socket.emit('shop:leave', { shopId })
  }
}

/**
 * Ergonomic subscriber with cleanup function
 */
export function subscribeToShopEvents(shopId, { onNewOrder, onStatusChanged } = {}) {
  const s = connectShopSocket(shopId, onNewOrder, onStatusChanged)
  return () => {
    disconnectShopSocket(shopId)
  }
}
