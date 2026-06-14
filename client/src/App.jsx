import { useState } from "react"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { Layout } from "./components/Layout"
import { Login } from "./pages/Login"
import { Dashboard } from "./pages/Dashboard"
import { Customers } from "./pages/Customers"
import { Calls } from "./pages/Calls"
import { SupportTickets } from "./pages/SupportTickets"
import { TriggerCall } from "./pages/TriggerCall"
import { BulkCall } from "./pages/BulkCall"
import { Users } from "./pages/Users"
import { Logs } from "./pages/Logs"
import { ScriptBuilder } from "./pages/ScriptBuilder"
import { AgentSettings } from "./pages/AgentSettings"
import { ReportTemplates } from "./pages/ReportTemplates"
import { Enquiries } from "./pages/Enquiries"

function AppContent() {
  const { user, loading, hasPermission } = useAuth()
  const [tab, setTab] = useState("dashboard")

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0D0A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FF7A50] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Login />

  const pages = {
    dashboard: <Dashboard />,
    customers: <Customers />,
    calls: <Calls />,
    tickets: <SupportTickets />,
    trigger: <TriggerCall />,
    bulk: <BulkCall />,
    users: <Users />,
    logs: <Logs />,
    scripts: <ScriptBuilder />,
    agents: <AgentSettings />,
    reports: <ReportTemplates />,
    enquiries: <Enquiries />,
  }

  return (
    <Layout activeTab={tab} onTabChange={setTab}>
      {pages[tab] || <div className="text-center py-20 text-gray-400">Page not found</div>}
    </Layout>
  )
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>
}
