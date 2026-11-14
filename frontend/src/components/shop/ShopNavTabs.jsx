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
      {/* macOS Segmented Tab Bar */}
      <div className="inline-flex overflow-x-auto scrollbar-none max-w-full pb-1">
        <nav className="mac-segmented-track" aria-label="Shop Navigation">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                clsx(
                  'mac-segmented-pill flex items-center gap-1.5 cursor-pointer',
                  isActive
                    ? 'mac-segmented-pill-active'
                    : 'mac-segmented-pill-inactive'
                )
              }
            >
              <Icon size={13} strokeWidth={1.75} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
