import Link from "next/link";
import type { ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export { EmptyState } from "./EmptyState";
export { PageHeader } from "./PageHeader";

const cn = (...inputs: any[]) => twMerge(clsx(inputs));



/** Standard page section heading */
export function PageSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{description}</p>
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 py-12 text-[var(--text-primary)] sm:px-6">
      <main className="w-full max-w-md space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>
          )}
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left shadow-sm">
          {children}
        </div>
      </main>
    </div>
  );
}

