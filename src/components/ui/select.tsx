import * as React from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const cn = (...inputs: any[]) => twMerge(clsx(inputs))

interface SelectContextType {
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined)

const Select: React.FC<{
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}> = ({ value, onValueChange, children }) => {
  const [open, setOpen] = React.useState(false)

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className={cn("relative", open && "z-50")}>{children}</div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(SelectContext)

  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="listbox"
      aria-expanded={ctx?.open}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2",
        "hover:bg-[var(--surface-subtle)]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-subtle)]",
        className
      )}
      onClick={() => ctx?.setOpen(!ctx.open)}
      {...props}
    >
      <span className="flex-1 text-left truncate">{children}</span>

      <svg
        className={cn(
          "ml-2 h-4 w-4 shrink-0 opacity-60 transition-transform",
          ctx?.open && "rotate-180"
        )}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue: React.FC<{
  placeholder?: string
  children?: React.ReactNode
}> = ({ placeholder, children }) => {
  const ctx = React.useContext(SelectContext)

  if (children) return <span className="truncate">{children}</span>

  return (
    <span className="truncate text-[var(--text-secondary)]">
      {ctx?.value || placeholder}
    </span>
  )
}

const SelectContent: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => {
  const ctx = React.useContext(SelectContext)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!ctx?.open) return

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) {
        ctx?.setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [ctx])

  if (!ctx?.open) return null

  return (
    <div
      ref={ref}
      role="listbox"
      className={cn(
        "absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-md",
        "animate-dropdown text-[var(--text-primary)]",
        className
      )}
    >
      <div className="max-h-44 overflow-y-auto py-1">
        {React.Children.count(children) === 0 ? (
          <div className="py-2 px-3 text-sm text-[var(--text-secondary)] text-center">
            No data found
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, children, value, ...props }, ref) => {
  const ctx = React.useContext(SelectContext)
  const isSelected = ctx?.value === value

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2 text-sm text-[var(--text-primary)] transition-all duration-150",
        "hover:bg-[var(--surface-subtle)] focus-visible:bg-[var(--surface-subtle)] focus-visible:outline-none",
        isSelected && "bg-[var(--surface-subtle)] font-medium text-[var(--color-primary)]",
        className
      )}
      onClick={() => {
        ctx?.onValueChange?.(value)
        ctx?.setOpen(false)
      }}
      {...props}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-4 w-4 items-center justify-center text-[var(--color-primary)]">
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
      {children}
    </div>
  )
})
SelectItem.displayName = "SelectItem"

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }