import { cn } from "@/lib/utils"
export function Button({ className, variant = "default", size = "default", ...props }) {
  const variants = {
    default: "bg-[#18120E] text-white hover:bg-[#0F0D0A]",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700",
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    ghost: "hover:bg-gray-100 text-gray-700",
    gold: "bg-[#FF7A50] text-white hover:bg-[#b8852a]",
    success: "bg-green-600 text-white hover:bg-green-700",
  }
  const sizes = {
    default: "h-9 px-4 py-2 text-sm",
    sm: "h-7 px-3 text-xs",
    lg: "h-11 px-8 text-base",
    icon: "h-9 w-9",
  }
  return <button className={cn("inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none", variants[variant], sizes[size], className)} {...props} />
}
