import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RefreshCw, ExternalLink, AlertCircle, CheckCircle, Clock, Ticket, Phone } from "lucide-react"

export function SupportTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [agentFilter, setAgentFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [allAgents, setAllAgents] = useState([])

  const loadTickets = async () => {
    setLoading(true)
    const params = {
      page,
      limit,
      ...(agentFilter && { agentId: agentFilter }),
      ...(statusFilter && { status: statusFilter })
    }
    const res = await api.getSupportTickets(params)
    if (res.success) {
      setTickets(res.data || [])
      setTotal(res.pagination?.totalRecords || 0)

      // Extract unique agents for filter
      const agents = [...new Set(res.data.map(t => ({ id: t.agent_id, name: t.agent_name })))]
      setAllAgents(agents)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadTickets()
  }, [page, limit, agentFilter, statusFilter])

  const getStatusColor = (status) => {
    const colors = {
      'open': 'bg-blue-100 text-blue-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'resolved': 'bg-green-100 text-green-800',
      'closed': 'bg-gray-100 text-gray-800',
      'error': 'bg-red-100 text-red-800'
    }
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status) => {
    if (status === 'error') return <AlertCircle size={14} className="inline mr-1" />
    if (status === 'open' || status === 'pending') return <Clock size={14} className="inline mr-1" />
    if (status === 'resolved' || status === 'closed') return <CheckCircle size={14} className="inline mr-1" />
    return null
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const totalPages = Math.ceil(total / limit)

  if (loading && tickets.length === 0) {
    return <div className="text-center py-20 text-gray-400">Loading support tickets...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#18120E]">Support Tickets</h2>
        <Button
          onClick={loadTickets}
          disabled={loading}
          className="bg-[#18120E] hover:bg-[#024a5e] text-white"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin mr-1' : 'mr-1'} />
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Agent</label>
              <select
                value={agentFilter}
                onChange={(e) => { setAgentFilter(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#18120E]"
              >
                <option value="">All Agents</option>
                {allAgents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.id.substring(0, 8)}...)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#18120E]"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Per Page</label>
                <select
                  value={limit}
                  onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1) }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#18120E]"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              {(agentFilter || statusFilter) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setAgentFilter(""); setStatusFilter(""); setPage(1) }}
                  className="text-gray-600"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Tickets</p>
                  <p className="text-2xl font-bold text-[#18120E]">{total}</p>
                </div>
                <Ticket size={24} className="text-[#FF7A50]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Open Tickets</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {tickets.filter(t => t.ticket.status === 'open').length}
                  </p>
                </div>
                <Clock size={24} className="text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {tickets.filter(t => t.ticket.status === 'resolved' || t.ticket.status === 'closed').length}
                  </p>
                </div>
                <CheckCircle size={24} className="text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Avg Call Duration</p>
                  <p className="text-2xl font-bold text-[#FF7A50]">
                    {Math.round(tickets.reduce((sum, t) => sum + (t.duration || 0), 0) / Math.max(tickets.length, 1))}s
                  </p>
                </div>
                <Phone size={24} className="text-[#FF7A50]" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tickets Table */}
      {tickets.length === 0 ? (
        <Card>
          <CardContent className="pt-12">
            <div className="text-center py-8">
              <Ticket size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No support tickets found</p>
              {agentFilter || statusFilter ? (
                <p className="text-sm text-gray-400 mt-2">Try adjusting your filters</p>
              ) : (
                <p className="text-sm text-gray-400 mt-2">Once customers provide their email, tickets will appear here</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Ticket ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date & Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-[#18120E]">
                      #{ticket.ticket.ticket_id || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {ticket.call_id.substring(0, 8)}...
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-800">
                      {ticket.agent_name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      {ticket.agent_id.substring(0, 12)}...
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-800">
                      {ticket.customer_name || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {ticket.customer_email || ticket.customer_phone || 'N/A'}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-800">
                      {formatDate(ticket.call_created_at)}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-800">
                      {formatDuration(ticket.duration)}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.ticket.status)}`}>
                      {getStatusIcon(ticket.ticket.status)}
                      {ticket.ticket.status ? ticket.ticket.status.charAt(0).toUpperCase() + ticket.ticket.status.slice(1) : 'Unknown'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {ticket.ticket.ticket_url ? (
                      <a
                        href={ticket.ticket.ticket_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#18120E] hover:text-[#024a5e] font-medium text-sm"
                      >
                        View in Freshdesk <ExternalLink size={14} />
                      </a>
                    ) : ticket.ticket.error ? (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {ticket.ticket.error.substring(0, 30)}...
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No ticket</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">
            Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
            {' '} ({total} total tickets)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(Math.min(totalPages, page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
