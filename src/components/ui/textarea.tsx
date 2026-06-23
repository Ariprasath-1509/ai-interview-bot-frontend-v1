import * as React from "react"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`input-base min-h-[88px] ${className}`}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

export { Textarea }
