import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { useAuth } from './hooks/useAuth'

// Layouts
import DashboardLayout from './layouts/DashboardLayout'
import AuthLayout from './layouts/AuthLayout'
import AdminLayout from './components/admin/AdminLayout'

// Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ShopCreatePage from './pages/shop/ShopCreatePage'
import ShopSetupPage from './pages/shop/ShopSetupPage'
import ShopDashboardPage from './pages/shop/ShopDashboardPage'
import ShopSettingsPage from './pages/shop/ShopSettingsPage'
import ShopQRPage from './pages/shop/ShopQRPage'
import ShopPricingPage from './pages/shop/ShopPricingPage'
import ShopPaymentsPage from './pages/shop/ShopPaymentsPage'
import ShopOrdersPage from './pages/shop/ShopOrdersPage'
import OrderDetailPage from './pages/shop/OrderDetailPage'
import ShopPrintersPage from './pages/shop/ShopPrintersPage'
import ShopAnalyticsPage from './pages/shop/ShopAnalyticsPage'

// Super Admin Pages
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import AdminShopsPage from './pages/admin/AdminShopsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage'

// Customer & Public Pages
import ShopPortalPage from './pages/customer/ShopPortalPage'
import OrderConfirmationPage from './pages/customer/OrderConfirmationPage'
import ProfilePage from './pages/profile/ProfilePage'
import AboutPage from './pages/AboutPage'
import NotFoundPage from './pages/NotFoundPage'

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Public Route wrapper (redirect if already logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading SmartPrint...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          </Route>

          {/* Public customer-facing QR portal & order tracking */}
          <Route path="/s/:shopCode" element={<ShopPortalPage />} />
          <Route path="/orders/:orderNumber" element={<OrderConfirmationPage />} />

          {/* Public About Page */}
          <Route path="/about" element={<AboutPage />} />

          {/* Protected dashboard routes */}
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/shops/new" element={<ShopCreatePage />} />
            <Route path="/shops/:shopId" element={<ShopDashboardPage />} />
            <Route path="/shops/:shopId/dashboard" element={<ShopDashboardPage />} />
            <Route path="/shops/:shopId/setup" element={<ShopSetupPage />} />
            <Route path="/shops/:shopId/settings" element={<ShopSettingsPage />} />
            <Route path="/shops/:shopId/qr" element={<ShopQRPage />} />
            <Route path="/shops/:shopId/pricing" element={<ShopPricingPage />} />
            <Route path="/shops/:shopId/payments" element={<ShopPaymentsPage />} />
            <Route path="/shops/:shopId/orders" element={<ShopOrdersPage />} />
            <Route path="/shops/:shopId/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/shops/:shopId/printers" element={<ShopPrintersPage />} />
            <Route path="/shops/:shopId/analytics" element={<ShopAnalyticsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Super Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route path="shops" element={<AdminShopsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="audit-logs" element={<AdminAuditLogsPage />} />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
