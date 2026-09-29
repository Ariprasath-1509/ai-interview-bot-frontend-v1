import * as React from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const cn = (...inputs: any[]) => twMerge(clsx(inputs))

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-lg text-sm font-semibold " +
      "transition-all duration-150 focus-visible:outline-none " +
      "focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 " +
      "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"

    const variants: Record<string, string> = {
      default:
        "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-sm",

      destructive:
        "bg-red-600 text-white hover:bg-red-700 dark:bg-rose-600 dark:hover:bg-rose-600 shadow-sm cursor-pointer",

      outline:
        "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]",

      secondary:
        "bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:opacity-90",

      ghost:
        "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]",

      link:
        "text-[var(--color-primary)] underline-offset-4 hover:underline",
    }

    const sizes: Record<string, string> = {
      default: "h-10 px-4",
      sm: "h-8 px-3 text-xs",
      lg: "h-11 px-6",
      icon: "h-10 w-10",
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button }
