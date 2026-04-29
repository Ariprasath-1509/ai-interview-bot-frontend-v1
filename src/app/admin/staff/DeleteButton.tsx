"use client";

import { useTransition } from "react";
import { deleteStaffAction } from "./actions";

export function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button 
      className="text-red-600 hover:underline text-xs font-medium dark:text-red-400 disabled:opacity-50"
      disabled={isPending}
      onClick={() => {
        if (window.confirm("Are you sure you want to delete this staff account?")) {
          startTransition(() => {
            deleteStaffAction(id);
          });
        }
      }}
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
