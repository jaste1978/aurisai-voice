import { cn } from "@/lib/utils"
export function Textarea({ className, ...props }) {
  return <textarea className={cn("flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#18120E] disabled:opacity-50", className)} {...props} />
}
