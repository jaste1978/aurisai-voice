import { cn } from "@/lib/utils"
export function Select({ className, children, ...props }) {
  return <select className={cn("flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#18120E] disabled:opacity-50", className)} {...props}>{children}</select>
}
