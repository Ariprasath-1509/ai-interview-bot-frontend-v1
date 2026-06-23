import * as React from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={`input-base h-10 ${className}`}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
