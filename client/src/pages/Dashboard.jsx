import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/StatusBadge"
import { Phone, Users, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react"

export function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentCalls, setRecentCalls] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getCallStats(), api.getCalls()]).then(([s, c]) => {
      setStats(s.data)
      setRecentCalls((c.data || []).slice(0, 5))
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="text-center py-20 text-gray-400">Loading dashboard...</div>

  const cards = [
    { label: "Total Calls", value: stats?.total || 0, icon: Phone, color: "text-blue-500" },
    { label: "Completed", value: stats?.completed || 0, icon: CheckCircle, color: "text-green-500" },
    { label: "Failed", value: stats?.failed || 0, icon: XCircle, color: "text-red-500" },
    { label: "In Progress", value: stats?.in_progress || 0, icon: Clock, color: "text-yellow-500" },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#18120E]">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-t-4 border-t-[#FF7A50]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-3xl font-bold text-[#18120E]">{value}</p>
                </div>
                <Icon className={color} size={32} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#18120E]">Recent Calls</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#18120E] text-white">
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentCalls.map(call => (
                <tr key={call.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{call.customer_name || 'Unknown'}</td>
                  <td className="px-4 py-3">{call.phone_number}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{call.agent_name || call.agent_id?.slice(0,8)}</td>
                  <td className="px-4 py-3"><StatusBadge status={call.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(call.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {recentCalls.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No calls yet</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
