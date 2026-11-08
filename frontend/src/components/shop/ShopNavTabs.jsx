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
    <div className="flex gap-2 border-b border-surface-200 pb-3 mb-6 overflow-x-auto">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0',
              isActive
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-surface-200 hover:bg-surface-50'
            )
          }
        >
          <Icon size={15} />
          <span>{label}</span>
        </NavLink>
      ))}
    </div>
  )
}
