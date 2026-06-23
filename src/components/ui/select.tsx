import * as React from "react"

interface SelectContextType {
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined)

const Select: React.FC<{ value?: string; onValueChange?: (value: string) => void; children: React.ReactNode }> = ({
  value, onValueChange, children,
}) => {
  const [open, setOpen] = React.useState(false)
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className = "", children, ...props }, ref) => {
    const ctx = React.useContext(SelectContext)
    return (
      <button
        ref={ref}
        type="button"
        className={`input-base h-10 flex items-center justify-between ${className}`}
        onClick={() => ctx?.setOpen(!ctx.open)}
        {...props}
      >
        {children}
        <svg className="h-4 w-4 opacity-50 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectValue: React.FC<{ placeholder?: string; children?: React.ReactNode }> = ({ placeholder, children }) => {
  const ctx = React.useContext(SelectContext)
  if (children) return <span className="truncate">{children}</span>
  return <span className="truncate">{ctx?.value || placeholder}</span>
}

const SelectContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => {
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

  const hasChildren = React.Children.toArray(children).some(child => {
    if (React.isValidElement(child)) return true
    return typeof child === "string" && child.trim() !== ""
  })

  return (
    <div
      ref={ref}
      className={`absolute z-50 mt-1 min-w-[8rem] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-950 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-h-60 overflow-y-auto py-1">
        {!hasChildren ? (
          <div className="py-2 px-3 text-sm text-muted-foreground text-center">
            No data found
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

const SelectItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(
  ({ className = "", children, value, ...props }, ref) => {
    const ctx = React.useContext(SelectContext)
    const isSelected = ctx?.value === value
    const handleClick = () => {
      ctx?.onValueChange?.(value)
      ctx?.setOpen?.(false)
    }
    return (
      <div
        ref={ref}
        className={`relative flex w-full cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2 text-sm text-zinc-900 outline-none transition-colors duration-150 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800 ${isSelected ? "bg-zinc-100 dark:bg-zinc-800 font-medium" : ""} ${className}`}
        onClick={() => {
          ctx?.onValueChange?.(value)
          ctx?.setOpen(false)
        }}
        {...props}
      >
        {isSelected && (
          <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
        )}
        {children}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
