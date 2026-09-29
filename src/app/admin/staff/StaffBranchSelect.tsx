'use client';

import { useBranchOptions } from '@/hooks/useBranchOptions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const currentValue = value ?? defaultValue ?? 'DEVELOPMENT';

  return (
    <>
      <input type="hidden" id={id} name={name} value={currentValue} />
      <Select
        value={currentValue}
        onValueChange={(val) => {
          if (onChange) onChange(val);
        }}
      >
        <SelectTrigger
          className={
            className ||
            'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] px-3 py-2.5 text-xs font-bold focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 shadow-xs cursor-pointer h-10'
          }
        >
          <SelectValue placeholder="Select Branch" />
        </SelectTrigger>
        <SelectContent className="z-[100] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-2xl rounded-xl p-1 max-h-60 overflow-y-auto">
          {options.map((b) => (
            <SelectItem
              key={b.code}
              value={b.code}
              className="text-xs font-bold hover:bg-purple-500/10 focus:bg-purple-500/10 text-[var(--text-primary)] py-2 cursor-pointer rounded-lg"
            >
              {b.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
