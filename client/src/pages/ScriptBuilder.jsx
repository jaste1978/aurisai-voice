import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Wand2, Save, Trash2, Plus, ChevronDown, ChevronUp, FileText, Copy, Check, AlertCircle, Loader2 } from "lucide-react"

const DEFAULT_SECTIONS = ['Identity & Demeanour', 'Interview Starter', 'Main Questions', 'Objection Handling', 'Soft Conversion / CTA', 'FAQ Handling', 'Guardrails & Fallbacks', 'Closing & Data Tags']

function Badge({ children, color = "gray" }) {
  const colors = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    gold: "bg-[#FF7A50]/10 text-[#FF7A50]",
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[color]}`}>{children}</span>
}

function ScriptCard({ script, onView, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#18120E] truncate">{script.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {script.agent_name && <span className="mr-2">Agent: <strong>{script.agent_name}</strong></span>}
            {script.company && <span>Company: <strong>{script.company}</strong></span>}
          </p>
          {script.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{script.description}</p>}
          <p className="text-xs text-gray-400 mt-2">{new Date(script.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onView(script)}
            className="p-2 text-[#18120E] hover:bg-[#18120E]/10 rounded-lg transition-colors"
            title="View / Edit"
          >
            <FileText size={16} />
          </button>
          <button
            onClick={() => onDelete(script.id)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function ScriptViewer({ script, onClose, onSave }) {
  const [content, setContent] = useState(script?.content || "")
  const [name, setName] = useState(script?.name || "")
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (script?.id) {
        await onSave(script.id, { name, content })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <input
            className="text-lg font-bold text-[#18120E] bg-transparent border-b-2 border-transparent focus:border-[#FF7A50] outline-none flex-1 mr-4"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={copy} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
            {script?.id && (
              <button onClick={save} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#18120E] text-white hover:bg-[#18120E]/90 rounded-lg transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save
              </button>
            )}
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">✕ Close</button>
          </div>
        </div>
        <textarea
          className="flex-1 p-5 text-sm font-mono text-gray-800 resize-none outline-none overflow-auto leading-relaxed"
          value={content}
          onChange={e => setContent(e.target.value)}
        />
      </div>
    </div>
  )
}

export function ScriptBuilder() {
  const [scripts, setScripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState("")
  const [error, setError] = useState("")
  const [viewScript, setViewScript] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saveName, setSaveName] = useState("")
  const [saveDesc, setSaveDesc] = useState("")
  const [formOpen, setFormOpen] = useState(true)

  const [form, setForm] = useState({
    provider: "openai",
    agentName: "Esha",
    agentGender: "Female",
    company: "Auris AI",
    purpose: "",
    context: "",
    tone: "Polite, friendly, professional, non-salesy",
    language: "English (switch to Hindi/Hinglish only on user request)",
    callDuration: "3-5 minutes",
    sections: [...DEFAULT_SECTIONS],
    faqTopics: "",
    guardrails: "No politics, health, legal, or financial advice. Keep responses under 60 words.",
    extraInstructions: "",
  })

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  useEffect(() => {
    api.getScripts().then(r => { setScripts(r.data || []); setLoading(false) })
  }, [])

  const toggleSection = (sec) => {
    setForm(f => ({
      ...f,
      sections: f.sections.includes(sec) ? f.sections.filter(s => s !== sec) : [...f.sections, sec]
    }))
  }

  const generate = async () => {
    if (!form.purpose.trim() || !form.context.trim()) {
      setError("Please fill in the Call Purpose and Context fields.")
      return
    }
    setError("")
    setGenerating(true)
    setGeneratedContent("")
    try {
      const res = await api.generateScript({
        ...form,
        faqTopics: form.faqTopics ? form.faqTopics.split(',').map(s => s.trim()) : []
      })
      if (res.success) {
        setGeneratedContent(res.data.content)
        setSaveName(`${form.company} – ${form.agentName} Script`)
        setSaveDesc(form.purpose)
        setFormOpen(false)
      } else {
        setError(res.error || "Generation failed")
      }
    } catch (e) {
      setError("Network error. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  const saveGenerated = async () => {
    if (!saveName.trim()) return
    const res = await api.saveScript({
      name: saveName,
      description: saveDesc,
      agentName: form.agentName,
      agentGender: form.agentGender,
      company: form.company,
      purpose: form.purpose,
      content: generatedContent,
    })
    if (res.success) {
      setScripts(s => [res.data, ...s])
      setGeneratedContent("")
      setSaveName("")
      setSaveDesc("")
      setFormOpen(true)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Delete this script?")) return
    await api.deleteScript(id)
    setScripts(s => s.filter(x => x.id !== id))
  }

  const handleSaveEdit = async (id, data) => {
    const res = await api.updateScript(id, data)
    if (res.success) setScripts(s => s.map(x => x.id === id ? res.data : x))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#18120E]">Script Builder</h2>
          <p className="text-sm text-gray-500 mt-1">Generate call scripts for your voice agents using AI</p>
        </div>
        <Badge color="gold">{scripts.length} saved scripts</Badge>
      </div>

      {/* Generator Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-6 py-4 bg-[#18120E] text-white hover:bg-[#18120E]/90 transition-colors"
          onClick={() => setFormOpen(o => !o)}
        >
          <div className="flex items-center gap-2 font-semibold">
            <Wand2 size={18} className="text-[#FF7A50]" />
            Generate New Script with AI
          </div>
          {formOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {formOpen && (
          <div className="p-6 space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* LLM Provider */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">AI Provider</label>
              <div className="flex gap-3">
                {[
                  { id: "openai",  label: "OpenAI GPT-4o",      logo: "🟢" },
                  { id: "gemini",  label: "Google Gemini 1.5 Pro", logo: "🔵" },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setField('provider', p.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.provider === p.id
                        ? 'border-[#FF7A50] bg-[#FF7A50]/5 text-[#18120E]'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <span>{p.logo}</span> {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Agent Info Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Agent Name</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A50]"
                  value={form.agentName}
                  onChange={e => setField('agentName', e.target.value)}
                  placeholder="e.g. Esha"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Agent Gender</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A50]"
                  value={form.agentGender}
                  onChange={e => setField('agentGender', e.target.value)}
                >
                  <option>Female</option>
                  <option>Male</option>
                  <option>Neutral</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Company</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A50]"
                  value={form.company}
                  onChange={e => setField('company', e.target.value)}
                  placeholder="e.g. Auris AI"
                />
              </div>
            </div>

            {/* Purpose & Context */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Call Purpose <span className="text-red-400">*</span>
              </label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A50]"
                value={form.purpose}
                onChange={e => setField('purpose', e.target.value)}
                placeholder="e.g. Collect post-purchase feedback from Digital Gold users"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                Context / Background <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A50] resize-none"
                value={form.context}
                onChange={e => setField('context', e.target.value)}
                placeholder="Describe the product, user type, and what the agent should know. e.g. Auris AI is a voice + video AI agent platform. The prospect requested a demo for HR interview automation..."
              />
            </div>

            {/* Tone, Language, Duration Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tone</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A50]"
                  value={form.tone}
                  onChange={e => setField('tone', e.target.value)}
                  placeholder="e.g. Friendly, professional"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Default Language</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A50]"
                  value={form.language}
                  onChange={e => setField('language', e.target.value)}
                >
                  <option>English (switch to Hindi/Hinglish only on user request)</option>
                  <option>Hindi/Hinglish (switch to English on request)</option>
                  <option>English only</option>
                  <option>Hindi only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Call Duration</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A50]"
                  value={form.callDuration}
                  onChange={e => setField('callDuration', e.target.value)}
                >
                  <option>1-2 minutes</option>
                  <option>3-5 minutes</option>
                  <option>5-7 minutes</option>
                  <option>7-10 minutes</option>
                </select>
              </div>
            </div>

            {/* Sections */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Script Sections to Include</label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_SECTIONS.map(sec => (
                  <button
                    key={sec}
                    onClick={() => toggleSection(sec)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.sections.includes(sec)
                        ? 'bg-[#18120E] text-white border-[#18120E]'
                        : 'bg-white text-gray-500 border-gray-300 hover:border-[#18120E]'
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQ & Guardrails */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  FAQ Topics <span className="text-gray-400 normal-case font-normal">(comma-separated)</span>
                </label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A50]"
                  value={form.faqTopics}
                  onChange={e => setField('faqTopics', e.target.value)}
                  placeholder="e.g. gold purity, SIP setup, delivery, pricing"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Guardrails</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A50]"
                  value={form.guardrails}
                  onChange={e => setField('guardrails', e.target.value)}
                  placeholder="e.g. No politics, health, or financial advice"
                />
              </div>
            </div>

            {/* Extra Instructions */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Extra Instructions</label>
              <textarea
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A50] resize-none"
                value={form.extraInstructions}
                onChange={e => setField('extraInstructions', e.target.value)}
                placeholder="Any special requirements, branching logic, or unique instructions..."
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={generate}
                disabled={generating}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#FF7A50] text-white rounded-lg font-semibold hover:bg-[#B8852A] transition-colors disabled:opacity-50"
              >
                {generating
                  ? <><Loader2 size={16} className="animate-spin" /> Generating Script…</>
                  : <><Wand2 size={16} /> Generate Script</>
                }
              </button>
            </div>
          </div>
        )}

        {/* Generated Output */}
        {generatedContent && (
          <div className="border-t border-gray-200 p-6 space-y-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#18120E] flex items-center gap-2">
                <Check size={16} className="text-green-500" /> Script Generated Successfully
              </h3>
            </div>

            <textarea
              rows={16}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A50] resize-y"
              value={generatedContent}
              onChange={e => setGeneratedContent(e.target.value)}
            />

            <div className="flex items-center gap-3 flex-wrap">
              <input
                className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A50]"
                placeholder="Script name..."
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
              />
              <input
                className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A50]"
                placeholder="Description (optional)..."
                value={saveDesc}
                onChange={e => setSaveDesc(e.target.value)}
              />
              <button
                onClick={saveGenerated}
                disabled={!saveName.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-[#18120E] text-white rounded-lg font-medium hover:bg-[#18120E]/90 transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                <Save size={15} /> Save Script
              </button>
              <button
                onClick={() => setGeneratedContent("")}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Saved Scripts */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Saved Scripts</h3>
        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Loading scripts…</div>
        ) : scripts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
            <FileText size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm">No scripts saved yet. Generate one above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scripts.map(s => (
              <ScriptCard key={s.id} script={s} onView={setViewScript} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {viewScript && (
        <ScriptViewer
          script={viewScript}
          onClose={() => setViewScript(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
}
