import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  RefreshCw, Clock, PhoneOff, DollarSign, Zap, Brain, TrendingUp, Target,
  AlertCircle, CheckCircle, Globe, ThumbsUp, Star, MessageSquare, Ticket,
  ExternalLink, XCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

// ── helpers ──────────────────────────────────────────────────────────────────

function safeParseJSON(str) {
  if (!str) return null
  if (typeof str === "object") return str
  try { return JSON.parse(str) } catch { return null }
}

function stripSSML(text) {
  if (!text) return ""
  return text.replace(/<[^>]+>/g, "").replace(/\s{2,}/g, " ").trim()
}

function fmtDuration(seconds) {
  if (seconds == null) return "N/A"
  const s = Math.round(Number(seconds))
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function fmtCost(val) {
  if (val == null) return "N/A"
  return `${Number(val).toFixed(4)}`
}

// ── Smart Status badge ────────────────────────────────────────────────────────

const SMART_STATUS_STYLES = {
  interested:          "bg-green-100 text-green-800 border border-green-300",
  not_interested:      "bg-red-100 text-red-800 border border-red-300",
  callback_scheduled:  "bg-blue-100 text-blue-800 border border-blue-300",
  rescheduled:         "bg-blue-100 text-blue-800 border border-blue-300",
  not_started:         "bg-gray-100 text-gray-600 border border-gray-300",
  completed:           "bg-teal-100 text-teal-800 border border-teal-300",
  voicemail:           "bg-yellow-100 text-yellow-800 border border-yellow-300",
  busy:                "bg-orange-100 text-orange-800 border border-orange-300",
  no_answer:           "bg-gray-100 text-gray-600 border border-gray-300",
}

function SmartStatusBadge({ status }) {
  if (!status) return <span className="text-gray-400 text-xs">N/A</span>
  const cls = SMART_STATUS_STYLES[status] || "bg-gray-100 text-gray-600 border border-gray-300"
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize", cls)}>
      {status.replace(/_/g, " ")}
    </span>
  )
}

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ score, max = 10 }) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100))
  const color = score >= 8 ? "bg-green-500" : score >= 5 ? "bg-yellow-400" : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={cn("h-2 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold w-10 text-right">{score}/{max}</span>
    </div>
  )
}

// ── Circular score badge ──────────────────────────────────────────────────────

function ScoreCircle({ score, max = 10 }) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100))
  const color = score >= 8 ? "#22c55e" : score >= 5 ? "#eab308" : "#ef4444"
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="relative inline-flex items-center justify-center w-20 h-20">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={r}
          fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-lg font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

// ── Behavioral score ring ─────────────────────────────────────────────────────

function BehavioralRing({ score, label, subtitle, color }) {
  const pct = Math.min(100, Math.max(0, score || 0))
  const ringColor = color || (pct >= 70 ? "#22c55e" : pct >= 40 ? "#eab308" : "#ef4444")
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="flex flex-col items-center gap-2 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="relative inline-flex items-center justify-center w-24 h-24">
        <svg width="96" height="96" className="-rotate-90">
          <circle cx="48" cy="48" r={r} fill="none" stroke="#e5e7eb" strokeWidth="7" />
          <circle
            cx="48" cy="48" r={r}
            fill="none" stroke={ringColor} strokeWidth="7"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-xl font-bold" style={{ color: ringColor }}>{pct}</span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 text-center">{label}</p>
      {subtitle && <p className="text-sm font-medium text-gray-700 capitalize">{subtitle}</p>}
    </div>
  )
}

// ── Mini progress bar ─────────────────────────────────────────────────────────

