import * as React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-full text-sm font-semibold " +
      "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 " +
      "focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0e0a1a] " +
      "hover:scale-[1.015] active:scale-[0.985] " +
      "disabled:opacity-50 disabled:pointer-events-none disabled:scale-100"

    const variants: Record<string, string> = {
      default:     "text-white shadow-sm bg-[#7B3FA0] hover:bg-[#5B2D8E]",
      destructive: "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 shadow-sm",
      outline:     "border border-zinc-200/80 bg-white/40 text-zinc-900 hover:border-purple-300 hover:bg-purple-50 dark:border-[#2e224e] dark:bg-transparent dark:text-[#ede8f5] dark:hover:border-purple-700/60 dark:hover:bg-purple-950/30",
      secondary:   "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-[#1f1839] dark:text-[#ede8f5] dark:hover:bg-[#2e224e]/70",
      ghost:       "text-zinc-700 hover:bg-purple-50 hover:text-purple-700 dark:text-[#c4b8d8] dark:hover:bg-[#1f1839]/70 dark:hover:text-[#ede8f5]",
      link:        "text-purple-600 underline-offset-4 hover:underline dark:text-purple-400",
    }

    const sizes: Record<string, string> = {
      default: "h-10 px-4 py-2",
      sm:      "h-8 px-3 text-xs",
      lg:      "h-11 px-6",
      icon:    "h-10 w-10",
    }

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
