import { createContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, verify stored token
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) { setLoading(false); return }

    api.get('/auth/me')
      .then(({ data }) => setUser(data.data.user))
      .catch(() => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken') })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    const { user, accessToken, refreshToken } = data.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    setUser(user)
    return user
  }, [])

  const register = useCallback(async (name, email, password, confirmPassword) => {
    const { data } = await api.post('/auth/register', { name, email, password, confirmPassword })
    const { user, accessToken, refreshToken } = data.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    setUser(user)
    return user
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    try { await api.post('/auth/logout', { refreshToken }) } catch (_) {}
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }, [])

  const updateUser = useCallback((updates) => {
    setUser((prev) => ({ ...prev, ...updates }))
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}
