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
  value,
  onChange,
  className,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
  className?: string;
}) {
  const { options } = useBranchOptions();
  return (
    <select
      id={id}
      name={name}
      defaultValue={value !== undefined ? undefined : (defaultValue ?? "DEVELOPMENT")}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className={className}
    >
      {options.map((b) => (
        <option key={b.code} value={b.code}>{b.label}</option>
      ))}
    </select>
  );
}
