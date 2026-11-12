import { Link, useNavigate } from 'react-router-dom'
import {
  Printer,
  Info,
  QrCode,
  UserX,
  Files,
  SlidersHorizontal,
  Calculator,
  BellRing,
  ShieldCheck,
  ClockAlert,
  CreditCard,
  Building2,
  SearchCode,
  UploadCloud,
  PackageCheck,
  User,
  Mail,
  Phone,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Layers,
  CheckCircle2,
  Lock,
  Cpu
} from 'lucide-react'
import ThemeToggle from '../components/ui/ThemeToggle'
import { Wordmark } from '../components/ui'
import { useAuth } from '../hooks/useAuth'

export default function AboutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const workflowSteps = [
    {
      step: '01',
      title: 'Scan QR Code',
      description: 'The customer scans the unique QR code of a printing shop.',
      icon: QrCode,
    },
    {
      step: '02',
      title: 'Upload Documents',
      description: 'The customer uploads one or more documents through the browser.',
      icon: UploadCloud,
    },
    {
      step: '03',
      title: 'Select Printing Options',
      description: 'The customer configures printing preferences for each document.',
      icon: SlidersHorizontal,
    },
    {
      step: '04',
      title: 'Submit Order',
      description: 'The system calculates the price and submits the order.',
      icon: Calculator,
    },
    {
      step: '05',
      title: 'Shop Processes Order',
      description: 'The shop owner receives the order and prints the documents.',
      icon: Printer,
    },
    {
      step: '06',
      title: 'Collect Documents',
      description: 'The customer collects the completed printouts from the shop.',
      icon: PackageCheck,
    },
  ]

  const keyFeatures = [
    {
      title: 'QR-Based Document Upload',
      description: 'Customers scan a shop-specific QR code and access its upload page instantly.',
      icon: QrCode,
      category: 'Customer Access',
    },
    {
      title: 'Anonymous Customer Access',
      description: 'Customers can upload documents without registration, login, phone number, or email.',
      icon: UserX,
      category: 'Privacy',
    },
    {
      title: 'Multiple Document Upload',
      description: 'Upload multiple supported documents through a single order.',
      icon: Files,
      category: 'Workflow',
    },
    {
      title: 'Custom Printing Options',
      description: 'Configure colour, black and white, paper size, copies, orientation, selected pages, and single/double-sided printing.',
      icon: SlidersHorizontal,
      category: 'Configuration',
    },
    {
      title: 'Automated Price Calculation',
      description: 'Calculate estimated printing costs based on shop-configured pricing rules and selected services.',
      icon: Calculator,
      category: 'Pricing',
    },
    {
      title: 'Real-Time Order Management',
      description: 'Shop owners receive incoming orders and manage their progress through a dashboard.',
      icon: BellRing,
      category: 'Shop Operations',
    },
    {
      title: 'Secure Document Management',
      description: 'Protect customer documents using authorized access and private storage.',
      icon: ShieldCheck,
      category: 'Security',
    },
    {
      title: 'Automatic Document Expiration',
      description: 'Automatically remove documents according to configured expiration policies.',
      icon: ClockAlert,
      category: 'Data Privacy',
    },
    {
      title: 'Online and Counter Payments',
      description: 'Support optional online payments and payment collection at the printing shop.',
      icon: CreditCard,
      category: 'Billing',
    },
    {
      title: 'Direct Printing Integration',
      description: 'Support local printer integration through the Windows Print Agent.',
      icon: Printer,
      category: 'Hardware',
    },
    {
      title: 'Multi-Shop Management',
      description: 'Allow multiple printing shops to operate independently on one platform.',
      icon: Building2,
      category: 'Multi-Tenancy',
    },
    {
      title: 'Order Tracking',
      description: 'Allow customers to track their order using a temporary order reference.',
      icon: SearchCode,
      category: 'Visibility',
    },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col transition-colors duration-150">
      {/* ── Top Header Navigation ── */}
      <header className="sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--border)] transition-colors duration-150 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          {/* Brand Logo & Back Action */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft size={16} strokeWidth={1.75} />
              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="h-4 w-px bg-[var(--border)] hidden sm:block" />

            <Link to={user ? "/dashboard" : "/login"} className="inline-flex items-center">
              <Wordmark size="md" showMark={true} />
            </Link>
          </div>

          {/* Right Header Navigation Elements */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            {user ? (
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0E7490] hover:bg-[#155E75] text-white shadow-xs transition-colors duration-150"
              >
                <span>Dashboard</span>
                <ChevronRight size={13} strokeWidth={1.75} />
              </Link>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] text-[var(--text)] border border-[var(--border)] shadow-xs transition-colors duration-150"
              >
                <span>Sign In</span>
                <ChevronRight size={13} strokeWidth={1.75} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-14">
        
        {/* ── Section 1: Hero & System Introduction ── */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase bg-[var(--accent-tint)] text-[#0E7490] border border-[#0E7490]/20">
            <Sparkles size={12} strokeWidth={1.75} />
            <span>Platform Overview & Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text)] tracking-tight">
            About SmartPrint
          </h1>

          <div className="card p-6 sm:p-8 space-y-4 text-sm leading-relaxed text-[var(--text-muted)]">
            <p className="text-base font-medium text-[var(--text)] leading-relaxed">
              SmartPrint is a QR-based, cloud-enabled multi-shop printing and document management system designed to simplify the way customers interact with printing shops.
            </p>

            <p>
              Traditionally, customers need to contact printing shops through WhatsApp, email, or other communication platforms to share documents and explain their printing requirements. This process can be inconvenient, time-consuming, and difficult for shop owners to manage, especially when multiple orders arrive simultaneously.
            </p>

            <p>
              SmartPrint provides a smarter and more convenient solution. Customers can simply scan a unique QR code displayed by a printing shop, upload their documents directly through their mobile browser, select their preferred printing options, view the estimated price, and submit their orders without creating an account or sharing their phone number or email address.
            </p>

            <p>
              Printing shop owners can manage incoming orders through a centralized dashboard, view uploaded documents, configure printing prices, track order progress, manage payments, and handle printing operations efficiently.
            </p>

            <p>
              The system also supports real-time order notifications, secure document management, automatic document expiration, optional online payments, and direct printing integration.
            </p>

            <p className="font-semibold text-[#0E7490] pt-2 border-t border-[var(--border)]">
              SmartPrint is designed to support multiple printing shops through a centralized platform while maintaining separate shop data and document access.
            </p>
          </div>
        </section>

        {/* ── Section 2: How SmartPrint Works (Workflow) ── */}
        <section className="space-y-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#0E7490]">
              <Layers size={13} strokeWidth={1.75} />
              <span>User Journey</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] tracking-tight">
              How SmartPrint Works
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)]">
              From instantaneous QR scanning to final document collection in six frictionless steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {workflowSteps.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className="card p-4 flex flex-col justify-between hover:border-[#0E7490]/40 transition-colors duration-150 group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[11px] font-bold text-[var(--text-muted)]">
                      {item.step}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center">
                      <Icon size={14} strokeWidth={1.75} />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-[var(--text)] text-xs mb-1 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="h-0.5 w-full rounded-full mt-3 bg-[#0E7490]/20 group-hover:bg-[#0E7490] transition-colors duration-150" />
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Section 3: Key Features Grid ── */}
        <section className="space-y-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#0E7490]">
              <Cpu size={13} strokeWidth={1.75} />
              <span>Core Capabilities</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] tracking-tight">
              Key Features
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)]">
              Engineered with full-stack enterprise capabilities for modern printing business workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {keyFeatures.map((feat) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.title}
                  className="card p-5 flex flex-col justify-between hover:border-[#0E7490]/40 hover:shadow-card-hover transition-all duration-150"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent-tint)] border border-[var(--border)] text-[#0E7490] flex items-center justify-center">
                        <Icon size={16} strokeWidth={1.75} />
                      </div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] bg-[var(--surface-hover)] border border-[var(--border)] px-2 py-0.5 rounded">
                        {feat.category}
                      </span>
                    </div>

                    <h3 className="font-semibold text-[var(--text)] text-sm">
                      {feat.title}
                    </h3>

                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Section 4: Project Overview ── */}
        <section className="space-y-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#0E7490]">
              <CheckCircle2 size={13} strokeWidth={1.75} />
              <span>Architecture & Specifications</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] tracking-tight">
              Project Overview
            </h2>
          </div>

          <div className="card overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
              {/* Left Column: Metadata */}
              <div className="p-6 sm:p-8 space-y-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Project Name
                  </span>
                  <p className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                    <span>SmartPrint</span>
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                      v1.0 Production
                    </span>
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Project Category
                  </span>
                  <p className="text-xs font-medium text-[var(--text)]">
                    Web-Based Printing and Document Management System
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    System Type
                  </span>
                  <p className="text-xs font-medium text-[var(--text)]">
                    QR-Based Multi-Tenant Cloud Printing Platform
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
                    Primary Users
                  </span>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2 text-xs font-medium text-[var(--text)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0E7490]" />
                      <span>Printing Shop Owners</span>
                    </li>
                    <li className="flex items-center gap-2 text-xs font-medium text-[var(--text)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0E7490]" />
                      <span>Customers</span>
                    </li>
                    <li className="flex items-center gap-2 text-xs font-medium text-[var(--text)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0E7490]" />
                      <span>Platform Administrator</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Main Purpose */}
              <div className="p-6 sm:p-8 bg-[var(--surface-hover)]/40 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
                    Main Purpose
                  </span>
                  <p className="text-xs sm:text-sm leading-relaxed text-[var(--text)]">
                    To simplify document submission, printing order management, and communication between customers and printing shops through a secure, centralized, and accessible web-based platform.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center gap-2.5 text-xs text-[var(--text-muted)]">
                  <Lock size={14} strokeWidth={1.75} className="text-green-600 dark:text-green-400 shrink-0" />
                  <span>
                    Privacy-first design with zero permanent tracking for anonymous print visitors.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 5: Developer Information ── */}
        <section className="space-y-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#0E7490]">
              <User size={13} strokeWidth={1.75} />
              <span>Creator Profile</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] tracking-tight">
              Developer Information
            </h2>
          </div>

          <div className="card p-6 max-w-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-14 h-14 rounded-xl bg-[var(--accent-tint)] border border-[var(--border)] text-[#0E7490] flex items-center justify-center font-bold text-xl shrink-0">
                AS
              </div>

              <div className="space-y-2.5 flex-1 min-w-0">
                <div>
                  <h3 className="text-base font-bold text-[var(--text)] tracking-tight">
                    Achudh Shaji
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Lead Full-Stack Developer & Software Architect
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
                  <a
                    href="mailto:achudhshaji@gmail.com"
                    className="flex items-center gap-2 text-xs font-medium text-[var(--text)] hover:text-[#0E7490] transition-colors"
                  >
                    <Mail size={13} strokeWidth={1.75} className="text-[var(--text-muted)]" />
                    <span className="truncate">achudhshaji@gmail.com</span>
                  </a>

                  <a
                    href="tel:8921446441"
                    className="flex items-center gap-2 text-xs font-medium text-[var(--text)] hover:text-[#0E7490] transition-colors"
                  >
                    <Phone size={13} strokeWidth={1.75} className="text-[var(--text-muted)]" />
                    <span>8921446441</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Section 6: Copyright Footer ── */}
      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)] py-6 px-4 text-center space-y-1 transition-colors duration-150">
        <p className="text-xs font-medium text-[var(--text)]">
          © 2026 SmartPrint. All Rights Reserved.
        </p>
        <p className="text-[11px] text-[var(--text-muted)]">
          Developed by Achudh Shaji.
        </p>
      </footer>
    </div>
  )
}
