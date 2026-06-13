import { useEffect, useState, useRef } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/StatusBadge"
import { PostCallReport } from "@/components/PostCallReport"
import { RefreshCw, Eye, Clock, Mic, MicOff, CloudDownload, Download, ChevronDown, Loader2, FileText } from "lucide-react"

// ── Per-row Export Dropdown ───────────────────────────────────────────────────
function RowExportButton({ call, templates }) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const doExport = async (templateId, format) => {
    setOpen(false)
    setExporting(true)
    const result = await api.exportCalls({ templateId, format, callId: call.id })
    setExporting(false)
    if (!result.success) { alert(result.error || "Export failed"); return }
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement("a")
    a.href = url
    a.download = result.filename || `call_${call.id}.${format === "excel" ? "xlsx" : "csv"}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(v => !v)}
        disabled={exporting}
        title="Export this call"
      >
        {exporting ? <Loader2 size={12} className="animate-spin"/> : <Download size={12}/>}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-xl border z-50">
          {templates.length === 0 ? (
            <div className="px-4 py-3 text-xs text-gray-500 text-center">
              <FileText size={14} className="mx-auto mb-1 text-gray-300"/>
              No report templates yet.<br/>Create one in Report Templates.
            </div>
          ) : (
            <>
              <div className="px-3 py-2 border-b text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Export this call as
              </div>
              {templates.map(t => (
                <div key={t.templateId} className="border-b last:border-0">
                  <div className="px-3 pt-2 pb-1 text-xs font-medium text-gray-700 flex items-center gap-1">
                    <FileText size={11} className="text-gray-400 flex-shrink-0"/>
                    {t.name}
                  </div>
                  <div className="flex px-3 pb-2 gap-2">
                    <button
                      onClick={() => doExport(t.templateId, "csv")}
                      className="flex-1 text-xs px-2 py-1.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-600"
                    >CSV</button>
                    <button
                      onClick={() => doExport(t.templateId, "excel")}
                      className="flex-1 text-xs px-2 py-1.5 rounded border border-green-200 hover:bg-green-50 text-green-700"
                    >Excel</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function Calls() {
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(null)
  const [bulkFixing, setBulkFixing] = useState(false)
  const [bulkResult, setBulkResult] = useState(null)
  const [syncingAll, setSyncingAll] = useState(false)
  const [syncAllResult, setSyncAllResult] = useState(null)
  const [detail, setDetail] = useState(null)
  const [templates, setTemplates] = useState([])

  useEffect(() => {
    api.getReportTemplates().then(r => setTemplates(r.data || []))
  }, [])

  const load = () => api.getCalls().then(r => { setCalls(r.data || []); setLoading(false) })
  useEffect(() => { load() }, [])

  const sync = async (call) => {
    setSyncing(call.id)
    const res = await api.syncCall(call.id)
    if (res.success) {
      load()
      if (detail?.id === call.id) setDetail(res.data)
    } else {
      alert(res.error || 'Sync failed')
    }
    setSyncing(null)
  }

  const syncAllFromBolna = async () => {
    setSyncingAll(true)
    setSyncAllResult(null)
    const res = await api.syncAllFromBolna()
    setSyncingAll(false)
    if (res.success) {
      setSyncAllResult(res.data)
      load()
    } else {
      alert(res.error || 'Sync all failed')
    }
  }

  const bulkFixRecordings = async () => {
    setBulkFixing(true)
    setBulkResult(null)
    const res = await api.bulkSyncRecordings()
    setBulkFixing(false)
    if (res.success) {
      setBulkResult(res.data)
      load()
    } else {
      alert(res.error || 'Bulk sync failed')
    }
  }

  // Whether a completed call might still be processing its recording (< 5 min old)
  const recordingPending = (call) => {
    if (call.recording_url) return false
    if (call.status !== 'completed') return false
    const age = (Date.now() - new Date(call.updated_at).getTime()) / 1000 / 60
    return age < 5
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#18120E]">Call Logs</h2>
        <div className="flex gap-2">
          <Button
            onClick={syncAllFromBolna}
            disabled={syncingAll}
            title="Fetch latest data from Bolna for all calls"
            className="bg-[#18120E] hover:bg-[#024a5e] text-white"
          >
            <CloudDownload size={14} className={syncingAll ? 'animate-pulse mr-1' : 'mr-1'} />
            {syncingAll ? 'Syncing from Bolna…' : 'Sync All from Bolna'}
          </Button>
          <Button
            variant="outline"
            onClick={bulkFixRecordings}
            disabled={bulkFixing}
            title="Re-sync all completed calls missing recordings"
            className="text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            <RefreshCw size={14} className={bulkFixing ? 'animate-spin mr-1' : 'mr-1'} />
            {bulkFixing ? 'Fixing...' : 'Fix Recordings'}
          </Button>
          <Button variant="outline" onClick={load}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {syncAllResult && (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm border ${syncAllResult.failed === 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
          <CloudDownload size={15} className="flex-shrink-0" />
          <span>Bolna sync complete — <strong>{syncAllResult.synced} calls updated</strong>{syncAllResult.failed > 0 ? `, ${syncAllResult.failed} failed` : ''}.</span>
          <button onClick={() => setSyncAllResult(null)} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {bulkResult && (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm border ${bulkResult.fixed > 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
          ✅ Recording sync done — <strong>{bulkResult.fixed} fixed</strong>, {bulkResult.skipped} not ready yet, {bulkResult.failed} failed.
          {bulkResult.skipped > 0 && <span className="ml-1 text-amber-700">Run again in 2–3 min.</span>}
          <button onClick={() => setBulkResult(null)} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {/* Recording delay notice */}
      {calls.some(recordingPending) && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <Clock size={15} className="flex-shrink-0" />
          <span>Some recordings are still being processed by Bolna (takes 2–3 min after call ends). Click <strong>Sync</strong> again in a moment.</span>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#18120E] text-white">
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Duration</th>
                <th className="px-4 py-3 text-left">Recording</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {calls.map(call => (
                <tr key={call.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{call.customer_name || 'Unknown'}</td>
                  <td className="px-4 py-3">{call.phone_number}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{call.agent_name || call.agent_id?.slice(0, 8)}</td>
                  <td className="px-4 py-3"><StatusBadge status={call.status} /></td>
                  <td className="px-4 py-3">{call.duration ? `${call.duration}s` : '-'}</td>
                  <td className="px-4 py-3">
                    {call.recording_url
                      ? <span className="flex items-center gap-1 text-green-600 text-xs"><Mic size={12} /> Ready</span>
                      : recordingPending(call)
                        ? <span className="flex items-center gap-1 text-amber-500 text-xs"><Clock size={12} /> Processing…</span>
                        : <span className="flex items-center gap-1 text-gray-400 text-xs"><MicOff size={12} /> None</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(call.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sync(call)}
                      disabled={syncing === call.id}
                      title="Sync latest data from Bolna"
                    >
                      <RefreshCw size={12} className={syncing === call.id ? 'animate-spin' : ''} />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDetail(call)} title="View post-call report">
                      <Eye size={12} />
                    </Button>
                    <RowExportButton call={call} templates={templates} />
                  </td>
                </tr>
              ))}
              {calls.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No calls yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Post Call Report Modal */}
      {detail && (
        <PostCallReport
          call={detail}
          onClose={() => setDetail(null)}
          onSync={() => sync(detail)}
          syncing={syncing === detail?.id}
        />
      )}
    </div>
  )
}
