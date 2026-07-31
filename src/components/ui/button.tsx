import * as React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-lg text-sm font-semibold " +
      "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 " +
      "focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:scale-[0.985] " +
      "disabled:opacity-50 disabled:pointer-events-none disabled:scale-100"

    const variants: Record<string, string> = {
      default:     "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-sm",
      destructive: "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 shadow-sm",
      outline:     "border border-zinc-200/80 bg-white/40 text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-transparent dark:text-zinc-100 dark:hover:bg-zinc-900/65",
      secondary:   "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-850",
      ghost:       "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900/65",
      link:        "text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400",
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
