import * as React from "react"

interface SelectContextType {
  value?: string
  onValueChange?: (value: string) => void
  open?: boolean
  setOpen?: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined)

const Select: React.FC<{ value?: string; onValueChange?: (value: string) => void; children: React.ReactNode }> = ({
  value, onValueChange, children,
}) => {
  const [open, setOpen] = React.useState(false)
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      {children}
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
        onClick={() => ctx?.setOpen?.(!ctx.open)}
        {...props}
      >
        {children}
        <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const ctx = React.useContext(SelectContext)
  return <span>{ctx?.value || placeholder}</span>
}

const SelectContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => {
  const ctx = React.useContext(SelectContext)

  if (!ctx?.open) return null

  // Check if there are any valid children (non-empty strings, etc.)
  const hasChildren = React.Children.toArray(children).some(child => {
    if (React.isValidElement(child)) {
      return true
    }
    return typeof child === "string" && child.trim() !== ""
  })

  return (
    <div
      className={`absolute z-50 mt-1 min-w-[8rem] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-950 ${className}`}
      onClick={(e) => {
        e.stopPropagation()
      }}
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
    const handleClick = () => {
      ctx?.onValueChange?.(value)
      ctx?.setOpen?.(false)
    }
    return (
      <div
        ref={ref}
        className={`relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm text-zinc-900 outline-none transition-colors duration-150 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800 ${className}`}
        onClick={handleClick}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }