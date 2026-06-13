import { Phone, Users, BarChart3, Upload, PhoneCall, LogOut, Shield, ChevronDown, ScrollText, Wand2, Bot, Ticket, FileDown, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useState, useRef, useEffect } from "react"

export function Layout({ activeTab, onTabChange, children }) {
  const { user, logout, hasPermission } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  const adminRef = useRef(null)

  const isAdmin = user?.role === 'admin'

  const mainTabs = [
    { id: "dashboard", label: "Dashboard",     icon: BarChart3, perm: () => hasPermission('dashboard') },
    { id: "customers", label: "Customers",     icon: Users,     perm: () => hasPermission('customers', 'view') },
    { id: "calls",     label: "Calls",         icon: Phone,     perm: () => hasPermission('calls', 'view') },
    { id: "tickets",   label: "Support Tickets", icon: Ticket,  perm: () => hasPermission('calls', 'view') },
    { id: "trigger",   label: "Trigger Call",  icon: PhoneCall, perm: () => hasPermission('calls', 'trigger') },
    { id: "bulk",      label: "Bulk Call",     icon: Upload,    perm: () => hasPermission('bulk', 'view') },
  ].filter(t => t.perm())

  const adminTabs = [
    { id: "users",   label: "Users",            icon: Shield },
    { id: "logs",    label: "Logs",             icon: ScrollText },
    { id: "scripts", label: "Script Builder",   icon: Wand2 },
    { id: "agents",  label: "Agent Config",     icon: Bot },
    { id: "reports", label: "Report Templates", icon: FileDown },
  ]

  const activeAdminTab = adminTabs.find(t => t.id === activeTab)

  // Close admin dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (adminRef.current && !adminRef.current.contains(e.target)) setAdminMenuOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleTabChange = (id) => {
    setAdminMenuOpen(false)
    onTabChange(id)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#18120E] border-l-4 border-[#FF7A50] shadow-lg">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF7A50] rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 32 32" width="20" height="20" fill="currentColor" className="text-white" aria-hidden="true">
                <rect x="3" y="13" width="3" height="6" rx="1.5"/>
                <rect x="9" y="9" width="3" height="14" rx="1.5"/>
                <rect x="15" y="4" width="3" height="24" rx="1.5"/>
                <rect x="21" y="10" width="3" height="12" rx="1.5"/>
                <rect x="27" y="14" width="3" height="4" rx="1.5"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                Auris<span className="text-[#FF7A50]">AI</span> <span className="text-[#FF7A50]">Voice</span>
              </h1>
              <p className="text-xs text-gray-300">Call Management Dashboard</p>
            </div>
          </div>
          {user && (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 text-white hover:text-[#FF7A50] transition-colors"
              >
                <div className="w-8 h-8 bg-[#FF7A50] rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                </div>
                <ChevronDown size={14} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border z-50">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <button
                    onClick={() => { setUserMenuOpen(false); logout() }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <nav className="bg-[#0F0D0A] shadow-md sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-6 flex gap-1 items-stretch">
          {mainTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
                activeTab === id
                  ? "border-[#FF7A50] text-[#FF7A50]"
                  : "border-transparent text-gray-400 hover:text-[#C6C6C5]"
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}

          {/* Admin dropdown */}
          {isAdmin && (
            <div className="relative ml-auto" ref={adminRef}>
              <button
                onClick={() => setAdminMenuOpen(v => !v)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
                  activeAdminTab
                    ? "border-[#FF7A50] text-[#FF7A50]"
                    : "border-transparent text-gray-400 hover:text-[#C6C6C5]"
                )}
              >
                <Settings size={15} />
                {activeAdminTab ? activeAdminTab.label : "Admin"}
                <ChevronDown size={13} className={cn("transition-transform", adminMenuOpen && "rotate-180")} />
              </button>

              {adminMenuOpen && (
                <div className="absolute right-0 top-full mt-0 w-52 bg-[#0F0D0A] border border-gray-700 rounded-b-lg shadow-xl z-50">
                  {adminTabs.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => handleTabChange(id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left",
                        activeTab === id
                          ? "text-[#FF7A50] bg-white/5"
                          : "text-gray-400 hover:text-[#C6C6C5] hover:bg-white/5"
                      )}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-screen-xl mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  )
}
