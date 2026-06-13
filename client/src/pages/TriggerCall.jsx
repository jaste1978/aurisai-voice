import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { PhoneCall, CheckCircle } from "lucide-react"

export function TriggerCall() {
  const [agents, setAgents] = useState([])
  const [customers, setCustomers] = useState([])
  const [form, setForm] = useState({ customer_id: '', agent_id: '', phone_number: '', language: 'en' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getAgents().then(r => setAgents(r.data || []))
    api.getCustomers().then(r => setCustomers(r.data || []))
  }, [])

  const onCustomerChange = (e) => {
    const c = customers.find(c => String(c.id) === e.target.value)
    setForm(f => ({ ...f, customer_id: e.target.value, phone_number: c?.phone_number || '' }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.agent_id || !form.phone_number) return setError('Agent and phone number are required')
    setLoading(true); setError(''); setSuccess(false)
    const payload = {
      agentId: form.agent_id,
      phoneNumber: form.phone_number,
      language: form.language,
      ...(form.customer_id ? { customerId: form.customer_id } : {})
    }
    const res = await api.triggerCall(payload)
    setLoading(false)
    if (res.success) { setSuccess(true); setForm({ customer_id: '', agent_id: '', phone_number: '', language: 'en' }) }
    else setError(res.error || 'Failed to trigger call')
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-[#18120E]">Trigger Call</h2>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Customer (optional)</label>
              <select className="mt-1 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#18120E]" value={form.customer_id} onChange={onCustomerChange}>
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone_number}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Phone Number *</label>
              <Input className="mt-1" placeholder="+919876543210" value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Agent *</label>
              <select className="mt-1 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#18120E]" value={form.agent_id} onChange={e => setForm({...form, agent_id: e.target.value})}>
                <option value="">Select agent...</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Language</label>
              <select className="mt-1 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#18120E]" value={form.language} onChange={e => setForm({...form, language: e.target.value})}>
                <option value="en">English</option><option value="hi">Hindi</option><option value="gu">Gujarati</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
            {success && <p className="text-sm text-green-600 bg-green-50 rounded p-2 flex items-center gap-2"><CheckCircle size={14} /> Call triggered successfully!</p>}
            <Button type="submit" disabled={loading} className="w-full">
              <PhoneCall size={15} className="mr-2" />
              {loading ? 'Triggering...' : 'Trigger Call'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
