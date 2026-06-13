import { Badge } from "@/components/ui/badge"
export function StatusBadge({ status }) {
  const map = {
    completed: "success", failed: "destructive", in_progress: "warning",
    scheduled: "secondary", created: "outline", stopped: "destructive",
    active: "success", inactive: "secondary", queued: "secondary",
    initiated: "warning", answered: "warning",
  }
  return <Badge variant={map[status] || "outline"}>{status}</Badge>
}
