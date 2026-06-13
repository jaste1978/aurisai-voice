import { useEffect, useState, useRef, useCallback } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw, Server, Monitor, Search, X, Play, Pause, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const SEVERITY_OPTIONS = ['ALL', 'INFO', 'WARNING', 'ERROR', 'DEFAULT']
const FRESHNESS_OPTIONS = [
  { label: '1 hour',  value: '1h' },
  { label: '6 hours', value: '6h' },
  { label: '1 day',   value: '1d' },
  { label: '3 days',  value: '3d' },
  { label: '7 days',  value: '7d' },
]

function severityClass(sev) {
  switch (sev) {
    case 'ERROR':   return 'bg-red-100 text-red-700 border-red-200'
    case 'WARNING': return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'INFO':    return 'bg-blue-100 text-blue-700 border-blue-200'
    default:        return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

function rowBg(sev) {
  switch (sev) {
    case 'ERROR':   return 'bg-red-50 border-l-2 border-red-400'
    case 'WARNING': return 'bg-amber-50 border-l-2 border-amber-400'
    default:        return 'border-l-2 border-transparent'
  }
}

function formatTs(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })
}

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false)
  const hasExtra = log.requestMethod || log.status || log.latency || log.remoteIp || log.revision

  return (
    <>
      <tr
        className={cn("text-xs hover:bg-opacity-80 cursor-pointer", rowBg(log.severity))}
        onClick={() => hasExtra && setExpanded(e => !e)}
      >
        <td className="px-3 py-2 whitespace-nowrap font-mono text-gray-500">
          {formatTs(log.timestamp)}
        </td>
        <td className="px-3 py-2 whitespace-nowrap">
          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", severityClass(log.severity))}>
            {log.severity}
          </span>
        </td>
        <td className="px-3 py-2 font-mono text-gray-800 max-w-2xl">
          <div className="flex items-start gap-1">
            {hasExtra && (
              expanded
                ? <ChevronDown size={12} className="mt-0.5 flex-shrink-0 text-gray-400" />
                : <ChevronRight size={12} className="mt-0.5 flex-shrink-0 text-gray-400" />
            )}
            <span className="break-all leading-relaxed">{log.message}</span>
          </div>
        </td>
        {log.status !== undefined ? (
          <td className="px-3 py-2 whitespace-nowrap">
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-bold",
              log.status >= 500 ? 'bg-red-100 text-red-700' :
              log.status >= 400 ? 'bg-amber-100 text-amber-700' :
              log.status >= 300 ? 'bg-purple-100 text-purple-700' :
              'bg-green-100 text-green-700'
            )}>
              {log.status}
            </span>
          </td>
        ) : <td />}
      </tr>
      {expanded && hasExtra && (
        <tr className={cn("text-xs", rowBg(log.severity))}>
          <td colSpan={4} className="px-6 pb-2">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 font-mono text-gray-600 bg-white/60 rounded p-2">
              {log.requestMethod && <div><span className="text-gray-400">Method:</span> {log.requestMethod}</div>}
              {log.requestUrl    && <div className="col-span-2"><span className="text-gray-400">URL:</span> {log.requestUrl}</div>}
              {log.latency       && <div><span className="text-gray-400">Latency:</span> {log.latency}</div>}
              {log.remoteIp      && <div><span className="text-gray-400">IP:</span> {log.remoteIp}</div>}
              {log.userAgent     && <div className="col-span-2"><span className="text-gray-400">UA:</span> {log.userAgent}</div>}
              {log.revision      && <div className="col-span-2"><span className="text-gray-400">Revision:</span> {log.revision}</div>}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function Logs() {
  const [env, setEnv]           = useState('production')
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [severity, setSeverity] = useState('ALL')
  const [filter, setFilter]     = useState('')
  const [limit, setLimit]       = useState(200)
  const [freshness, setFreshness] = useState('1d')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastFetched, setLastFetched] = useState(null)
  const timerRef = useRef(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = { env, limit, severity, filter, freshness }
    const res = await api.getLogs(params)
    setLoading(false)
    if (res.success) {
      setLogs(res.data || [])
      setLastFetched(new Date())
    } else {
      setError(res.error || 'Failed to fetch logs')
    }
  }, [env, limit, severity, filter, freshness])

  useEffect(() => {
    fetchLogs()
  }, [env, severity, freshness]) // auto-fetch when these change

  useEffect(() => {
    clearInterval(timerRef.current)
    if (autoRefresh) {
      timerRef.current = setInterval(fetchLogs, 10000)
    }
    return () => clearInterval(timerRef.current)
  }, [autoRefresh, fetchLogs])

  const errorCount   = logs.filter(l => l.severity === 'ERROR').length
  const warningCount = logs.filter(l => l.severity === 'WARNING').length
  const infoCount    = logs.filter(l => l.severity === 'INFO').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#18120E]">Server Logs</h2>
          {lastFetched && (
            <p className="text-xs text-gray-400 mt-0.5">
              Last fetched: {lastFetched.toLocaleTimeString()}
              {autoRefresh && ' · Auto-refreshing every 10s'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Auto-refresh toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(r => !r)}
            className={autoRefresh ? 'border-green-400 text-green-700 bg-green-50' : ''}
          >
            {autoRefresh ? <Pause size={13} className="mr-1" /> : <Play size={13} className="mr-1" />}
            {autoRefresh ? 'Pause' : 'Auto-refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw size={13} className={cn("mr-1", loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Env toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {['production', 'local'].map(e => (
          <button
            key={e}
            onClick={() => setEnv(e)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all",
              env === e
                ? 'bg-[#18120E] text-white shadow'
                : 'text-gray-600 hover:text-gray-800'
            )}
          >
            {e === 'production' ? <Server size={14} /> : <Monitor size={14} />}
            {e === 'production' ? 'Production (GCP)' : 'Local'}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      {logs.length > 0 && (
        <div className="flex gap-3 text-sm flex-wrap">
          <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-600 font-medium">{logs.length} entries</span>
          {errorCount   > 0 && <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium">{errorCount} errors</span>}
          {warningCount > 0 && <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">{warningCount} warnings</span>}
          {infoCount    > 0 && <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">{infoCount} info</span>}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Severity */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Severity</label>
              <div className="flex gap-1">
                {SEVERITY_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSeverity(s)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded border font-medium transition-colors",
                      severity === s ? severityClass(s === 'ALL' ? 'DEFAULT' : s) + ' border-current' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Freshness (production only) */}
            {env === 'production' && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Time range</label>
                <div className="flex gap-1">
                  {FRESHNESS_OPTIONS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setFreshness(f.value)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded border font-medium transition-colors",
                        freshness === f.value ? 'bg-[#18120E] text-white border-[#18120E]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Limit */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Max entries</label>
              <select
                value={limit}
                onChange={e => setLimit(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white"
              >
                {[50, 100, 200, 500].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-gray-500 block mb-1">Search</label>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by message..."
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchLogs()}
                  className="w-full pl-7 pr-7 py-1.5 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:border-[#18120E]"
                />
                {filter && (
                  <button onClick={() => setFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <Button size="sm" onClick={fetchLogs} disabled={loading} className="bg-[#18120E] hover:bg-[#18120E]/90 text-white">
              {loading ? <RefreshCw size={12} className="animate-spin mr-1" /> : <Search size={12} className="mr-1" />}
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      {/* Log table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading && logs.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              <RefreshCw size={20} className="animate-spin mx-auto mb-3 text-gray-300" />
              Fetching logs…
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No logs found</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#18120E] text-white text-left">
                  <th className="px-3 py-2 whitespace-nowrap w-44">Timestamp (IST)</th>
                  <th className="px-3 py-2 w-20">Severity</th>
                  <th className="px-3 py-2">Message</th>
                  <th className="px-3 py-2 w-16">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => <LogRow key={i} log={log} />)}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
