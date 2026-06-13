import { cn } from "@/lib/utils"
import { X } from "lucide-react"
export function Dialog({ open, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl mx-4">
        {children}
      </div>
    </div>
  )
}
export function DialogHeader({ className, ...props }) { return <div className={cn("flex flex-col space-y-1.5 p-6 pb-4 border-b", className)} {...props} /> }
export function DialogTitle({ className, ...props }) { return <h2 className={cn("text-lg font-semibold text-[#18120E]", className)} {...props} /> }
export function DialogContent({ className, ...props }) { return <div className={cn("p-6", className)} {...props} /> }
export function DialogClose({ onClose }) {
  return <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
}
