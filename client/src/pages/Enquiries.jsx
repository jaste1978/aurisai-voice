import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Phone, Building2, Trash2, MessageSquare, RefreshCw, Plus, Save, X } from "lucide-react"

// Sales pipeline stages
const STAGES = ["new", "contacted", "demo", "pilot", "won", "lost"]
const STAGE_STYLE = {
  new:       "bg-[#FF7A50]/15 text-[#FF7A50] border-[#FF7A50]/40",
  contacted: "bg-amber-100 text-amber-700 border-amber-300",
  demo:      "bg-blue-100 text-blue-700 border-blue-300",
  pilot:     "bg-violet-100 text-violet-700 border-violet-300",
  won:       "bg-green-100 text-green-700 border-green-300",
  lost:      "bg-gray-100 text-gray-500 border-gray-300",
}
const emptyLead = { name: "", company: "", email: "", phone: "", interest: "", notes: "" }

export function Enquiries() {
  const [leads, setLeads] = useState([])
  const [stats, setStats] = useState({ total: 0 })
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyLead)
  const [noteDraft, setNoteDraft] = useState({}) // id -> text being edited

  const load = () => {
    setLoading(true)
    Promise.all([api.getEnquiries(filter === "all" ? undefined : filter), api.getEnquiryStats()])
      .then(([e, s]) => { setLeads(e.data || []); if (s.data) setStats(s.data); setLoading(false) })
  }
  useEffect(() => { load() }, [filter])

  const setStage = async (id, status) => { const r = await api.updateEnquiry(id, { status }); if (r.success) load() }
  const saveNote = async (id) => { const r = await api.updateEnquiry(id, { notes: noteDraft[id] ?? "" }); if (r.success) { setNoteDraft(d => { const n = { ...d }; delete n[id]; return n }); load() } }
  const del = async (id) => { if (!confirm("Delete this lead?")) return; await api.deleteEnquiry(id); load() }

  const addLead = async (e) => {
    e.preventDefault()
    if (!form.name && !form.company) return alert("Enter at least a name or company")
    const r = await api.createEnquiry({ ...form, source: "outbound" })
    if (r.success) { setForm(emptyLead); setAdding(false); load() }
    else alert(r.error || "Could not add lead")
  }

  const chips = [{ key: "all", label: "All", count: stats.total }, ...STAGES.map(s => ({ key: s, label: s[0].toUpperCase() + s.slice(1), count: stats[s] || 0 }))]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#18120E]">Leads / CRM</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setAdding(v => !v)} className="inline-flex items-center gap-1 bg-[#18120E] text-white text-sm font-medium rounded-lg px-3 py-2 hover:bg-[#2a201a]">
            <Plus size={15} /> Add lead
          </button>
          <button onClick={load} className="text-gray-500 hover:text-[#FF7A50] p-2" title="Refresh"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>
        </div>
      </div>
      <p className="text-sm text-gray-500 -mt-2">Inbound demos from the website + outbound leads you add — one pipeline.</p>

      {adding && (
        <Card><CardContent className="p-4">
          <form onSubmit={addLead} className="grid sm:grid-cols-2 gap-3">
            <input className="crm-in" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
            <input className="crm-in" placeholder="Company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
            <input className="crm-in" placeholder="Email (optional)" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input className="crm-in" placeholder="Phone (optional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input className="crm-in sm:col-span-2" placeholder="Interest / role (optional)" value={form.interest} onChange={e => setForm({ ...form, interest: e.target.value })} />
            <textarea className="crm-in sm:col-span-2" rows="2" placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="bg-[#FF7A50] text-[#1A0E07] font-semibold rounded-lg px-4 py-2 text-sm">Add lead</button>
              <button type="button" onClick={() => { setAdding(false); setForm(emptyLead) }} className="text-gray-500 px-3 py-2 text-sm">Cancel</button>
            </div>
          </form>
          <style>{`.crm-in{width:100%;background:#fff;border:1px solid #e5e0d8;border-radius:10px;padding:10px 12px;font-size:.92rem}.crm-in:focus{outline:none;border-color:#FF7A50}`}</style>
        </CardContent></Card>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {chips.map(c => (
          <button key={c.key} onClick={() => setFilter(c.key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${filter === c.key ? "bg-[#18120E] text-white border-[#18120E]" : "bg-white text-gray-600 border-gray-200 hover:border-[#FF7A50]"}`}>
            {c.label} <span className="opacity-70">{c.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : leads.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-400">
          <MessageSquare size={28} className="mx-auto mb-2 opacity-40" />
          No leads {filter !== "all" ? `at stage "${filter}"` : "yet"}. Add one, or they'll arrive from the website.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {leads.map(l => (
            <Card key={l.id}><CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#18120E] truncate">{l.name}{l.company && l.name !== l.company ? <span className="text-gray-400 font-normal"> · {l.company}</span> : null}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-1">
                    {l.email && <a href={`mailto:${l.email}`} className="flex items-center gap-1 text-[#FF7A50] hover:underline"><Mail size={13} /> {l.email}</a>}
                    {l.phone && <a href={`tel:${l.phone}`} className="flex items-center gap-1 text-[#FF7A50] hover:underline"><Phone size={13} /> {l.phone}</a>}
                  </div>
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STAGE_STYLE[l.status] || STAGE_STYLE.new}`}>{l.status}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {l.interest && <span className="text-xs bg-[#FF7A50]/10 text-[#FF7A50] px-2 py-0.5 rounded">{l.interest}</span>}
                <span className={`text-xs px-2 py-0.5 rounded ${l.source === "website" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>{l.source === "website" ? "inbound" : l.source || "outbound"}</span>
              </div>

              {l.message && <p className="text-sm text-gray-600 whitespace-pre-wrap">{l.message}</p>}

              {/* notes editor */}
              <div>
                {noteDraft[l.id] !== undefined ? (
                  <div className="flex gap-2">
                    <textarea className="flex-1 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-[#FF7A50]" rows="2" value={noteDraft[l.id]} onChange={e => setNoteDraft(d => ({ ...d, [l.id]: e.target.value }))} autoFocus />
                    <button onClick={() => saveNote(l.id)} className="text-green-600 p-1" title="Save"><Save size={16} /></button>
                    <button onClick={() => setNoteDraft(d => { const n = { ...d }; delete n[l.id]; return n })} className="text-gray-400 p-1" title="Cancel"><X size={16} /></button>
                  </div>
                ) : (
                  <button onClick={() => setNoteDraft(d => ({ ...d, [l.id]: l.notes || "" }))} className="text-sm text-left w-full text-gray-500 hover:text-gray-700 italic">
                    {l.notes ? `📝 ${l.notes}` : "+ add note"}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <select value={l.status} onChange={ev => setStage(l.id, ev.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#FF7A50] capitalize">
                  {STAGES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{new Date(l.created_at).toLocaleDateString()}</span>
                  <button onClick={() => del(l.id)} className="text-gray-400 hover:text-red-500 p-1" title="Delete"><Trash2 size={16} /></button>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  )
}
