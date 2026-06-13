import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogClose } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/StatusBadge"
import { Plus, Search, Edit2, Trash2 } from "lucide-react"

const empty = { name: '', phone_number: '', email: '', language: 'en', notes: '' }

export function Customers() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => api.getCustomers().then(r => { setCustomers(r.data || []); setLoading(false) })
  useEffect(() => { load() }, [])

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone_number.includes(search)
  )

  const openAdd = () => { setForm(empty); setEditId(null); setModal(true) }
  const openEdit = (c) => { setForm({ name: c.name, phone_number: c.phone_number, email: c.email||'', language: c.language||'en', notes: c.notes||'' }); setEditId(c.id); setModal(true) }

  const save = async () => {
    if (!form.name || !form.phone_number) return alert('Name and phone are required')
    const res = editId ? await api.updateCustomer(editId, form) : await api.createCustomer(form)
    if (res.success) { setModal(false); load() } else alert(res.error)
  }

  const del = async (id) => {
    if (!confirm('Delete this customer?')) return
    await api.deleteCustomer(id); load()
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#18120E]">Customers</h2>
        <Button onClick={openAdd}><Plus size={15} className="mr-1" /> Add Customer</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-4">
            <Search size={16} className="text-gray-400" />
            <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#18120E] text-white">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Language</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.phone_number}</td>
                  <td className="px-4 py-3 text-gray-500">{c.email || '-'}</td>
                  <td className="px-4 py-3">{c.language}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Edit2 size={13} /></Button>
                    <Button size="sm" variant="destructive" onClick={() => del(c.id)}><Trash2 size={13} /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No customers found</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={modal} onClose={() => setModal(false)}>
        <DialogHeader>
          <DialogTitle>{editId ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          <DialogClose onClose={() => setModal(false)} />
        </DialogHeader>
        <DialogContent>
          <div className="space-y-3">
            <div><label className="text-sm font-medium text-gray-700">Name *</label><Input className="mt-1" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><label className="text-sm font-medium text-gray-700">Phone *</label><Input className="mt-1" placeholder="+919876543210" value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} /></div>
            <div><label className="text-sm font-medium text-gray-700">Email</label><Input className="mt-1" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div><label className="text-sm font-medium text-gray-700">Language</label>
              <select className="mt-1 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm" value={form.language} onChange={e => setForm({...form, language: e.target.value})}>
                <option value="en">English</option><option value="hi">Hindi</option><option value="gu">Gujarati</option>
              </select>
            </div>
            <div><label className="text-sm font-medium text-gray-700">Notes</label><textarea className="mt-1 flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#18120E]" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
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
