import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent } from "@/components/ui/card"
import { Bot, Plus, Trash2, Clock, Sparkles } from "lucide-react"

const empty = { name: "", language: "hinglish", welcome: "", prompt: "" }

export function MyAgents() {
  const { user, refreshUser } = useAuth()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(empty)
  const [building, setBuilding] = useState(false)
  const [err, setErr] = useState("")
  const [ok, setOk] = useState("")
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = () => api.getAgents().then(r => { setAgents(r.data || []); setLoading(false) })
  useEffect(() => { load() }, [])

  const limit = user?.agent_limit ?? 2
  const atLimit = agents.length >= limit
  const isTrial = user?.is_trial
  const daysLeft = user?.trial_ends_at ? Math.max(0, Math.ceil((new Date(user.trial_ends_at) - new Date()) / 86400000)) : null

  const create = async (e) => {
    e.preventDefault(); setErr(""); setOk("")
    if (!form.name.trim()) return setErr("Give your agent a name.")
    setBuilding(true)
    const res = await api.createAgent(form)
    setBuilding(false)
    if (res.success) { setOk(`Agent "${form.name}" created! 🎉`); setForm(empty); load(); refreshUser() }
    else setErr(res.error || "Could not create agent")
  }

  const del = async (a) => {
    if (!confirm(`Delete agent "${a.name}"?`)) return
    const res = await api.deleteAgent(a.id)
    if (res.success) { load(); refreshUser() } else alert(res.error)
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-[#18120E]">My AI Agents</h2>

      {isTrial && (
        <div className="rounded-xl border border-[#FF7A50]/40 bg-[#FF7A50]/5 p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-[#18120E]"><Clock size={15} className="text-[#FF7A50]" /> {daysLeft} days left in trial</span>
          <span className="text-gray-600">Agents: <strong>{agents.length}/{limit}</strong></span>
          <span className="text-gray-600">Test calls: <strong>{user?.calls_used ?? 0}/{user?.call_limit ?? 20}</strong></span>
          <a href="https://www.aurisaivoice.com/#contact" target="_blank" rel="noreferrer" className="ml-auto text-[#FF7A50] font-semibold">Upgrade →</a>
        </div>
      )}

      {/* Builder */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4"><Sparkles size={18} className="text-[#FF7A50]" /><h3 className="font-bold text-[#18120E]">Build a new agent</h3></div>
          {atLimit ? (
            <p className="text-sm text-gray-600">You've used all {limit} agents on your trial. Delete one to build another, or <a href="https://www.aurisaivoice.com/#contact" target="_blank" rel="noreferrer" className="text-[#FF7A50] font-semibold">upgrade</a> for more.</p>
          ) : (
            <form onSubmit={create} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <input className="ma-in" placeholder="Agent name (e.g. Sales Sam)" value={form.name} onChange={e => set("name", e.target.value)} />
                <select className="ma-in" value={form.language} onChange={e => set("language", e.target.value)}>
                  <option value="hinglish">Hinglish (Hindi + English)</option>
                  <option value="hindi">Hindi</option>
                  <option value="english">English</option>
                </select>
              </div>
              <input className="ma-in" placeholder="Welcome line the agent says first (optional)" value={form.welcome} onChange={e => set("welcome", e.target.value)} />
              <textarea className="ma-in" rows="4" placeholder="What should this agent do? e.g. Call leads, introduce our gym membership offer, answer questions, and book a free trial class for interested people." value={form.prompt} onChange={e => set("prompt", e.target.value)} />
              {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2.5">{err}</p>}
              {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg p-2.5">{ok}</p>}
              <button type="submit" disabled={building} className="inline-flex items-center gap-1.5 bg-[#FF7A50] text-[#1A0E07] font-semibold rounded-lg px-4 py-2.5 text-sm disabled:opacity-60">
                <Plus size={16} /> {building ? "Building on Bolna…" : "Create agent"}
              </button>
            </form>
          )}
          <style>{`.ma-in{width:100%;background:#fff;border:1px solid #e5e0d8;border-radius:10px;padding:10px 12px;font-size:.92rem}.ma-in:focus{outline:none;border-color:#FF7A50}`}</style>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading your agents…</div>
      ) : agents.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-gray-400"><Bot size={28} className="mx-auto mb-2 opacity-40" />No agents yet. Build your first one above.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {agents.map(a => (
            <Card key={a.id}><CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[#18120E] flex items-center gap-2"><Bot size={16} className="text-[#FF7A50]" /> {a.name}</p>
                <p className="text-xs text-gray-400 mt-1 truncate">ID: {a.id}</p>
                {a.status && <span className="inline-block mt-2 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded capitalize">{a.status}</span>}
              </div>
              <button onClick={() => del(a)} className="text-gray-400 hover:text-red-500 p-1" title="Delete agent"><Trash2 size={16} /></button>
            </CardContent></Card>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400">Tip: after building an agent, use <strong>Trigger Call</strong> to test it on your phone (trial calls are capped).</p>
    </div>
  )
}
