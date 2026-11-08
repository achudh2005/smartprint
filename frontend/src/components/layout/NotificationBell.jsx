import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Volume2, VolumeX, ShoppingBag, Clock } from 'lucide-react'
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
        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-surface-100 rounded-xl relative transition-colors"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-surface-200 z-50 overflow-hidden animate-in fade-in-50 duration-150">
          <div className="p-3.5 border-b border-surface-100 flex items-center justify-between bg-surface-50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-xs">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-primary-100 text-primary-700 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
                title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
              >
                {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-primary-600 hover:text-primary-700 font-medium text-xs flex items-center gap-1"
                >
                  <Check size={13} /> Mark read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-surface-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 text-xs transition-colors ${
                    n.isRead ? 'bg-white' : 'bg-primary-50/40'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 mt-0.5">
                      <ShoppingBag size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-xs leading-snug">
                        {n.title}
                      </p>
                      <p className="text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
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
