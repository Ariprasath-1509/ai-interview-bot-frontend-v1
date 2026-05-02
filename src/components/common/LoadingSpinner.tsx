export function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <span className="spinner" role="status" aria-label="Loading" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
      </div>
    </div>
  )
}
