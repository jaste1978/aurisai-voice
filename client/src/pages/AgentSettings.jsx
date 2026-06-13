import { useState, useEffect } from "react"
import { Bot, Settings, CheckCircle, XCircle, Loader2, Eye, EyeOff, Ticket, ChevronRight, Zap, MessageSquare } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

// ── Toggle Switch ──────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
        checked ? "bg-[#FF7A50]" : "bg-gray-300"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  )
}

// ── Bolna Script Guide ──────────────────────────────────────────────────────────
function ScriptGuide() {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-[#FF7A50]/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#FF7A50]/10 text-left"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-[#FF7A50]">
          <Zap size={15} />
          Bolna Agent Script — Support Ticket Collection Flow
        </div>
        <ChevronRight size={15} className={cn("text-[#FF7A50] transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="p-4 space-y-4 text-sm bg-[#0F0D0A]/5">
          <p className="text-gray-500 text-xs">
            Add this flow to your Bolna agent's task prompt so it collects email &amp; phone when a caller asks to raise a ticket.
          </p>

          <div className="space-y-3">
            {[
              {
                step: "1",
                label: "Trigger Intent",
                text: `When the user says they want to "raise a ticket", "log a complaint", "create a support request", or similar — enter this flow.`,
              },
              {
                step: "2",
                label: "Ask for email",
                text: `"I'll be happy to raise a support ticket for you. Could you please share your email address?"`,
              },
              {
                step: "3",
                label: "Spell back the email",
                text: `"Let me confirm — that's [spell each character, replace @ with 'at', . with 'dot']. For example: j-o-h-n at g-m-a-i-l dot c-o-m. Is that correct?"`,
              },
              {
                step: "4",
                label: "Confirm or re-collect",
                text: `If user confirms → proceed. If not → "My apologies, let me take that again." and repeat from step 2.`,
              },
              {
                step: "5",
                label: "Ask for mobile number",
                text: `"Thank you! Could you also share your mobile number so our team can follow up with you?"`,
              },
              {
                step: "6",
                label: "Read back mobile",
                text: `"Let me confirm — [read each digit with a brief pause, e.g. 9-8-7-6-5-4-3-2-1-0]. Is that right?"`,
              },
              {
                step: "7",
                label: "Acknowledge & close",
                text: `"Perfect! Your support ticket will be raised automatically after this call. Our team will reach out to you shortly. Is there anything else I can help you with today?"`,
              },
            ].map(({ step, label, text }) => (
              <div key={step} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#18120E] text-[#FF7A50] text-xs font-bold flex items-center justify-center">{step}</div>
                <div>
                  <p className="font-semibold text-[#18120E]">{label}</p>
                  <p className="text-gray-600 mt-0.5">{text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 p-3 bg-[#18120E] rounded-lg space-y-1">
            <p className="text-[#FF7A50] text-xs font-semibold uppercase tracking-wide">Required Extraction Variables in Bolna</p>
            <p className="text-gray-300 text-xs">Add these two variables to your agent's <span className="font-mono bg-black/30 px-1 rounded">extraction_details</span>:</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 font-mono text-xs text-green-400">
                <span className="text-gray-400">•</span>
                <span className="text-white">support_email</span>
                <span className="text-gray-400">— type: string — "Email address for the support ticket"</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-green-400">
                <span className="text-gray-400">•</span>
                <span className="text-white">support_phone</span>
                <span className="text-gray-400">— type: string — "Phone number for the support ticket"</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Agent Config Panel ──────────────────────────────────────────────────────────
function AgentConfigPanel({ agent }) {
  const [config, setConfig] = useState({
    freshdeskEnabled: false,
    freshdeskDomain: '',
    freshdeskApiKey: '',
    gchatEnabled: false,
    gchatWebhookUrl: '',
    gchatSendTranscript: true,
    gchatSendSummary: true,
  })
  const [apiKeySet, setApiKeySet] = useState(false)
  const [apiKeyChanged, setApiKeyChanged] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    setLoading(true)
    setResult(null)
    api.getAgentConfig(agent.id).then(res => {
      if (res.success) {
        setConfig({
          freshdeskEnabled: res.data.freshdeskEnabled,
          freshdeskDomain: res.data.freshdeskDomain || '',
          freshdeskApiKey: '',
          gchatEnabled: res.data.gchatEnabled ?? false,
          gchatWebhookUrl: res.data.gchatWebhookUrl || '',
          gchatSendTranscript: res.data.gchatSendTranscript ?? true,
          gchatSendSummary: res.data.gchatSendSummary ?? true,
        })
        setApiKeySet(res.data.freshdeskApiKeySet)
        setApiKeyChanged(false)
      }
    }).finally(() => setLoading(false))
  }, [agent.id])

  async function handleSave() {
    setSaving(true)
    setResult(null)
    try {
      const payload = {
        freshdeskEnabled: config.freshdeskEnabled,
        freshdeskDomain: config.freshdeskDomain,
        freshdeskApiKey: apiKeyChanged ? config.freshdeskApiKey : '',
        gchatEnabled: config.gchatEnabled,
        gchatWebhookUrl: config.gchatWebhookUrl,
        gchatSendTranscript: config.gchatSendTranscript,
        gchatSendSummary: config.gchatSendSummary,
      }
      const res = await api.saveAgentConfig(agent.id, payload)
      if (res.success) {
        setResult({ ok: true, msg: 'Settings saved successfully!' })
        setApiKeySet(res.data.freshdeskApiKeySet)
        setApiKeyChanged(false)
        setConfig(c => ({ ...c, freshdeskApiKey: '' }))
      } else {
        setResult({ ok: false, msg: res.error || 'Failed to save settings.' })
      }
    } catch (e) {
      setResult({ ok: false, msg: e.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 size={20} className="animate-spin mr-2" /> Loading config...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Agent Info */}
      <div className="p-4 bg-gray-50 rounded-xl border">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Agent</p>
        <p className="font-bold text-[#18120E] text-lg">{agent.name}</p>
        <p className="text-xs text-gray-400 font-mono mt-0.5">{agent.id}</p>
      </div>

      {/* Freshdesk Section */}
      <div className="space-y-4 pb-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-[#18120E] flex items-center gap-2">
              <Ticket size={16} className="text-[#FF7A50]" />
              Freshdesk Support Ticket
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Auto-create tickets after calls where the caller requests support.
            </p>
          </div>
          <Toggle
            checked={config.freshdeskEnabled}
            onChange={v => setConfig(c => ({ ...c, freshdeskEnabled: v }))}
          />
        </div>

        <div className={cn("space-y-3 transition-opacity", !config.freshdeskEnabled && "opacity-40 pointer-events-none")}>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Freshdesk Domain *</label>
            <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#FF7A50]/40">
              <input
                type="text"
                value={config.freshdeskDomain}
                onChange={e => setConfig(c => ({ ...c, freshdeskDomain: e.target.value }))}
                placeholder="yourcompany"
                className="flex-1 px-3 py-2 text-sm outline-none bg-white"
              />
              <span className="px-3 py-2 bg-gray-100 text-gray-400 text-xs border-l">.freshdesk.com</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Freshdesk API Key *
              {apiKeySet && !apiKeyChanged && (
                <span className="ml-2 text-green-600 font-normal">✓ Key saved</span>
              )}
            </label>
            <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#FF7A50]/40">
              <input
                type={showKey ? "text" : "password"}
                value={config.freshdeskApiKey}
                onChange={e => { setConfig(c => ({ ...c, freshdeskApiKey: e.target.value })); setApiKeyChanged(true) }}
                placeholder={apiKeySet ? "Enter new key to replace existing" : "Enter API key"}
                className="flex-1 px-3 py-2 text-sm outline-none bg-white font-mono"
              />
              <button onClick={() => setShowKey(s => !s)} className="px-3 py-2 text-gray-400 hover:text-gray-600 border-l bg-gray-50">
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Find your API key at: <span className="font-mono">Freshdesk → Profile Settings → API Key</span>
            </p>
          </div>
        </div>
      </div>

      {/* Google Chat Section */}
      <div className="space-y-4 pb-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-[#18120E] flex items-center gap-2">
              <MessageSquare size={16} className="text-[#FF7A50]" />
              Google Chat Notifications
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Send call results to a Google Chat space via incoming webhook after every call.
            </p>
          </div>
          <Toggle
            checked={config.gchatEnabled}
            onChange={v => setConfig(c => ({ ...c, gchatEnabled: v }))}
          />
        </div>

        <div className={cn("space-y-4 transition-opacity", !config.gchatEnabled && "opacity-40 pointer-events-none")}>
          {/* Webhook URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Webhook URL *</label>
            <input
              type="url"
              value={config.gchatWebhookUrl}
              onChange={e => setConfig(c => ({ ...c, gchatWebhookUrl: e.target.value }))}
              placeholder="https://chat.googleapis.com/v1/spaces/..."
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF7A50]/40 font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              In Google Chat: open your Space → Apps & integrations → Manage webhooks → Add webhook
            </p>
          </div>

          {/* What to send */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">What to include in the message</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.gchatSendSummary}
                  onChange={e => setConfig(c => ({ ...c, gchatSendSummary: e.target.checked }))}
                  className="w-4 h-4 accent-[#FF7A50]"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Call Summary</span>
                  <p className="text-xs text-gray-400">Short AI-generated summary of the call outcome</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.gchatSendTranscript}
                  onChange={e => setConfig(c => ({ ...c, gchatSendTranscript: e.target.checked }))}
                  className="w-4 h-4 accent-[#FF7A50]"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Full Transcript</span>
                  <p className="text-xs text-gray-400">Complete word-for-word conversation (truncated at 3000 chars)</p>
                </div>
              </label>
            </div>
          </div>

          {/* Preview hint */}
          <div className="bg-[#18120E]/5 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-[#18120E]">Every notification will always include:</p>
            <p>• Caller phone number &nbsp;• Agent name &nbsp;• Call duration &nbsp;• Status &nbsp;• Time (IST)</p>
          </div>
        </div>
      </div>

      {/* Script Guide */}
      <ScriptGuide />

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-[#18120E] text-white text-sm font-semibold hover:bg-[#024a5e] disabled:opacity-60 transition flex items-center gap-2"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Settings size={14} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {result && (
          <div className={cn("flex items-center gap-1.5 text-sm", result.ok ? "text-green-600" : "text-red-500")}>
            {result.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {result.msg}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export function AgentSettings() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getAgents().then(res => {
      const list = Array.isArray(res) ? res : (res.data || res.agents || [])
      setAgents(list)
      setError(null)
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#18120E] flex items-center gap-2">
          <Bot className="text-[#FF7A50]" size={24} />
          Agent Configuration
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure per-agent integrations: Freshdesk support tickets and Google Chat notifications.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-4 py-3 bg-[#18120E] text-white text-sm font-semibold">
              Select Agent
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader2 size={18} className="animate-spin mr-2" /> Loading agents...
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-red-500">{error}</div>
            ) : agents.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No agents found.</div>
            ) : (
              <div className="divide-y">
                {agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => setSelected(agent)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center justify-between group",
                      selected?.id === agent.id && "bg-[#FF7A50]/10 border-l-2 border-[#FF7A50]"
                    )}
                  >
                    <div>
                      <p className={cn(
                        "font-medium text-sm",
                        selected?.id === agent.id ? "text-[#18120E]" : "text-gray-700"
                      )}>
                        {agent.name}
                      </p>
                      <p className="text-xs text-gray-400 font-mono truncate max-w-[180px]">{agent.id}</p>
                    </div>
                    <ChevronRight
                      size={14}
                      className={cn(
                        "text-gray-300 group-hover:text-[#FF7A50] transition",
                        selected?.id === agent.id && "text-[#FF7A50]"
                      )}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Config Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border p-6 min-h-[300px]">
            {selected ? (
              <AgentConfigPanel key={selected.id} agent={selected} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Bot size={24} className="text-gray-300" />
                </div>
                <p className="text-gray-400 font-medium">Select an agent to configure</p>
                <p className="text-gray-300 text-sm mt-1">
                  Choose an agent from the list to set up integrations
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
