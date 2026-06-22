import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '@/lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.me().then(r => {
        if (r.success) setUser(r.user)
        else localStorage.removeItem('token')
        setLoading(false)
      }).catch(() => { localStorage.removeItem('token'); setLoading(false) })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const res = await api.login({ email, password })
    if (res.success) {
      localStorage.setItem('token', res.token)
      setUser(res.user)
    }
    return res
  }

  // Used by trial signup once the verify step returns a token + user
  const completeAuth = (token, u) => {
    localStorage.setItem('token', token)
    setUser(u)
  }

  // Refresh the current user (e.g. after creating an agent / placing a call)
  const refreshUser = async () => {
    const r = await api.me()
    if (r.success) setUser(r.user)
    return r
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const hasPermission = (module, action) => {
    if (!user) return false
    if (user.role === 'admin') return true
    const perms = user.permissions || {}
    const perm = perms[module]
    if (action) return typeof perm === 'object' ? !!perm[action] : !!perm
    return !!perm
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, completeAuth, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
