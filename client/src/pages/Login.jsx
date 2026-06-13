import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Phone, Lock, Mail } from 'lucide-react'

export function Login() {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await login(form.email, form.password)
    setLoading(false)
    if (!res.success) setError(res.error || 'Login failed')
  }

  return (
    <div className="min-h-screen bg-[#0F0D0A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FF7A50] rounded-2xl mb-4">
            <svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor" className="text-white" aria-hidden="true">
              <rect x="3" y="13" width="3" height="6" rx="1.5"/>
              <rect x="9" y="9" width="3" height="14" rx="1.5"/>
              <rect x="15" y="4" width="3" height="24" rx="1.5"/>
              <rect x="21" y="10" width="3" height="12" rx="1.5"/>
              <rect x="27" y="14" width="3" height="4" rx="1.5"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Auris<span className="text-[#FF7A50]">AI</span></h1>
          <p className="text-[#FF7A50] font-semibold mt-1">Voice Agents</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-[#18120E] mb-6">Sign In</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-1">
                <Mail size={13} /> Email
              </label>
              <Input
                type="email"
                placeholder="admin@aurisaivoice.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-1">
                <Lock size={13} /> Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full h-10 text-base">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          AurisAI Voice Agents &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
