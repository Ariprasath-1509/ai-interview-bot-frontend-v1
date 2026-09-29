import * as React from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const cn = (...inputs: any[]) => twMerge(clsx(inputs))

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] transition-all duration-150",
        "focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:border-[#6D28D9]",
        "hover:bg-[var(--surface-subtle)]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-subtle)]",
        className
      )}
      {...props}
    />
  )
)

Input.displayName = "Input"

export { Input }