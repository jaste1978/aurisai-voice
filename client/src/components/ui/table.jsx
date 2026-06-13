import { cn } from "@/lib/utils"
export function Table({ className, ...props }) { return <div className="overflow-x-auto"><table className={cn("w-full text-sm", className)} {...props} /></div> }
export function TableHeader({ ...props }) { return <thead {...props} /> }
export function TableBody({ ...props }) { return <tbody {...props} /> }
export function TableRow({ className, ...props }) { return <tr className={cn("border-b hover:bg-gray-50 transition-colors", className)} {...props} /> }
export function TableHead({ className, ...props }) { return <th className={cn("h-10 px-4 text-left font-medium text-white bg-[#18120E] first:rounded-tl-md last:rounded-tr-md", className)} {...props} /> }
export function TableCell({ className, ...props }) { return <td className={cn("px-4 py-3 text-gray-700", className)} {...props} /> }
