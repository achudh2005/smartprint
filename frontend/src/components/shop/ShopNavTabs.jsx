import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  QrCode,
  DollarSign,
  Settings,
  CreditCard,
  Printer,
  BarChart3,
} from 'lucide-react'
import clsx from 'clsx'

export default function ShopNavTabs({ shopId }) {
  const tabs = [
    { to: `/shops/${shopId}/dashboard`, icon: LayoutDashboard, label: 'Overview' },
    { to: `/shops/${shopId}/orders`,    icon: ShoppingBag,     label: 'Orders' },
    { to: `/shops/${shopId}/payments`,  icon: CreditCard,      label: 'Payments' },
    { to: `/shops/${shopId}/printers`,  icon: Printer,         label: 'Printers' },
    { to: `/shops/${shopId}/analytics`, icon: BarChart3,       label: 'Analytics' },
    { to: `/shops/${shopId}/qr`,        icon: QrCode,          label: 'QR Code' },
    { to: `/shops/${shopId}/pricing`,   icon: DollarSign,      label: 'Pricing & Services' },
    { to: `/shops/${shopId}/settings`,  icon: Settings,        label: 'Settings' },
  ]

  return (
    <div className="relative mb-6">
      {/* Scrollable tab strip */}
      <div className="flex gap-0 overflow-x-auto scrollbar-none border-b border-[var(--border)]">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              clsx(
                'relative flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE] focus-visible:ring-offset-1',
                isActive
                  ? 'text-[#0E7490] dark:text-[#22D3EE]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={14} strokeWidth={1.75} className="shrink-0" />
                <span>{label}</span>
                {/* Active underline indicator */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0E7490] dark:bg-[#22D3EE] rounded-t-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
