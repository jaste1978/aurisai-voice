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
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
