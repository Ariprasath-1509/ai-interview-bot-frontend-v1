import * as React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}

const variantClasses: Record<string, string> = {
  default:     "border-transparent bg-[#7B3FA0] text-white",
  secondary:   "border-transparent bg-zinc-500 text-white dark:bg-[#2e224e] dark:text-[#c4b8d8]",
  destructive: "border-transparent bg-red-600 text-white",
  outline:     "border-zinc-300 text-zinc-700 dark:border-[#2e224e] dark:text-[#c4b8d8]",
  success:     "border-transparent bg-emerald-600 text-white",
  warning:     "border-transparent bg-amber-500 text-white",
}

function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors duration-150 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}

export { Badge }
