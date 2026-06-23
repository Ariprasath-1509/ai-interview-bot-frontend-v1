import Link from "next/link";
import type { ReactNode } from "react";

/** Centered empty state for tables and lists */
export function EmptyState({
  title = "Nothing here yet",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="empty-state">
      <p className="font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
      {action && (
        <Link href={action.href} className="btn-primary mt-4 inline-flex">
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** Standard page section heading */
export function PageSection({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-3">
        <h2 className="section-label">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/** Auth / standalone error page shell */
export function StandalonePage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-[#050505] sm:px-6">
      <main className="w-full max-w-md space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          )}
        </div>
        <div className="card p-6 text-left">{children}</div>
      </main>
    </div>
  );
}
