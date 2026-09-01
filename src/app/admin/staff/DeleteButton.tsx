'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteStaffAction } from './actions';

export function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 cursor-pointer"
      disabled={isPending}
      onClick={() => {
        if (window.confirm('Are you sure you want to delete this staff account?')) {
          startTransition(() => {
            deleteStaffAction(id);
          });
        }
      }}
      title="Delete Staff Account"
    >
      <Trash2 className="h-3.5 w-3.5 text-red-500" />
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
