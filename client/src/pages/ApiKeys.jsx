import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { KeyRound, Plus, Copy, Trash2, Check, ExternalLink } from "lucide-react"

export function ApiKeys() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: "", email: "" })
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState("")
  const [newKey, setNewKey] = useState("")     // raw secret shown once
  const [copied, setCopied] = useState(false)

  const load = () => api.getApiKeys().then(r => { setKeys(r.data || []); setLoading(false) })
  useEffect(() => { load() }, [])

  const create = async (e) => {
    e.preventDefault(); setErr(""); setNewKey("")
    if (!form.name.trim()) return setErr("Give the partner/key a name.")
    setCreating(true)
    const res = await api.createApiKey(form)
    setCreating(false)
    if (res.success) { setNewKey(res.key); setForm({ name: "", email: "" }); load() }
    else setErr(res.error || "Could not create key")
  }

  const revoke = async (k) => {
    if (!confirm(`Revoke key "${k.name || k.key_prefix}"? Apps using it will stop working.`)) return
    const res = await api.revokeApiKey(k.id)
    if (res.success) load(); else alert(res.error)
  }

  const copy = () => { navigator.clipboard?.writeText(newKey); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#18120E]">API Keys</h2>
        <a href="/api/v1/docs" target="_blank" rel="noreferrer" className="text-sm text-[#FF7A50] font-semibold inline-flex items-center gap-1">API docs <ExternalLink size={13} /></a>
      </div>

      {newKey && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-800 mb-1">New API key — copy it now, it won't be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border rounded-lg px-3 py-2 break-all">{newKey}</code>
            <button onClick={copy} className="inline-flex items-center gap-1 bg-[#18120E] text-white text-xs rounded-lg px-3 py-2">
              {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4"><KeyRound size={18} className="text-[#FF7A50]" /><h3 className="font-bold text-[#18120E]">Issue a new key</h3></div>
          <form onSubmit={create} className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-start">
            <input className="ak-in" placeholder="Partner / key name (e.g. Acme Corp)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="ak-in" placeholder="Partner email (optional)" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <button type="submit" disabled={creating} className="inline-flex items-center gap-1.5 bg-[#FF7A50] text-[#1A0E07] font-semibold rounded-lg px-4 py-2.5 text-sm disabled:opacity-60 whitespace-nowrap">
              <Plus size={16} /> {creating ? "Creating…" : "Create key"}
            </button>
          </form>
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2.5 mt-3">{err}</p>}
          <p className="text-xs text-gray-400 mt-2">A partner account is created for each key — all calls placed with it show up in your dashboard.</p>
          <style>{`.ak-in{width:100%;background:#fff;border:1px solid #e5e0d8;border-radius:10px;padding:10px 12px;font-size:.92rem}.ak-in:focus{outline:none;border-color:#FF7A50}`}</style>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading keys…</div>
      ) : keys.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-gray-400"><KeyRound size={28} className="mx-auto mb-2 opacity-40" />No API keys yet.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="px-4 py-3">Name</th><th className="px-4 py-3">Key</th><th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Calls</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last used</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{k.name || "—"}</td>
                  <td className="px-4 py-3"><code className="text-xs text-gray-500">{k.key_prefix}</code></td>
                  <td className="px-4 py-3 text-gray-500">{k.account?.email || "—"}</td>
                  <td className="px-4 py-3">{k.calls_made}</td>
                  <td className="px-4 py-3">{k.active
                    ? <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">active</span>
                    : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">revoked</span>}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}</td>
                  <td className="px-4 py-3 text-right">
                    {k.active && <button onClick={() => revoke(k)} className="text-gray-400 hover:text-red-500 p-1" title="Revoke"><Trash2 size={16} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  )
}
