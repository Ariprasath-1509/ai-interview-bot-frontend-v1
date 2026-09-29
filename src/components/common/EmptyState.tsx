"use client";

import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: any[]) => twMerge(clsx(inputs));

export interface EmptyStateProps {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return null;

    if (React.isValidElement(icon)) {
      return <div className="mb-3 text-[var(--text-secondary)]">{icon}</div>;
    }

    const IconComponent = icon as React.ComponentType<{ className?: string }>;
    return (
      <div className="mb-3 text-[var(--text-secondary)]">
        <IconComponent className="h-10 w-10 stroke-[1.5]" />
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center",
        className
      )}
    >
      {renderIcon()}

      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
        {title}
      </h3>

      {description && (
        <p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">
          {description}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

