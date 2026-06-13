import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogClose } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, Shield, User, Bot, CheckSquare, Square } from 'lucide-react'

const DEFAULT_PERMS = {
  dashboard: true,
  customers: { view: true, manage: false },
  calls: { view: true, trigger: false },
  bulk: { view: false, manage: false },
  users: { view: false, manage: false },
  agents: [] // empty = no restriction (all agents), array of IDs = restricted
}

const emptyForm = { name: '', email: '', password: '', role: 'user', is_active: true, permissions: DEFAULT_PERMS }

const PERM_CONFIG = [
  { key: 'dashboard', label: 'Dashboard', simple: true },
  { key: 'customers', label: 'Customers', actions: ['view', 'manage'] },
  { key: 'calls', label: 'Calls', actions: ['view', 'trigger'] },
  { key: 'bulk', label: 'Bulk Call', actions: ['view', 'manage'] },
  { key: 'users', label: 'User Management', actions: ['view', 'manage'] },
]

export function Users() {
  const [users, setUsers] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [agentRestrict, setAgentRestrict] = useState(false) // toggle: restrict agents or allow all

  const load = () => api.getUsers().then(r => { setUsers(r.data || []); setLoading(false) })

  useEffect(() => {
    load()
    api.getAgents().then(r => setAgents(r.data || []))
  }, [])

  const openAdd = () => {
    setForm(emptyForm)
    setEditId(null)
    setAgentRestrict(false)
    setModal(true)
  }

  const openEdit = (u) => {
    const perms = u.permissions || DEFAULT_PERMS
    const allowedAgents = perms.agents || []
    setForm({
      name: u.name, email: u.email, password: '',
      role: u.role, is_active: u.is_active,
      permissions: { ...DEFAULT_PERMS, ...perms, agents: allowedAgents }
    })
    setAgentRestrict(allowedAgents.length > 0)
    setEditId(u.id)
    setModal(true)
  }

  const setPermission = (key, action, value) => {
    setForm(f => {
      const perms = { ...f.permissions }
      if (action) perms[key] = { ...perms[key], [action]: value }
      else perms[key] = value
      return { ...f, permissions: perms }
    })
  }

  const toggleAgent = (agentId) => {
    setForm(f => {
      const current = f.permissions.agents || []
      const updated = current.includes(agentId)
        ? current.filter(id => id !== agentId)
        : [...current, agentId]
      return { ...f, permissions: { ...f.permissions, agents: updated } }
    })
  }

  const toggleAllAgents = () => {
    const allSelected = agents.every(a => (form.permissions.agents || []).includes(a.id))
    setForm(f => ({
      ...f,
      permissions: {
        ...f.permissions,
        agents: allSelected ? [] : agents.map(a => a.id)
      }
    }))
  }

  const handleAgentRestrictToggle = (restricted) => {
    setAgentRestrict(restricted)
    if (!restricted) {
      // Clear agent restrictions — user can access all agents
      setForm(f => ({ ...f, permissions: { ...f.permissions, agents: [] } }))
    }
  }

  const save = async () => {
    if (!form.name || !form.email) return alert('Name and email required')
    if (!editId && !form.password) return alert('Password required for new user')
    const payload = { ...form }
    // If not restricting agents, store empty array (= all agents allowed)
    if (!agentRestrict) payload.permissions = { ...payload.permissions, agents: [] }
    if (editId && !form.password) delete payload.password
    const res = editId ? await api.updateUser(editId, payload) : await api.createUser(payload)
    if (res.success) { setModal(false); load() } else alert(res.error)
  }

  const del = async (id) => {
    if (!confirm('Delete this user?')) return
    const res = await api.deleteUser(id)
    if (res.success) load(); else alert(res.error)
  }

  const getAgentSummary = (u) => {
    if (u.role === 'admin') return 'All agents'
    const allowed = u.permissions?.agents
    if (!allowed || allowed.length === 0) return 'All agents'
    return `${allowed.length} agent${allowed.length !== 1 ? 's' : ''}`
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#18120E]">User Management</h2>
        <Button onClick={openAdd}><Plus size={15} className="mr-1" /> Add User</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#18120E] text-white">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Module Access</th>
                <th className="px-4 py-3 text-left">Agent Access</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {u.role === 'admin'
                        ? <Shield size={14} className="text-[#FF7A50]" />
                        : <User size={14} className="text-gray-400" />}
                      {u.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge className={u.role === 'admin' ? 'bg-[#FF7A50] text-white' : 'bg-gray-100 text-gray-700'}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {u.role === 'admin' ? 'All modules' :
                      Object.entries(u.permissions || {})
                        .filter(([k, v]) => k !== 'agents' && (v === true || (typeof v === 'object' && Object.values(v).some(Boolean))))
                        .map(([k]) => k).join(', ') || 'None'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Bot size={12} className="text-[#FF7A50]" />
                      {getAgentSummary(u)}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(u)}><Edit2 size={13} /></Button>
                    <Button size="sm" variant="destructive" onClick={() => del(u.id)}><Trash2 size={13} /></Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No users</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={modal} onClose={() => setModal(false)}>
        <DialogHeader>
          <DialogTitle>{editId ? 'Edit User' : 'Create User'}</DialogTitle>
          <DialogClose onClose={() => setModal(false)} />
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Name *</label>
                <Input className="mt-1" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email *</label>
                <Input className="mt-1" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{editId ? 'New Password' : 'Password *'}</label>
                <Input className="mt-1" type="password" placeholder={editId ? 'Leave blank to keep' : ''} value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Role</label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#18120E]"
                  value={form.role}
                  onChange={e => setForm({...form, role: e.target.value})}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="h-4 w-4 accent-[#18120E]" />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
            </div>

            {form.role === 'user' && (
              <>
                {/* Module Permissions */}
                <div>
                  <p className="text-sm font-semibold text-[#18120E] mb-3 border-b pb-2">Module Permissions</p>
                  <div className="space-y-3">
                    {PERM_CONFIG.map(({ key, label, simple, actions }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                        {simple ? (
                          <input
                            type="checkbox"
                            checked={!!form.permissions[key]}
                            onChange={e => setPermission(key, null, e.target.checked)}
                            className="h-4 w-4 accent-[#18120E]"
                          />
                        ) : (
                          <div className="flex gap-4">
                            {actions.map(action => (
                              <label key={action} className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!(form.permissions[key]?.[action])}
                                  onChange={e => setPermission(key, action, e.target.checked)}
                                  className="h-3.5 w-3.5 accent-[#18120E]"
                                />
                                {action.charAt(0).toUpperCase() + action.slice(1)}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agent Access */}
                <div>
                  <p className="text-sm font-semibold text-[#18120E] mb-3 border-b pb-2 flex items-center gap-2">
                    <Bot size={14} /> Agent Access
                  </p>

                  {/* Restrict toggle */}
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      type="button"
                      onClick={() => handleAgentRestrictToggle(false)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        !agentRestrict
                          ? 'bg-[#18120E] text-white border-[#18120E]'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-[#18120E]'
                      }`}
                    >
                      All Agents
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAgentRestrictToggle(true)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        agentRestrict
                          ? 'bg-[#18120E] text-white border-[#18120E]'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-[#18120E]'
                      }`}
                    >
                      Specific Agents
                    </button>
                  </div>

                  {agentRestrict && (
                    <div className="border rounded-lg overflow-hidden">
                      {/* Select all header */}
                      <div
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b cursor-pointer hover:bg-gray-100"
                        onClick={toggleAllAgents}
                      >
                        {agents.every(a => (form.permissions.agents || []).includes(a.id))
                          ? <CheckSquare size={15} className="text-[#18120E]" />
                          : <Square size={15} className="text-gray-400" />
                        }
                        <span className="text-xs font-medium text-gray-600">
                          Select All ({(form.permissions.agents || []).length}/{agents.length} selected)
                        </span>
                      </div>

                      {/* Agent list */}
                      <div className="max-h-40 overflow-y-auto">
                        {agents.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-4">No agents found</p>
                        )}
                        {agents.map(agent => {
                          const isSelected = (form.permissions.agents || []).includes(agent.id)
                          return (
                            <div
                              key={agent.id}
                              onClick={() => toggleAgent(agent.id)}
                              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                                isSelected ? 'bg-teal-50' : ''
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'bg-[#18120E] border-[#18120E]' : 'border-gray-300'
                              }`}>
                                {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{agent.name}</p>
                                <p className="text-xs text-gray-400 font-mono">{agent.id?.slice(0, 20)}...</p>
                              </div>
                              {agent.status && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                  agent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {agent.status}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {agentRestrict && (form.permissions.agents || []).length === 0 && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      ⚠ No agents selected — user won&apos;t see any agents
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={save} className="flex-1">{editId ? 'Update' : 'Create'}</Button>
              <Button variant="outline" onClick={() => setModal(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
