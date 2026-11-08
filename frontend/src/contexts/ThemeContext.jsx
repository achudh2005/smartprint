import { createContext, useContext, useEffect, useState } from 'react'

export const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('smartprint_theme')
      if (saved === 'dark' || saved === 'light') return saved

      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
      }
    } catch (e) {}
    return 'light'
  })

  // Synchronize <html> and <body> classes immediately
  useEffect(() => {
    try {
      const root = document.documentElement
      if (theme === 'dark') {
        root.classList.add('dark')
        root.style.colorScheme = 'dark'
        document.body?.classList.add('dark')
      } else {
        root.classList.remove('dark')
        root.style.colorScheme = 'light'
        document.body?.classList.remove('dark')
      }
      localStorage.setItem('smartprint_theme', theme)
    } catch (e) {
      console.error('Failed to update theme in DOM:', e)
    }
  }, [theme])

  const toggleTheme = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try {
        const root = document.documentElement
        if (next === 'dark') {
          root.classList.add('dark')
          root.style.colorScheme = 'dark'
          document.body?.classList.add('dark')
        } else {
          root.classList.remove('dark')
          root.style.colorScheme = 'light'
          document.body?.classList.remove('dark')
        }
        localStorage.setItem('smartprint_theme', next)
      } catch (err) {}
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
