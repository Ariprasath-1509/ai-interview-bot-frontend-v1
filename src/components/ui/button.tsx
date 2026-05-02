import * as React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-lg text-sm font-medium " +
      "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 " +
      "focus-visible:ring-blue-500 focus-visible:ring-offset-2 " +
      "disabled:opacity-50 disabled:pointer-events-none"

    const variants: Record<string, string> = {
      default:     "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
      destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
      outline:     "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-100 dark:hover:bg-zinc-800",
      secondary:   "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
      ghost:       "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
      link:        "text-blue-600 underline-offset-4 hover:underline dark:text-blue-400",
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
