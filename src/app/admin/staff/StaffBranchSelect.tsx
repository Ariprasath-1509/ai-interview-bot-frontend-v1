"use client";

import { useBranchOptions } from "@/hooks/useBranchOptions";

/**
 * Branch select for staff create/edit forms, independent of Role — populated dynamically
 * from the BRANCH master-data category so admin-added branches are selectable immediately.
 */
export function StaffBranchSelect({
  id,
  name,
  defaultValue,
  className,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  className?: string;
}) {
  const { options } = useBranchOptions();
  return (
    <select id={id} name={name} defaultValue={defaultValue ?? "DEVELOPMENT"} className={className}>
      {options.map((b) => (
        <option key={b.code} value={b.code}>{b.label}</option>
      ))}
    </select>
  );
}
