import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Phone, Building2, Trash2, MessageSquare, RefreshCw } from "lucide-react"

const STATUSES = ["new", "contacted", "qualified", "closed"]
const STATUS_STYLE = {
  new:       "bg-[#FF7A50]/15 text-[#FF7A50] border-[#FF7A50]/40",
  contacted: "bg-amber-100 text-amber-700 border-amber-300",
  qualified: "bg-blue-100 text-blue-700 border-blue-300",
  closed:    "bg-gray-100 text-gray-500 border-gray-300",
}

export function Enquiries() {
  const [enquiries, setEnquiries] = useState([])
  const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, qualified: 0, closed: 0 })
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([api.getEnquiries(filter === "all" ? undefined : filter), api.getEnquiryStats()])
      .then(([e, s]) => { setEnquiries(e.data || []); if (s.data) setStats(s.data); setLoading(false) })
  }
  useEffect(() => { load() }, [filter])

  const setStatus = async (id, status) => {
    const res = await api.updateEnquiry(id, { status })
    if (res.success) load()
  }
  const del = async (id) => {
    if (!confirm("Delete this enquiry?")) return
    await api.deleteEnquiry(id); load()
  }

  const chips = [
    { key: "all", label: "All", count: stats.total },
    { key: "new", label: "New", count: stats.new },
    { key: "contacted", label: "Contacted", count: stats.contacted },
    { key: "qualified", label: "Qualified", count: stats.qualified },
    { key: "closed", label: "Closed", count: stats.closed },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#18120E]">Enquiries</h2>
        <button onClick={load} className="text-gray-500 hover:text-[#FF7A50] p-2" title="Refresh">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <p className="text-sm text-gray-500 -mt-2">Leads captured from the AurisAI website contact form.</p>

      {/* filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {chips.map(c => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === c.key
                ? "bg-[#18120E] text-white border-[#18120E]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#FF7A50]"
            }`}
          >
            {c.label} <span className="opacity-70">{c.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading enquiries...</div>
      ) : enquiries.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-400">
          <MessageSquare size={28} className="mx-auto mb-2 opacity-40" />
          No enquiries {filter !== "all" ? `with status "${filter}"` : "yet"}.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {enquiries.map(e => (
            <Card key={e.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#18120E] truncate">{e.name}</p>
                    {e.company && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Building2 size={12} /> {e.company}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLE[e.status] || STATUS_STYLE.new}`}>
                    {e.status}
                  </span>
                </div>

                {e.interest && (
                  <span className="inline-block text-xs bg-[#FF7A50]/10 text-[#FF7A50] px-2 py-0.5 rounded">
                    {e.interest}
                  </span>
                )}

                <p className="text-sm text-gray-700 whitespace-pre-wrap">{e.message}</p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <a href={`mailto:${e.email}`} className="flex items-center gap-1.5 text-[#FF7A50] hover:underline">
                    <Mail size={14} /> {e.email}
                  </a>
                  {e.phone && (
                    <a href={`tel:${e.phone}`} className="flex items-center gap-1.5 text-[#FF7A50] hover:underline">
                      <Phone size={14} /> {e.phone}
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <select
                    value={e.status}
                    onChange={ev => setStatus(e.id, ev.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#FF7A50] capitalize"
                  >
                    {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{new Date(e.created_at).toLocaleString()}</span>
                    <button onClick={() => del(e.id)} className="text-gray-400 hover:text-red-500 p-1" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
