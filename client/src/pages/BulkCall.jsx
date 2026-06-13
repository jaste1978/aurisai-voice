import { useEffect, useState, useRef } from "react"
import * as XLSX from "xlsx"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogClose } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/StatusBadge"
import { Upload, RefreshCw, Square, Eye, Download, Clock, Plus, Trash2, Pause, Play, Calendar } from "lucide-react"

// ─── IST helpers ─────────────────────────────────────────────────────────────
const IST_OFFSET = 5.5 * 60 * 60 * 1000
function toIST(utcDate) {
  if (!utcDate) return '—'
  const d = new Date(new Date(utcDate).getTime() + IST_OFFSET)
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' IST'
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const RECURRENCE_LABELS = { once: 'One-time', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }

// ─── Campaigns tab (existing bulk call UI) ───────────────────────────────────
function CampaignsTab() {
  const [agents, setAgents] = useState([])
  const [batches, setBatches] = useState([])
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [form, setForm] = useState({ agent_id: '', from_phone_number: '', name: '' })
  const [launching, setLaunching] = useState(false)
  const [executions, setExecutions] = useState(null)
  const [execModal, setExecModal] = useState(false)
  const fileRef = useRef()

  const load = () => {
    api.getAgents().then(r => setAgents(r.data || []))
    api.getBatches().then(r => setBatches(r.data || []))
  }
  useEffect(() => { load() }, [])

  const processFile = async (f) => {
    setFile(f)
    const fd = new FormData(); fd.append('file', f)
    const res = await api.previewCSV(fd)
    if (res.success) setPreview(res.data)
    else alert(res.error)
  }

  const onDrop = (e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]) }

  const launch = async () => {
    if (!file || !form.agent_id || !form.from_phone_number) return alert('File, agent, and from-number are required')
    setLaunching(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('agent_id', form.agent_id)
    fd.append('from_phone_number', form.from_phone_number)
    fd.append('name', form.name || file.name)
    const selectedAgent = agents.find(a => a.id === form.agent_id)
    if (selectedAgent) fd.append('agent_name', selectedAgent.name)
    const res = await api.createBatch(fd)
    setLaunching(false)
    if (res.success) { setFile(null); setPreview(null); setForm({ agent_id: '', from_phone_number: '', name: '' }); load() }
    else alert(res.error)
  }

  const downloadTemplate = () => {
    const csv = `contact_number,name,language,custom_field\n+919876543210,Pratik Shah,en,Gold SIP\n+918765432100,Riya Mehta,hi,Digital Gold\n+917654321000,Amit Kumar,en,EMI Gold\n`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'aurisai_bulk_call_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={downloadTemplate}><Download size={14} className="mr-1" /> CSV Template</Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-[#18120E]">Upload Contacts</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-[#FF7A50] bg-amber-50' : 'border-gray-300 hover:border-[#18120E]'}`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current.click()}
            >
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">{file ? file.name : 'Drag & drop CSV or click to browse'}</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files[0] && processFile(e.target.files[0])} />
            </div>
            {preview && (
              <div className="bg-green-50 rounded p-3 text-sm">
                <p className="font-medium text-green-700">✓ {preview.totalRows || preview.total} contacts loaded</p>
                <p className="text-xs text-green-600 mt-1">Columns: {preview.headers.join(', ')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-[#18120E]">Campaign Setup</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Campaign Name</label>
              <Input className="mt-1" placeholder="e.g. March Gold SIP Campaign" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Agent *</label>
              <select className="mt-1 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#18120E]" value={form.agent_id} onChange={e => setForm({...form, agent_id: e.target.value})}>
                <option value="">Select agent...</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">From Number *</label>
              <Input className="mt-1" placeholder="+919876543210" value={form.from_phone_number} onChange={e => setForm({...form, from_phone_number: e.target.value})} />
            </div>
            <Button onClick={launch} disabled={launching || !file || !form.agent_id || !form.from_phone_number} className="w-full">
              <Upload size={14} className="mr-2" />
              {launching ? 'Launching...' : 'Launch Campaign'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {preview && (
        <Card>
          <CardHeader><CardTitle className="text-[#18120E]">Preview (first 5 rows)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-[#18120E] text-white">{preview.headers.map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody>{preview.preview.map((row, i) => <tr key={i} className="border-b hover:bg-gray-50">{preview.headers.map(h => <td key={h} className="px-3 py-2">{row[h]}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#18120E]">Campaign History</CardTitle>
            <Button variant="outline" size="sm" onClick={load}><RefreshCw size={13} className="mr-1" /> Refresh</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#18120E] text-white">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Contacts</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{b.name || b.file_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{b.agent_name || b.agent_id?.slice(0,8)}</td>
                  <td className="px-4 py-3">{b.total_contacts}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => api.getBatchStatus(b.id).then(load)}><RefreshCw size={12} /></Button>
                    <Button size="sm" variant="outline" onClick={async () => { const r = await api.getBatchExecutions(b.id); setExecutions(r.data); setExecModal(true) }}><Eye size={12} /></Button>
                    {['created','scheduled','in_progress'].includes(b.status) && (
                      <Button size="sm" variant="destructive" onClick={() => api.stopBatch(b.id).then(load)}><Square size={12} /></Button>
                    )}
                  </td>
                </tr>
              ))}
              {batches.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No campaigns yet</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={execModal} onClose={() => setExecModal(false)}>
        <DialogHeader>
          <DialogTitle>Batch Executions</DialogTitle>
          <DialogClose onClose={() => setExecModal(false)} />
        </DialogHeader>
        <DialogContent>
          {executions && Array.isArray(executions) ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {executions.map((e, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded text-sm">
                  <div>
                    <p className="font-medium">{e.recipient_phone_number || e.phone_number}</p>
                    <p className="text-xs text-gray-500">{e.execution_id || e.id}</p>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
              ))}
              {executions.length === 0 && <p className="text-center text-gray-400 py-4">No executions yet</p>}
            </div>
          ) : <p className="text-gray-500 text-sm">No execution data available.</p>}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Schedule form modal ──────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '',
  agentId: '',
  agentName: '',
  fromPhoneNumber: '',
  recurrence: 'daily',
  scheduledTime: '10:00',
  daysOfWeek: [],
  dayOfMonth: 1,
  startDate: '',
  endDate: '',
}

function ScheduleModal({ open, onClose, agents, initial, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [contacts, setContacts] = useState([])  // parsed CSV rows
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          name: initial.name,
          agentId: initial.agentId,
          agentName: initial.agentName || '',
          fromPhoneNumber: initial.fromPhoneNumber,
          recurrence: initial.recurrence,
          scheduledTime: initial.scheduledTime,
          daysOfWeek: initial.daysOfWeek || [],
          dayOfMonth: initial.dayOfMonth || 1,
          startDate: initial.startDate ? initial.startDate.slice(0, 10) : '',
          endDate: initial.endDate ? initial.endDate.slice(0, 10) : '',
        })
        setContacts(initial.contacts || [])
        if ((initial.contacts || []).length) {
          setPreview({ count: initial.contacts.length, headers: Object.keys(initial.contacts[0] || {}) })
        }
      } else {
        setForm(EMPTY_FORM)
        setContacts([])
        setPreview(null)
      }
    }
  }, [open, initial])

  // Normalize Indian phone numbers — auto-prefix +91
  const normalizePhone = (val) => {
    if (!val) return val
    // Convert to string (handles numbers read from XLSX)
    let s = String(val).replace(/\s|-/g, '').trim()
    // Already fully formed
    if (s.startsWith('+')) return s
    // 12-digit starting with 91 → just add +
    if (/^91\d{10}$/.test(s)) return '+' + s
    // 10-digit Indian mobile → add +91
    if (/^\d{10}$/.test(s)) return '+91' + s
    // Anything else — return as-is
    return s
  }

  const normalizeRows = (rows, headers) => {
    // Bolna requires the column to be named exactly "contact_number"
    const phoneKey = headers.find(h => h === 'contact_number' || h.toLowerCase().includes('contact'))
    if (!phoneKey) return rows
    return rows.map(row => ({ ...row, [phoneKey]: normalizePhone(row[phoneKey]) }))
  }

  const processFile = async (f) => {
    const isXlsx = f.name.endsWith('.xlsx') || f.name.endsWith('.xls')

    if (isXlsx) {
      const buffer = await f.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true })
      if (!rows.length) { alert('No data found in the file'); return }
      const headers = Object.keys(rows[0])
      if (!headers.includes('contact_number')) {
        alert('Column "contact_number" is required. Please check the sample file for the correct format.')
        return
      }
      const normalized = normalizeRows(rows.map(r => Object.fromEntries(Object.entries(r).map(([k,v]) => [k, String(v)]))), headers)
      setContacts(normalized)
      setPreview({ count: normalized.length, headers })
    } else {
      // CSV fallback
      const fd = new FormData(); fd.append('file', f)
      const res = await api.previewCSV(fd)
      if (!res.success) { alert(res.error || 'Failed to parse CSV'); return }
      const text = await f.text()
      const lines = text.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
      if (!headers.includes('contact_number')) {
        alert('Column "contact_number" is required. Please check the sample file for the correct format.')
        return
      }
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']))
      })
      const normalized = normalizeRows(rows, headers)
      setContacts(normalized)
      setPreview({ count: normalized.length, headers })
    }
  }

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day) ? f.daysOfWeek.filter(d => d !== day) : [...f.daysOfWeek, day]
    }))
  }

  const save = async () => {
    if (!form.name) return alert('Campaign name is required')
    if (!form.agentId) return alert('Agent is required')
if (!contacts.length) return alert('Please upload a contacts CSV')
    if (form.recurrence === 'weekly' && !form.daysOfWeek.length) return alert('Select at least one day for weekly schedule')

    setSaving(true)
    const agent = agents.find(a => a.id === form.agentId)
    const payload = { ...form, agentName: agent?.name || '', contacts }

    let res
    if (initial) {
      res = await api.updateScheduledCampaign(initial.campaignId, payload)
    } else {
      res = await api.createScheduledCampaign(payload)
    }
    setSaving(false)

    if (res && (res.campaignId || res.id)) { onSaved(); onClose() }
    else alert(res?.message || 'Failed to save schedule')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold text-[#18120E]">{initial ? 'Edit Schedule' : 'New Scheduled Campaign'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-gray-700">Campaign Name *</label>
            <Input className="mt-1" placeholder="e.g. Daily Gold SIP Reminder" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          </div>

          {/* Agent */}
          <div>
            <label className="text-sm font-medium text-gray-700">Agent *</label>
            <select className="mt-1 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#18120E]"
              value={form.agentId} onChange={e => setForm(f => ({...f, agentId: e.target.value}))}>
              <option value="">Select agent...</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>


          {/* Contacts CSV */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Contacts (CSV) *</label>
              <button
                type="button"
                onClick={() => {
                  const ws = XLSX.utils.aoa_to_sheet([
                    ['contact_number', 'name'],
                    ['9876543210', 'Rahul Sharma'],
                    ['9812345678', 'Priya Patel'],
                  ])
                  // Force contact_number column to text so Excel doesn't convert to scientific notation
                  ws['A2'].t = 's'; ws['A3'].t = 's'
                  const wb = XLSX.utils.book_new()
                  XLSX.utils.book_append_sheet(wb, ws, 'Contacts')
                  XLSX.writeFile(wb, 'scheduled_campaign_sample.xlsx')
                }}
                className="text-xs text-[#18120E] underline hover:text-[#FF7A50] flex items-center gap-1"
              >
                <Download size={11} /> Download sample
              </button>
            </div>
            <div
              className={`mt-1 border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${dragging ? 'border-[#FF7A50] bg-amber-50' : 'border-gray-300 hover:border-[#18120E]'}`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]) }}
              onClick={() => fileRef.current.click()}
            >
              <Upload size={20} className="mx-auto text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">{preview ? `${preview.count} contacts loaded` : 'Drag & drop or click to browse'}</p>
              <p className="text-xs text-gray-400">Supports .xlsx and .csv · Indian numbers only · No need to add +91</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files[0] && processFile(e.target.files[0])} />
            </div>
            {preview && <p className="text-xs text-green-600 mt-1">Columns: {preview.headers.join(', ')}</p>}
          </div>

          {/* Recurrence */}
          <div>
            <label className="text-sm font-medium text-gray-700">Repeat</label>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {Object.entries(RECURRENCE_LABELS).map(([val, label]) => (
                <button key={val} type="button"
                  className={`py-1.5 rounded-md text-sm border transition-colors ${form.recurrence === val ? 'bg-[#18120E] text-white border-[#18120E]' : 'border-gray-300 hover:border-[#18120E]'}`}
                  onClick={() => setForm(f => ({...f, recurrence: val}))}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Time (IST) */}
          <div>
            <label className="text-sm font-medium text-gray-700">Time <span className="text-xs text-gray-400">(IST)</span></label>
            <Input type="time" className="mt-1 w-32" value={form.scheduledTime} onChange={e => setForm(f => ({...f, scheduledTime: e.target.value}))} />
          </div>

          {/* Weekly day picker */}
          {form.recurrence === 'weekly' && (
            <div>
              <label className="text-sm font-medium text-gray-700">Days of Week</label>
              <div className="mt-1 flex gap-2 flex-wrap">
                {DAY_NAMES.map((name, idx) => (
                  <button key={idx} type="button"
                    className={`w-10 h-10 rounded-full text-xs border transition-colors ${form.daysOfWeek.includes(idx) ? 'bg-[#FF7A50] text-white border-[#FF7A50]' : 'border-gray-300 hover:border-[#18120E]'}`}
                    onClick={() => toggleDay(idx)}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly day */}
          {form.recurrence === 'monthly' && (
            <div>
              <label className="text-sm font-medium text-gray-700">Day of Month</label>
              <Input type="number" min={1} max={28} className="mt-1 w-24" value={form.dayOfMonth}
                onChange={e => setForm(f => ({...f, dayOfMonth: parseInt(e.target.value) || 1}))} />
              <p className="text-xs text-gray-400 mt-1">Use 1–28 to avoid month-end issues</p>
            </div>
          )}

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Start Date</label>
              <Input type="date" className="mt-1" value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">End Date <span className="text-xs text-gray-400">(optional)</span></label>
              <Input type="date" className="mt-1" value={form.endDate} onChange={e => setForm(f => ({...f, endDate: e.target.value}))} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end p-5 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : (initial ? 'Update' : 'Create Schedule')}</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Scheduled tab ────────────────────────────────────────────────────────────
function ScheduledTab() {
  const [agents, setAgents] = useState([])
  const [schedules, setSchedules] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = async () => {
    const [ar, sr] = await Promise.all([api.getAgents(), api.getScheduledCampaigns()])
    setAgents(ar.data || [])
    setSchedules(Array.isArray(sr) ? sr : [])
  }
  useEffect(() => { load() }, [])

  const toggleActive = async (c) => {
    await api.updateScheduledCampaign(c.campaignId, { active: !c.active })
    load()
  }

  const remove = async (c) => {
    if (!confirm(`Delete "${c.name}"?`)) return
    await api.deleteScheduledCampaign(c.campaignId)
    load()
  }

  const openNew = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (c) => { setEditing(c); setModalOpen(true) }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus size={14} className="mr-1" /> New Schedule</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#18120E]">Scheduled Campaigns</CardTitle>
            <Button variant="outline" size="sm" onClick={load}><RefreshCw size={13} className="mr-1" /> Refresh</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#18120E] text-white">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Contacts</th>
                <th className="px-4 py-3 text-left">Schedule</th>
                <th className="px-4 py-3 text-left">Next Run (IST)</th>
                <th className="px-4 py-3 text-left">Runs</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(c => (
                <tr key={c.campaignId} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.agentName || c.agentId?.slice(0, 8)}</td>
                  <td className="px-4 py-3">{(c.contacts || []).length}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="font-medium">{RECURRENCE_LABELS[c.recurrence] || c.recurrence}</span>
                    {' '}<span className="text-gray-500">@ {c.scheduledTime} IST</span>
                    {c.recurrence === 'weekly' && c.daysOfWeek?.length > 0 && (
                      <div className="text-gray-400">{c.daysOfWeek.map(d => DAY_NAMES[d]).join(', ')}</div>
                    )}
                    {c.recurrence === 'monthly' && (
                      <div className="text-gray-400">Day {c.dayOfMonth}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={11} className="text-gray-400" />
                      {c.nextRunAt ? toIST(c.nextRunAt) : '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{c.runCount}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const isDone = !c.active && c.recurrence === 'once' && c.runCount > 0
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.active ? 'bg-green-100 text-green-700' : isDone ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {c.active ? <><Play size={9} /> Active</> : isDone ? <>✓ Completed</> : <><Pause size={9} /> Paused</>}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {!(c.recurrence === 'once' && !c.active && c.runCount > 0) && (<>
                        <Button size="sm" variant="outline" title={c.active ? 'Pause' : 'Resume'} onClick={() => toggleActive(c)}>
                          {c.active ? <Pause size={12} /> : <Play size={12} />}
                        </Button>
                        <Button size="sm" variant="outline" title="Edit" onClick={() => openEdit(c)}>
                          <Clock size={12} />
                        </Button>
                      </>)}
                      <Button size="sm" variant="destructive" title="Delete" onClick={() => remove(c)}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {schedules.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                  No scheduled campaigns yet — click "New Schedule" to create one
                </td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <ScheduleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        agents={agents}
        initial={editing}
        onSaved={load}
      />
    </div>
  )
}

// ─── Main BulkCall page ───────────────────────────────────────────────────────
export function BulkCall() {
  const [tab, setTab] = useState('campaigns')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#18120E]">Bulk Call</h2>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button
            className={`px-5 py-2 text-sm font-medium transition-colors ${tab === 'campaigns' ? 'bg-[#18120E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setTab('campaigns')}
          >
            Campaigns
          </button>
          <button
            className={`px-5 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === 'scheduled' ? 'bg-[#18120E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setTab('scheduled')}
          >
            <Clock size={13} /> Scheduled
          </button>
        </div>
      </div>

      {tab === 'campaigns' ? <CampaignsTab /> : <ScheduledTab />}
    </div>
  )
}
