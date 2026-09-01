"use client";

import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: any[]) => twMerge(clsx(inputs));

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      {/* Left Section */}
      <div className="flex flex-col gap-1">
        {breadcrumb && <div>{breadcrumb}</div>}

        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          {title}
        </h1>

        {subtitle && (
          <p className="text-sm text-[var(--text-secondary)]">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right Section */}
      {children && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}