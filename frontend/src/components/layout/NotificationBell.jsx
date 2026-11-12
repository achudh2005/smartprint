import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Volume2, VolumeX, ShoppingBag } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

export default function NotificationBell({ shopId }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const dropdownRef = useRef(null)

  const fetchNotifications = async () => {
    if (!shopId) return
    try {
      const { data } = await api.get(`/shops/${shopId}/notifications`)
      setNotifications(data.data.notifications || [])
      setUnreadCount(data.data.unreadCount || 0)
    } catch (err) {
      // Ignore background poll errors
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [shopId])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAllRead = async () => {
    if (!shopId) return
    try {
      await api.patch(`/shops/${shopId}/notifications/read`)
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      toast.success('All marked as read')
    } catch (err) {
      toast.error('Failed to update notifications')
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors duration-150"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={16} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-80 sm:w-96 bg-[var(--surface)] rounded-xl shadow-card border border-[var(--border)] z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--text)]">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-[var(--accent-tint)] text-[#0E7490] font-semibold px-1.5 py-0.5 rounded-md text-[10px] border border-[#0E7490]/20">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors duration-150"
                title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
              >
                {soundEnabled ? <Volume2 size={14} strokeWidth={1.75} /> : <VolumeX size={14} strokeWidth={1.75} />}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] font-medium text-[#0E7490] hover:text-[#155E75] transition-colors duration-150"
                >
                  <Check size={12} strokeWidth={2} />
                  Mark read
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border)]">
            {notifications.length === 0 ? (
              <EmptyState
                illustration={NoNotificationsIllustration}
                title="All caught up"
                description="You'll be notified when new orders arrive or print jobs complete."
                className="py-8"
              />
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 text-xs transition-colors ${
                    n.isRead
                      ? 'bg-[var(--surface)]'
                      : 'bg-[var(--accent-tint)]/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[var(--accent-tint)] border border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5">
                      <ShoppingBag size={13} strokeWidth={1.75} className="text-[#0E7490]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--text)] text-xs leading-snug">
                        {n.title}
                      </p>
                      <p className="text-[var(--text-muted)] mt-0.5 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