function MiniProgress({ label, value }) {
  const pct = Math.min(100, Math.max(0, value || 0))
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-400" : "bg-red-500"
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="font-bold text-gray-800">{pct}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={cn("h-2 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Cost breakdown bar ────────────────────────────────────────────────────────

const COST_COLORS = {
  llm:         "bg-purple-400",
  network:     "bg-blue-400",
  platform:    "bg-teal-500",
  synthesizer: "bg-amber-400",
  transcriber: "bg-rose-400",
}

function CostBreakdownBar({ breakdown }) {
  if (!breakdown) return null
  const entries = Object.entries(breakdown).filter(([, v]) => v != null && Number(v) > 0)
  if (!entries.length) return null
  const total = entries.reduce((s, [, v]) => s + Number(v), 0)
  return (
    <div className="space-y-3">
      {/* stacked bar */}
      <div className="flex h-5 rounded-full overflow-hidden w-full">
        {entries.map(([key, val]) => (
          <div
            key={key}
            className={cn(COST_COLORS[key] || "bg-gray-400")}
            style={{ width: `${(Number(val) / total) * 100}%` }}
            title={`${key}: ${fmtCost(val)} credits`}
          />
        ))}
      </div>
      {/* legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <span className={cn("inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0", COST_COLORS[key] || "bg-gray-400")} />
            <span className="capitalize text-gray-600">{key}</span>
            <span className="ml-auto font-medium text-gray-800">{fmtCost(val)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, iconColor = "text-[#18120E]" }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
      <div className={cn("mt-0.5 flex-shrink-0", iconColor)}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <div className="mt-0.5 font-semibold text-gray-800 text-sm">{value}</div>
      </div>
    </div>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-[#18120E] border-b border-gray-200 pb-1 mb-3">
      {children}
    </h3>
  )
}

// ── Tab button ────────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
        active
          ? "border-[#FF7A50] text-[#FF7A50]"
          : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
      )}
    >
      {children}
    </button>
  )
}

// ── Tab 1: Overview ───────────────────────────────────────────────────────────

function OverviewTab({ call, br, onSync, syncing }) {
  const td = br?.telephony_data || {}
  const recUrl = call.recording_url || null
  const recordingPending =
    !call.recording_url && call.status === "completed" &&
    (Date.now() - new Date(call.updated_at).getTime()) / 1000 / 60 < 5

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Clock}
          label="Duration"
          value={fmtDuration(br?.conversation_duration || call.duration)}
          iconColor="text-[#18120E]"
        />
        <StatCard
          icon={DollarSign}
          label="Total Cost"
          value={br?.total_cost != null ? `${Number(br.total_cost).toFixed(4)} credits` : "N/A"}
          iconColor="text-[#FF7A50]"
        />
        <StatCard
          icon={PhoneOff}
          label="Hangup By"
          value={td.hangup_by || "N/A"}
          iconColor="text-rose-500"
        />
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <div className="mt-0.5 flex-shrink-0 text-green-600"><Zap size={18} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Smart Status</p>
            <div className="mt-1"><SmartStatusBadge status={br?.smart_status} /></div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {br?.summary && (
        <div>
          <SectionTitle>AI Summary</SectionTitle>
          <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-4 leading-relaxed">
            {br.summary}
          </p>
        </div>
      )}

      {/* Telephony Details */}
      <div>
        <SectionTitle>Telephony Details</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          {[
            ["Provider", td.provider],
            ["Call Type", td.call_type],
            ["From", td.from_number || call.phone_number],
            ["To", td.to_number],
            ["Carrier", td.to_number_carrier],
            ["Ring Duration", td.ring_duration != null ? `${td.ring_duration}s` : null],
            ["Hangup Reason", td.hangup_reason],
          ].map(([label, val]) =>
            val ? (
              <div key={label} className="flex justify-between border-b border-gray-100 py-1.5">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-800 text-right max-w-[60%] truncate" title={val}>{val}</span>
              </div>
            ) : null
          )}
        </div>
      </div>

      {/* Recording */}
      <div>
        <SectionTitle>Recording</SectionTitle>
        {recUrl ? (
          <div className="space-y-2">
            <audio controls src={recUrl} className="w-full h-10" />
            <a
              href={recUrl}
              download={`call-${call.id}.mp3`}
              className="text-xs text-[#18120E] underline"
            >
              Download recording
            </a>
          </div>
        ) : recordingPending ? (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            <Clock size={14} />
            Recording is still processing. Click Sync in 2–3 minutes.
            <Button size="sm" variant="outline" className="ml-auto" onClick={onSync} disabled={syncing}>
              <RefreshCw size={11} className={cn("mr-1", syncing && "animate-spin")} /> Sync
            </Button>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No recording available.</p>
        )}
      </div>
    </div>
  )
}

// ── Tab 2: Transcript ─────────────────────────────────────────────────────────

function parseTranscript(raw) {
  if (!raw) return []
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean)
  const messages = []
  for (const line of lines) {
    const match = line.match(/^(assistant|agent|user|human):\s*(.+)$/i)
    if (match) {
      const role = match[1].toLowerCase() === "user" || match[1].toLowerCase() === "human" ? "user" : "agent"
      const text = stripSSML(match[2])
      if (text) messages.push({ role, text })
    } else if (messages.length > 0) {
      // continuation line — append to last
      const appended = stripSSML(line)
      if (appended) messages[messages.length - 1].text += " " + appended
    }
  }
  return messages
}

function TranscriptTab({ br }) {
  const raw = br?.transcript
  const messages = parseTranscript(raw)

  if (!raw) {
    return <p className="text-sm text-gray-400 py-8 text-center">No transcript available.</p>
  }

  if (!messages.length) {
    return (
      <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
        {raw}
      </pre>
    )
  }

  return (
    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
        >
          <div
            className={cn(
              "max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
              msg.role === "user"
                ? "bg-[#FF7A50] text-white rounded-br-sm"
                : "bg-[#18120E] text-white rounded-bl-sm"
            )}
          >
            <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70")}>
              {msg.role === "user" ? "User" : "Agent"}
            </p>
            {msg.text}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Tab 3: AI Insights ────────────────────────────────────────────────────────

function AIInsightsTab({ call, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [localInsights, setLocalInsights] = useState(() => safeParseJSON(call?.behavioral_insights))

  const insights = localInsights

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.analyzeCall(call.id)
      if (res.success) {
        setLocalInsights(res.data)
        onUpdate?.({ ...call, behavioral_insights: JSON.stringify(res.data) })
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to generate insights')
    } finally {
      setLoading(false)
    }
  }

  const score        = insights?.overall_score
  const strengths    = Array.isArray(insights?.strengths)  ? insights.strengths  : []
  const weaknesses   = Array.isArray(insights?.weaknesses) ? insights.weaknesses : []
  const summary      = insights?.summary
  const tags         = Array.isArray(insights?.behavioral_tags) ? insights.behavioral_tags : []
  const analyzedAt   = insights?.analyzed_at

  const scoreColor = score == null ? '#6b7280' : score >= 7 ? '#16a34a' : score >= 4 ? '#d97706' : '#dc2626'
  const scorePct   = score != null ? Math.round((score / 10) * 100) : 0

  return (
    <div className="space-y-5">

      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {!insights && !loading && (
        <div className="py-10 text-center flex flex-col items-center gap-4">
          <Brain size={32} className="text-gray-200" />
          <p className="text-sm text-gray-400">No insights yet — click Generate to analyse this call.</p>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
            className="bg-[#18120E] hover:bg-[#18120E]/90 text-white"
          >
            <Brain size={13} className="mr-2" />Generate AI Insights
          </Button>
        </div>
      )}

      {/* Re-generate button — only shown when insights already exist */}
      {insights && (
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading
              ? <><RefreshCw size={13} className="mr-2 animate-spin" />Analyzing…</>
              : <><RefreshCw size={13} className="mr-2" />Re-generate Insights</>
            }
          </Button>
          {analyzedAt && (
            <span className="text-xs text-gray-400">
              Last analyzed {new Date(analyzedAt).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {insights && (
        <>
          {/* Score + Summary */}
          <div className="flex items-start gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
            {/* Score circle */}
            {score != null && (
              <div className="shrink-0 flex flex-col items-center gap-1">
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreColor} strokeWidth="3"
                      strokeDasharray={`${scorePct} 100`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-base font-bold"
                    style={{ color: scoreColor }}>{score}</span>
                </div>
                <span className="text-xs text-gray-500">Score</span>
              </div>
            )}
            {/* Summary */}
            {summary && (
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Summary</p>
                <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
              </div>
            )}
          </div>

          {/* Strengths & Weaknesses */}
          {(strengths.length > 0 || weaknesses.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {strengths.length > 0 && (
                <div className="border border-green-200 rounded-xl p-4 bg-green-50/40">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">Strengths</p>
                  <ul className="space-y-2">
                    {strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle size={13} className="text-green-500 mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {weaknesses.length > 0 && (
                <div className="border border-red-200 rounded-xl p-4 bg-red-50/40">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-3">Weaknesses</p>
                  <ul className="space-y-2">
                    {weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <XCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Behavioural Tags */}
          {tags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((t, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[#18120E]/10 text-[#18120E] border border-[#18120E]/20 font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Tab 4: Cost & Usage ───────────────────────────────────────────────────────

function CostUsageTab({ br }) {
  const cb = br?.cost_breakdown
  const ub = br?.usage_breakdown
  const ld = br?.latency_data
  const ctx = br?.context_details?.recipient_data

  const hasData = cb || ub || ld || ctx
  if (!hasData) {
    return <p className="text-sm text-gray-400 py-8 text-center">No cost or usage data available.</p>
  }

  return (
    <div className="space-y-6">
      {/* Cost breakdown */}
      {cb && (
        <div>
          <SectionTitle>Cost Breakdown (credits)</SectionTitle>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-[#18120E]">
                {br?.total_cost != null ? `${Number(br.total_cost).toFixed(4)}` : "N/A"} credits
              </span>
            </div>
            <CostBreakdownBar breakdown={cb} />
          </div>
        </div>
      )}

      {/* Usage */}
      {ub && (
        <div>
          <SectionTitle>Usage Breakdown</SectionTitle>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["LLM Tokens", ub.llmTokens != null ? `${ub.llmTokens} tokens` : null],
                  ["Transcriber Duration", ub.transcriber_duration != null ? `${Number(ub.transcriber_duration).toFixed(1)}s` : null],
                  ["Synthesizer Characters", ub.synthesizer_characters != null ? `${ub.synthesizer_characters} chars` : null],
                ].filter(([, v]) => v).map(([label, val], i) => (
                  <tr key={label} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-2.5 text-gray-500 border-b border-gray-100">{label}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800 text-right border-b border-gray-100">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Latency */}
      {ld?.time_to_first_audio != null && (
        <div>
          <SectionTitle>Latency</SectionTitle>
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm">
            <span className="text-gray-600 flex items-center gap-1.5">
              <Zap size={14} className="text-[#FF7A50]" /> Time to First Audio
            </span>
            <span className="font-bold text-[#18120E]">{Number(ld.time_to_first_audio).toFixed(0)} ms</span>
          </div>
        </div>
      )}

      {/* Context details */}
      {ctx && Object.keys(ctx).length > 0 && (
        <div>
          <SectionTitle>Context Details</SectionTitle>
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {Object.entries(ctx).map(([k, v]) => (
              <div key={k} className="flex px-4 py-2.5 text-sm">
                <span className="text-gray-500 w-1/2 capitalize">{k.replace(/_/g, " ")}</span>
                <span className="text-gray-800 font-medium">{String(v ?? "—")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab 5: Behavioral Insights ────────────────────────────────────────────────

const KEY_MOMENT_CONFIG = {
  objection:        { emoji: "🚫", color: "text-red-600",    bg: "bg-red-50 border-red-200" },
  interest:         { emoji: "✅", color: "text-green-600",  bg: "bg-green-50 border-green-200" },
  confusion:        { emoji: "🤔", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  agreement:        { emoji: "🤝", color: "text-teal-600",   bg: "bg-teal-50 border-teal-200" },
  callback_request: { emoji: "📅", color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" },
  language_switch:  { emoji: "🌐", color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  disengagement:    { emoji: "📴", color: "text-gray-500",   bg: "bg-gray-50 border-gray-200" },
}

const SENTIMENT_DOT = {
  positive: "bg-green-500",
  neutral:  "bg-yellow-400",
  negative: "bg-red-500",
}

// ── Communication Skills Card ─────────────────────────────────────────────────

const GRADE_STYLE = {
  A: "bg-green-100 text-green-800 border-green-300",
  B: "bg-teal-100 text-teal-800 border-teal-300",
  C: "bg-yellow-100 text-yellow-800 border-yellow-300",
  D: "bg-orange-100 text-orange-800 border-orange-300",
  F: "bg-red-100 text-red-800 border-red-300",
}

function CommMetricRow({ metric }) {
  if (!metric) return null
  const pct = Math.min(100, Math.max(0, metric.score || 0))
  const color = pct >= 70 ? "bg-green-500" : pct >= 45 ? "bg-yellow-400" : "bg-red-500"
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{metric.label}</span>
        <span className={cn("text-sm font-bold", pct >= 70 ? "text-green-700" : pct >= 45 ? "text-yellow-700" : "text-red-600")}>{pct}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={cn("h-2 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      {metric.observation && <p className="text-xs text-gray-500 italic">{metric.observation}</p>}
    </div>
  )
}

function CommunicationSkillsCard({ cs }) {
  if (!cs) return null
  const metrics = cs.metrics || {}
  const grade = cs.overall_grade || "—"
  const gradeStyle = GRADE_STYLE[grade] || "bg-gray-100 text-gray-600 border-gray-300"
  const strengths = Array.isArray(cs.strengths) ? cs.strengths : []
  const improvements = Array.isArray(cs.areas_for_improvement) ? cs.areas_for_improvement : []
  const fillers = Array.isArray(cs.filler_words_detected) ? cs.filler_words_detected : []
  const quotes = Array.isArray(cs.notable_quotes) ? cs.notable_quotes : []

  return (
    <div className="border-2 border-[#18120E]/20 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-[#18120E] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare size={18} className="text-[#FF7A50]" />
          <div>
            <p className="text-white font-semibold text-sm">Communication Skills</p>
            {cs.language_used && <p className="text-teal-300 text-xs mt-0.5">Language: {cs.language_used}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {cs.overall_score != null && (
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{cs.overall_score}</p>
              <p className="text-teal-300 text-[10px] uppercase tracking-wide">Overall</p>
            </div>
          )}
          {grade !== "—" && (
            <span className={cn("text-2xl font-extrabold px-3 py-1 rounded-lg border-2", gradeStyle)}>{grade}</span>
          )}
        </div>
      </div>

      <div className="bg-white p-5 space-y-5">
        {/* Summary */}
        {cs.summary && (
          <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-200">{cs.summary}</p>
        )}

        {/* Metric bars */}
        {Object.keys(metrics).length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {Object.values(metrics).map((m, i) => <CommMetricRow key={i} metric={m} />)}
          </div>
        )}

        {/* Strengths & Improvements */}
        {(strengths.length > 0 || improvements.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {strengths.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <CheckCircle size={12} /> Strengths
                </p>
                <ul className="space-y-1.5">
                  {strengths.map((s, i) => (
                    <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {improvements.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <TrendingUp size={12} /> Areas to Improve
                </p>
                <ul className="space-y-1.5">
                  {improvements.map((s, i) => (
                    <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                      <span className="text-orange-400 mt-0.5 flex-shrink-0">→</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Filler words */}
        {fillers.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filler Words Detected</p>
            <div className="flex flex-wrap gap-2">
              {fillers.map((f, i) => (
                <span key={i} className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-full px-3 py-1">"{f}"</span>
              ))}
            </div>
          </div>
        )}

        {/* Notable quotes */}
        {quotes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notable Quotes</p>
            <div className="space-y-2">
              {quotes.map((q, i) => (
                <blockquote key={i} className="border-l-4 border-[#FF7A50] pl-3 text-sm text-gray-700 italic">"{q}"</blockquote>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BehavioralTab({ call, onUpdate }) {
  const [insights, setInsights] = useState(() => {
    const raw = call?.behavioral_insights
    return raw ? safeParseJSON(raw) : null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function runAnalysis() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.analyzeCall(call.id)
      if (res.success) {
        setInsights(res.data)
        if (onUpdate) onUpdate({ ...call, behavioral_insights: res.data })
      } else {
        setError(res.error || "Analysis failed")
      }
    } catch (e) {
      setError(e.message || "Analysis failed")
    } finally {
      setLoading(false)
    }
  }

  // Empty state
  if (!insights) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5">
        <div className="w-16 h-16 rounded-full bg-[#18120E]/10 flex items-center justify-center">
          <Brain size={32} className="text-[#18120E]" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-800">Behavioral Insights</p>
          <p className="text-sm text-gray-500 mt-1">Analyze conversation behavior using AI</p>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
        <Button
          onClick={runAnalysis}
          disabled={loading}
          className="bg-[#18120E] hover:bg-[#18120E]/90 text-white px-6"
        >
          {loading
            ? <><RefreshCw size={14} className="mr-2 animate-spin" /> Analyzing…</>
            : <><Brain size={14} className="mr-2" /> Run Behavioral Analysis</>
          }
        </Button>
      </div>
    )
  }

  const journey = Array.isArray(insights.sentiment_journey) ? insights.sentiment_journey : []
  const keyMoments = Array.isArray(insights.key_moments) ? insights.key_moments : []
  const objections = Array.isArray(insights.objections) ? insights.objections : []
  const intentSignals = Array.isArray(insights.intent_signals) ? insights.intent_signals : []
  const behavioralTags = Array.isArray(insights.behavioral_tags) ? insights.behavioral_tags : []
  const agentPerf = insights.agent_performance || {}

  return (
    <div className="space-y-6">

      {/* Re-run button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={runAnalysis}
          disabled={loading}
          className="text-[#18120E] border-[#18120E]/30 hover:bg-[#18120E]/5"
        >
          {loading
            ? <><RefreshCw size={12} className="mr-1.5 animate-spin" /> Analyzing…</>
            : <><RefreshCw size={12} className="mr-1.5" /> Re-analyze</>
          }
        </Button>
      </div>

      {/* Row 1 — 3 score rings */}
      <div className="grid grid-cols-3 gap-3">
        <BehavioralRing
          score={insights.sentiment_score}
          label="Sentiment Score"
          subtitle={insights.overall_sentiment}
        />
        <BehavioralRing
          score={insights.engagement_score}
          label="Engagement Score"
          subtitle={insights.engagement_level}
        />
        <BehavioralRing
          score={insights.conversion_likelihood}
          label="Conversion Likelihood"
          subtitle={insights.conversion_likelihood != null ? `${insights.conversion_likelihood}%` : null}
          color="#FF7A50"
        />
      </div>

      {/* Emotional tone */}
      {insights.emotional_tone && (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <Star size={16} className="text-[#FF7A50] flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Emotional Tone</p>
            <p className="text-sm text-gray-800 font-medium">{insights.emotional_tone}</p>
          </div>
        </div>
      )}

      {/* Sentiment Journey */}
      {journey.length > 0 && (
        <div>
          <SectionTitle>Sentiment Journey</SectionTitle>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {journey.map((turn, i) => (
              <div
                key={i}
                className="flex-shrink-0 bg-white border border-gray-200 rounded-lg px-3 py-2 min-w-[130px] max-w-[160px] shadow-sm"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0", SENTIMENT_DOT[turn.sentiment] || "bg-gray-400")} />
                  <span className="text-[10px] text-gray-500 uppercase font-semibold truncate">{turn.speaker}</span>
                  <span className="ml-auto text-[10px] font-bold text-gray-600">{turn.score}</span>
                </div>
                <p className="text-xs text-gray-700 leading-snug line-clamp-2">
                  {turn.text ? turn.text.slice(0, 40) + (turn.text.length > 40 ? "…" : "") : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Moments */}
      {keyMoments.length > 0 && (
        <div>
          <SectionTitle>Key Moments</SectionTitle>
          <div className="space-y-2">
            {keyMoments.map((km, i) => {
              const cfg = KEY_MOMENT_CONFIG[km.type] || KEY_MOMENT_CONFIG.objection
              return (
                <div key={i} className={cn("flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm", cfg.bg)}>
                  <span className="flex-shrink-0 text-base leading-none mt-0.5">{cfg.emoji}</span>
                  <div>
                    <span className={cn("text-xs font-semibold uppercase tracking-wide", cfg.color)}>
                      {(km.type || "").replace(/_/g, " ")}
                    </span>
                    <p className="text-gray-700 text-sm mt-0.5">{km.moment}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Two columns: objections + signals | behavioral tags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Left: objections + intent signals */}
        <div className="space-y-4">
          {objections.length > 0 && (
            <div>
              <SectionTitle>Objections</SectionTitle>
              <div className="space-y-2">
                {objections.map((obj, i) => {
                  const text = typeof obj === 'string' ? obj : obj.objection
                  const resolved = typeof obj === 'object' ? obj.resolved : null
                  const response = typeof obj === 'object' ? obj.response : null
                  return (
                    <div key={i} className="text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1 font-medium text-red-700">
                        <AlertCircle size={11} />
                        {text}
                        {resolved != null && (
                          <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${resolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {resolved ? 'Resolved' : 'Unresolved'}
                          </span>
                        )}
                      </div>
                      {response && <p className="mt-1 text-gray-500 pl-4">{response}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {intentSignals.length > 0 && (
            <div>
              <SectionTitle>Intent Signals</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {intentSignals.map((sig, i) => {
                  const text = typeof sig === 'string' ? sig : sig.signal
                  const strength = typeof sig === 'object' ? sig.strength : null
                  const strengthColor = strength === 'high' ? 'bg-green-100 text-green-800' : strength === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                  return (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 font-medium">
                      <CheckCircle size={11} />
                      {text}
                      {strength && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${strengthColor}`}>{strength}</span>}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: behavioral tags */}
        {behavioralTags.length > 0 && (
          <div>
            <SectionTitle>Behavioral Tags</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {behavioralTags.map((tag, i) => (
                <span
                  key={i}
                  className="text-xs bg-gray-100 text-gray-700 border border-gray-300 rounded-full px-3 py-1 font-medium capitalize"
                >
                  {tag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Profile Summary */}
      {insights.user_profile_summary && (
        <div>
          <SectionTitle>User Profile Summary</SectionTitle>
          <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <MessageSquare size={16} className="text-[#18120E] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 leading-relaxed">{insights.user_profile_summary}</p>
          </div>
        </div>
      )}

      {/* Follow-up Recommendation */}
      {insights.follow_up_recommendation && (
        <div>
          <SectionTitle>Follow-up Recommendation</SectionTitle>
          <div className="flex items-start gap-3 border-2 rounded-xl p-4" style={{ borderColor: "#FF7A50", background: "#FFF9F0" }}>
            <span className="text-lg flex-shrink-0">📋</span>
            <p className="text-sm text-gray-800 leading-relaxed">{insights.follow_up_recommendation}</p>
          </div>
        </div>
      )}

      {/* Agent Performance */}
      {(agentPerf.clarity != null || agentPerf.empathy != null || agentPerf.objection_handling != null) && (
        <div>
          <SectionTitle>Agent Performance</SectionTitle>
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            {agentPerf.clarity != null && <MiniProgress label="Clarity" value={agentPerf.clarity} />}
            {agentPerf.empathy != null && <MiniProgress label="Empathy" value={agentPerf.empathy} />}
            {agentPerf.objection_handling != null && <MiniProgress label="Objection Handling" value={agentPerf.objection_handling} />}
            {agentPerf.notes && (
              <p className="text-xs text-gray-500 pt-1 border-t border-gray-100 mt-2">{agentPerf.notes}</p>
            )}
          </div>
        </div>
      )}

      {/* Communication Skills */}
      {insights.communication_skills && <CommunicationSkillsCard cs={insights.communication_skills} />}

      {/* Analyzed at */}
      {insights.analyzed_at && (
        <p className="text-xs text-gray-400 text-right">
          Analyzed at {new Date(insights.analyzed_at).toLocaleString()}
        </p>
      )}
    </div>
  )
}

// ── Support Ticket Tab ────────────────────────────────────────────────────────

function SupportTicketRow({ label, value, mono }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="w-36 text-xs text-gray-400 flex-shrink-0 pt-0.5">{label}</span>
      <span className={cn("text-sm text-gray-800 font-medium flex-1", mono && "font-mono text-xs")}>{value}</span>
    </div>
  )
}

function SupportTicketTab({ call }) {
  const ticket = safeParseJSON(call?.freshdesk_ticket)

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Ticket size={24} className="text-gray-300" />
        </div>
        <p className="font-semibold text-gray-400">No support ticket for this call</p>
        <p className="text-sm text-gray-300 mt-2 max-w-sm">
          Tickets are created automatically when the caller requests support and the agent
          has Freshdesk integration enabled.
        </p>
      </div>
    )
  }

  if (ticket.error) {
    return (
      <div className="p-4 rounded-xl border border-red-200 bg-red-50 space-y-2">
        <div className="flex items-center gap-2 text-red-600 font-semibold">
          <XCircle size={16} />
          Ticket Creation Failed
        </div>
        <p className="text-sm text-red-500">{ticket.error}</p>
        {ticket.attempted_at && (
          <p className="text-xs text-gray-400">
            Attempted at: {new Date(ticket.attempted_at).toLocaleString()}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Check your Freshdesk domain and API key in <strong>Agent Config</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Success Header */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle size={20} className="text-green-600" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-green-700">Support Ticket Created</p>
          <p className="text-xs text-green-600">Ticket was automatically raised after the call ended.</p>
        </div>
        {ticket.ticket_url && (
          <a
            href={ticket.ticket_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition flex-shrink-0"
          >
            Open in Freshdesk
            <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Ticket Details */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-[#18120E] text-white text-sm font-semibold flex items-center gap-2">
          <Ticket size={14} className="text-[#FF7A50]" />
          Ticket Details
        </div>
        <div className="px-4 divide-y divide-gray-100">
          <SupportTicketRow label="Ticket ID" value={`#${ticket.ticket_id}`} />
          <SupportTicketRow
            label="Status"
            value={
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                {ticket.status ? ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1) : "Open"}
              </span>
            }
          />
          <SupportTicketRow label="Subject" value={ticket.subject || "Support Request via Voice Call"} />
          {ticket.email && <SupportTicketRow label="Customer Email" value={ticket.email} mono />}
          {ticket.phone && <SupportTicketRow label="Customer Phone" value={ticket.phone} mono />}
          {ticket.created_at && (
            <SupportTicketRow
              label="Created At"
              value={new Date(ticket.created_at).toLocaleString()}
            />
          )}
          {ticket.ticket_url && (
            <SupportTicketRow
              label="Freshdesk URL"
              value={
                <a
                  href={ticket.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1 text-xs font-mono"
                >
                  {ticket.ticket_url} <ExternalLink size={10} />
                </a>
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS = ["Overview", "Transcript", "AI Insights", "Behavioral", "Cost & Usage", "Support Ticket"]

export function PostCallReport({ call, onClose, onSync, syncing }) {
  const [tab, setTab] = useState(0)
  const [localCall, setLocalCall] = useState(call)

  // Keep localCall in sync when parent re-fetches after sync
  useEffect(() => { setLocalCall(call) }, [call])

  // bolna_response may be a JSON string from DB
  const br = safeParseJSON(localCall?.bolna_response)

  const title = localCall?.customer_name
    ? `Post Call Report — ${localCall.customer_name}`
    : localCall?.phone_number
      ? `Post Call Report — ${localCall.phone_number}`
      : "Post Call Report"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* panel */}
      <div className="relative z-50 w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-xl shadow-2xl mx-4 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#18120E] flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <p className="text-xs text-teal-300 mt-0.5">
                {localCall?.phone_number} &nbsp;·&nbsp; {new Date(localCall?.created_at).toLocaleString()}
                {localCall?.agent_name && ` · ${localCall.agent_name}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onSync}
                disabled={syncing}
                className="text-white border-teal-400 hover:bg-teal-800 bg-transparent"
              >
                <RefreshCw size={12} className={cn("mr-1", syncing && "animate-spin")} />
                Sync
              </Button>
              <button onClick={onClose} className="text-teal-300 hover:text-white ml-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-white px-4 flex-shrink-0 overflow-x-auto">
            {TABS.map((t, i) => (
              <TabBtn key={t} active={tab === i} onClick={() => setTab(i)}>{t}</TabBtn>
            ))}
          </div>

          {/* No data notice */}
          {!br && (
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 text-sm text-amber-700 flex items-center gap-2 flex-shrink-0">
              <Clock size={14} />
              Post-call data not yet synced. Click Sync to fetch the latest data from Bolna.
            </div>
          )}

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {tab === 0 && <OverviewTab call={localCall} br={br} onSync={onSync} syncing={syncing} />}
            {tab === 1 && <TranscriptTab br={br} />}
            {tab === 2 && <AIInsightsTab call={localCall} onUpdate={setLocalCall} />}
            {tab === 3 && <BehavioralTab call={localCall} onUpdate={setLocalCall} />}
            {tab === 4 && <CostUsageTab br={br} />}
            {tab === 5 && <SupportTicketTab call={localCall} />}
        </div>
      </div>
    </div>
  )
}
