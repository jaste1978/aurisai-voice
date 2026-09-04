import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Mail, Phone, User as UserIcon } from 'lucide-react'

export function Login() {
  const { login, completeAuth } = useAuth()
  const [mode, setMode] = useState('signin')      // signin | signup
  const [step, setStep] = useState('email')        // signup: email | verify
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '', otp: '' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const signIn = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    const res = await login(form.email, form.password)
    setLoading(false)
    if (!res.success) setError(res.error || 'Login failed')
  }

  const startSignup = async (e) => {
    e.preventDefault(); setError(''); setInfo(''); setLoading(true)
    const res = await api.signupStart(form.email)
    setLoading(false)
    if (res.success) { setStep('verify'); setInfo('We emailed you a 6-digit code.') }
    else setError(res.error || 'Could not start signup')
  }

  const finishSignup = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    const res = await api.signupVerify({ email: form.email, otp: form.otp, password: form.password, name: form.name, phone: form.phone })
    setLoading(false)
    if (res.success && res.token) completeAuth(res.token, res.user)   // logs in → trial dashboard
    else setError(res.error || 'Verification failed')
  }

  const startReset = async (e) => {
    e.preventDefault(); setError(''); setInfo(''); setLoading(true)
    const res = await api.forgotPassword(form.email)
    setLoading(false)
    if (res.success) { setStep('verify'); setInfo('If that email has an account, we sent a 6-digit code.') }
    else setError(res.error || 'Could not start reset')
  }

  const finishReset = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    const res = await api.resetPassword({ email: form.email, otp: form.otp, password: form.password })
    setLoading(false)
    if (res.success && res.token) completeAuth(res.token, res.user)   // reset + auto sign-in
    else setError(res.error || 'Reset failed')
  }

  const toSignup = () => { setMode('signup'); setStep('email'); setError(''); setInfo('') }
  const toSignin = () => { setMode('signin'); setError(''); setInfo('') }
  const toReset  = () => { setMode('reset'); setStep('email'); setError(''); setInfo('') }

  return (
    <div className="min-h-screen bg-[#0F0D0A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FF7A50] rounded-2xl mb-4">
            <svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor" className="text-white" aria-hidden="true">
              <rect x="3" y="13" width="3" height="6" rx="1.5"/><rect x="9" y="9" width="3" height="14" rx="1.5"/>
              <rect x="15" y="4" width="3" height="24" rx="1.5"/><rect x="21" y="10" width="3" height="12" rx="1.5"/>
              <rect x="27" y="14" width="3" height="4" rx="1.5"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Auris<span className="text-[#FF7A50]">AI</span></h1>
          <p className="text-[#FF7A50] font-semibold mt-1">Voice Agents</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {mode === 'signin' && (
            <>
              <h2 className="text-xl font-bold text-[#18120E] mb-6">Sign In</h2>
              <form onSubmit={signIn} className="space-y-4">
                <Field icon={Mail} label="Email"><Input type="email" placeholder="you@company.com" value={form.email} onChange={e => set('email', e.target.value)} autoFocus /></Field>
                <Field icon={Lock} label="Password"><Input type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} /></Field>
                {error && <Err>{error}</Err>}
                <Button type="submit" disabled={loading} className="w-full h-10 text-base">{loading ? 'Signing in…' : 'Sign In'}</Button>
              </form>
              <p className="text-center text-sm mt-3">
                <button onClick={toReset} className="text-gray-500 hover:text-[#FF7A50]">Forgot password?</button>
              </p>
              <p className="text-center text-sm text-gray-500 mt-4">
                New here? <button onClick={toSignup} className="text-[#FF7A50] font-semibold">Start your free trial →</button>
              </p>
            </>
          )}

          {mode === 'signup' && step === 'email' && (
            <>
              <h2 className="text-xl font-bold text-[#18120E]">Start your free trial</h2>
              <p className="text-sm text-gray-500 mt-1 mb-6">3-day trial · demo AI agents ready to call · no card needed.</p>
              <form onSubmit={startSignup} className="space-y-4">
                <Field icon={Mail} label="Work email"><Input type="email" placeholder="you@company.com" value={form.email} onChange={e => set('email', e.target.value)} autoFocus /></Field>
                {error && <Err>{error}</Err>}
                <Button type="submit" disabled={loading} className="w-full h-10 text-base">{loading ? 'Sending code…' : 'Send verification code'}</Button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-5">Have an account? <button onClick={toSignin} className="text-[#FF7A50] font-semibold">Sign in</button></p>
            </>
          )}

          {mode === 'signup' && step === 'verify' && (
            <>
              <h2 className="text-xl font-bold text-[#18120E]">Verify &amp; create account</h2>
              {info && <p className="text-sm text-green-600 mt-1 mb-4">{info} ({form.email})</p>}
              <form onSubmit={finishSignup} className="space-y-4">
                <Field icon={Mail} label="6-digit code"><Input inputMode="numeric" maxLength={6} placeholder="••••••" value={form.otp} onChange={e => set('otp', e.target.value)} autoFocus /></Field>
                <Field icon={UserIcon} label="Your name"><Input placeholder="Your name" value={form.name} onChange={e => set('name', e.target.value)} /></Field>
                <Field icon={Phone} label="Mobile number"><Input type="tel" inputMode="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} /></Field>
                <Field icon={Lock} label="Create a password"><Input type="password" placeholder="min 6 characters" value={form.password} onChange={e => set('password', e.target.value)} /></Field>
                {error && <Err>{error}</Err>}
                <Button type="submit" disabled={loading} className="w-full h-10 text-base">{loading ? 'Creating…' : 'Start trial'}</Button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-5"><button onClick={() => setStep('email')} className="text-[#FF7A50]">← Change email / resend</button></p>
            </>
          )}

          {mode === 'reset' && step === 'email' && (
            <>
              <h2 className="text-xl font-bold text-[#18120E]">Reset your password</h2>
              <p className="text-sm text-gray-500 mt-1 mb-6">Enter your email and we'll send a 6-digit code.</p>
              <form onSubmit={startReset} className="space-y-4">
                <Field icon={Mail} label="Email"><Input type="email" placeholder="you@company.com" value={form.email} onChange={e => set('email', e.target.value)} autoFocus /></Field>
                {error && <Err>{error}</Err>}
                <Button type="submit" disabled={loading} className="w-full h-10 text-base">{loading ? 'Sending code…' : 'Send reset code'}</Button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-5"><button onClick={toSignin} className="text-[#FF7A50] font-semibold">← Back to sign in</button></p>
            </>
          )}

          {mode === 'reset' && step === 'verify' && (
            <>
              <h2 className="text-xl font-bold text-[#18120E]">Set a new password</h2>
              {info && <p className="text-sm text-green-600 mt-1 mb-4">{info} ({form.email})</p>}
              <form onSubmit={finishReset} className="space-y-4">
                <Field icon={Mail} label="6-digit code"><Input inputMode="numeric" maxLength={6} placeholder="••••••" value={form.otp} onChange={e => set('otp', e.target.value)} autoFocus /></Field>
                <Field icon={Lock} label="New password"><Input type="password" placeholder="min 6 characters" value={form.password} onChange={e => set('password', e.target.value)} /></Field>
                {error && <Err>{error}</Err>}
                <Button type="submit" disabled={loading} className="w-full h-10 text-base">{loading ? 'Resetting…' : 'Reset password'}</Button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-5"><button onClick={() => setStep('email')} className="text-[#FF7A50]">← Change email / resend</button></p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">AurisAI Voice Agents &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}

function Field({ icon: Icon, label, children }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-1"><Icon size={13} /> {label}</label>
      {children}
    </div>
  )
}
function Err({ children }) { return <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{children}</p> }
