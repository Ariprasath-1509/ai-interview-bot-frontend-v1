import * as React from "react"

interface SelectContextType {
  value?: string
  onValueChange?: (value: string) => void
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined)

const Select: React.FC<{ value?: string; onValueChange?: (value: string) => void; children: React.ReactNode }> = ({
  value, onValueChange, children,
}) => (
  <SelectContext.Provider value={{ value, onValueChange }}>
    {children}
  </SelectContext.Provider>
)

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className = "", children, ...props }, ref) => (
    <button
      ref={ref}
      className={`input-base h-10 flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </button>
  )
)
SelectTrigger.displayName = "SelectTrigger"

const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const ctx = React.useContext(SelectContext)
  return <span>{ctx?.value || placeholder}</span>
}

const SelectContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`relative z-50 min-w-[8rem] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-950 ${className}`}>
    {children}
  </div>
)

const SelectItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(
  ({ className = "", children, value, ...props }, ref) => {
    const ctx = React.useContext(SelectContext)
    return (
      <div
        ref={ref}
        className={`relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm text-zinc-900 outline-none transition-colors duration-150 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800 ${className}`}
        onClick={() => ctx?.onValueChange?.(value)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
