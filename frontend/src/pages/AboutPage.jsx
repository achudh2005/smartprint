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
      color: 'from-blue-500 to-indigo-600',
    },
    {
      step: '02',
      title: 'Upload Documents',
      description: 'The customer uploads one or more documents through the browser.',
      icon: UploadCloud,
      color: 'from-indigo-500 to-purple-600',
    },
    {
      step: '03',
      title: 'Select Printing Options',
      description: 'The customer configures printing preferences for each document.',
      icon: SlidersHorizontal,
      color: 'from-purple-500 to-pink-600',
    },
    {
      step: '04',
      title: 'Submit Order',
      description: 'The system calculates the price and submits the order.',
      icon: Calculator,
      color: 'from-pink-500 to-rose-600',
    },
    {
      step: '05',
      title: 'Shop Processes Order',
      description: 'The shop owner receives the order and prints the documents.',
      icon: Printer,
      color: 'from-amber-500 to-orange-600',
    },
    {
      step: '06',
      title: 'Collect Documents',
      description: 'The customer collects the completed printouts from the shop.',
      icon: PackageCheck,
      color: 'from-emerald-500 to-teal-600',
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
    <div className="min-h-screen bg-surface-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* ── Top Header Navigation ── */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-surface-200 dark:border-slate-800 transition-colors duration-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Back Action */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="h-5 w-px bg-surface-200 dark:bg-slate-800 hidden sm:block" />

            <Link to={user ? "/dashboard" : "/login"} className="inline-flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <Printer size={17} />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                SmartPrint
              </span>
            </Link>
          </div>

          {/* Right Header Navigation Elements */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Active About Button Indicator */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 shadow-xs">
              <Info size={14} className="text-primary-600 dark:text-primary-400" />
              <span>About</span>
            </div>

            {/* Dark / Light Mode Switcher */}
            <ThemeToggle />

            {/* Quick Link to Dashboard / Login */}
            {user ? (
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-xs transition-colors"
              >
                <span>Dashboard</span>
                <ChevronRight size={13} />
              </Link>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-xs transition-colors"
              >
                <span>Sign In</span>
                <ChevronRight size={13} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-16 sm:space-y-20">
        
        {/* ── Section 1: Hero & System Introduction ── */}
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-primary-100 dark:bg-primary-950/70 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/80">
            <Sparkles size={13} />
            <span>Platform Overview & Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            About SmartPrint
          </h1>

          <div className="card p-6 sm:p-8 space-y-5 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
            <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
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

            <p className="font-semibold text-primary-700 dark:text-primary-300 pt-2 border-t border-surface-100 dark:border-slate-800">
              SmartPrint is designed to support multiple printing shops through a centralized platform while maintaining separate shop data and document access.
            </p>
          </div>
        </section>

        {/* ── Section 2: How SmartPrint Works (Workflow) ── */}
        <section className="space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              <Layers size={14} />
              <span>User Journey</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              How SmartPrint Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              From instantaneous QR scanning to final document collection in six frictionless steps.
            </p>
          </div>

          {/* Desktop & Mobile Responsive Workflow Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 relative">
            {workflowSteps.map((item, idx) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className="card p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-200 group relative overflow-hidden"
                >
                  {/* Step Number Tag */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-black text-slate-400 dark:text-slate-500">
                      STEP {item.step}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon size={16} />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1.5 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Gradient Indicator Bar */}
                  <div className={`h-1 w-full rounded-full mt-4 bg-gradient-to-r ${item.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Section 3: Key Features Grid ── */}
        <section className="space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              <Cpu size={14} />
              <span>Core Capabilities</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Key Features
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Engineered with full-stack enterprise capabilities for modern printing business workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {keyFeatures.map((feat) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.title}
                  className="card p-6 flex flex-col justify-between hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-card-hover transition-all duration-200 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon size={20} />
                      </div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 bg-surface-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {feat.category}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {feat.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Section 4: Project Overview ── */}
        <section className="space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              <CheckCircle2 size={14} />
              <span>Architecture & Specifications</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Project Overview
            </h2>
          </div>

          <div className="card overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-surface-100 dark:divide-slate-800">
              {/* Left Column: Metadata */}
              <div className="p-6 sm:p-8 space-y-5">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                    Project Name
                  </span>
                  <p className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>SmartPrint</span>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      v1.0 Production
                    </span>
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                    Project Category
                  </span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Web-Based Printing and Document Management System
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                    System Type
                  </span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    QR-Based Multi-Tenant Cloud Printing Platform
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                    Primary Users
                  </span>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-600 dark:bg-primary-400" />
                      <span>Printing Shop Owners</span>
                    </li>
                    <li className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-600 dark:bg-primary-400" />
                      <span>Customers</span>
                    </li>
                    <li className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-600 dark:bg-primary-400" />
                      <span>Platform Administrator</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Main Purpose */}
              <div className="p-6 sm:p-8 bg-surface-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Main Purpose
                  </span>
                  <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                    To simplify document submission, printing order management, and communication between customers and printing shops through a secure, centralized, and accessible web-based platform.
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-surface-100 dark:border-slate-800 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <Lock size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Privacy-first design with zero permanent tracking for anonymous print visitors.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 5: Developer Information ── */}
        <section className="space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              <User size={14} />
              <span>Creator Profile</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Developer Information
            </h2>
          </div>

          <div className="card p-6 sm:p-8 max-w-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Clean Profile / Avatar Placeholder */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-700 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md shrink-0">
                AS
              </div>

              {/* Details & Clickable Contact Links */}
              <div className="space-y-3 flex-1 min-w-0">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Achudh Shaji
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Lead Full-Stack Developer & Software Architect
                  </p>
                </div>

                <div className="space-y-2 pt-1 border-t border-surface-100 dark:border-slate-800">
                  {/* Clickable Email Link */}
                  <a
                    href="mailto:achudhshaji@gmail.com"
                    className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-primary-600 dark:text-slate-200 dark:hover:text-primary-400 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-surface-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      <Mail size={14} />
                    </div>
                    <span className="truncate">achudhshaji@gmail.com</span>
                  </a>

                  {/* Clickable Phone / Contact Link */}
                  <a
                    href="tel:8921446441"
                    className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-primary-600 dark:text-slate-200 dark:hover:text-primary-400 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-surface-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      <Phone size={14} />
                    </div>
                    <span>8921446441</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Section 6: Copyright Footer ── */}
      <footer className="mt-auto border-t border-surface-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 px-4 text-center space-y-1.5 transition-colors duration-200">
        <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
          © 2026 SmartPrint. All Rights Reserved.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          Developed by Achudh Shaji.
        </p>
      </footer>
    </div>
  )
}
